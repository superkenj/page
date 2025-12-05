import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

function Countdown({ targetUtcIso, serverTimeUtcIso, compact = false }) {
  const [now, setNow] = useState(Date.now());

  // compute delta between client and server (defensive)
  const serverMs = serverTimeUtcIso ? new Date(serverTimeUtcIso).getTime() : Date.now();
  const clientMs = Date.now();
  const delta = Number.isFinite(serverMs) ? clientMs - serverMs : 0; // if server time invalid, assume 0

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // defensive: if target is missing or invalid, show "00:00:00"
  const targetMs = targetUtcIso ? new Date(targetUtcIso).getTime() : NaN;
  if (!Number.isFinite(targetMs)) return <span>00:00:00</span>;

  const canonicalNow = now - delta;
  const msLeft = targetMs - canonicalNow;
  if (msLeft <= 0) return <span>00:00:00</span>;

  const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((msLeft % (1000 * 60)) / 1000);

  if (compact) {
    if (days > 0) return <span>{days}d {hours}h</span>;
    return <span>{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>;
  }

  return <span>{days}d {hours}h {minutes}m {seconds}s</span>;
}

export default function StudentDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [topics, setTopics] = useState([]);
  const [path, setPath] = useState({
    mastered: [],
    recommended: [],
    inProgress: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);

  // new: keep student's topic_progress so we can detect extraAttempts
  const [topicProgress, setTopicProgress] = useState({}); // { topicId: { attempts, extraAttempts, ... } }

  // CHANGED: overrides + server time
  const [overrides, setOverrides] = useState({}); // { topicId: { temp_open_until } }
  const [serverTimeUtc, setServerTimeUtc] = useState(null);

  // small ticker so component re-renders every second (drives live countdown + status refresh)
  const [tick, setTick] = useState(0);

  // offset to convert client Date.now() -> server-time (ms). computed in loadAll after fetching server_time_utc
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Normalize helper: accept array of ids or objects {id,...}
  function normalizeToIds(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => (x && typeof x === "object" ? x.id : x)).filter(Boolean);
  }

  async function loadAll() {
    try {
      setLoading(true);

      const [tRes, pRes, sRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/topics/list`),
        fetch(`${API_BASE}/students/${id}/path`),
        fetch(`${API_BASE}/students/${id}`),
        fetch(`${API_BASE}/students/${id}/overrides`) // CHANGED: fetch active overrides
      ]);

      const tJson = await tRes.json();
      const pJson = await pRes.json();
      const sJson = await sRes.json();
      const oJson = await oRes.json().catch(() => ({ server_time_utc: new Date().toISOString(), overrides: [] }));

      const allTopics = Array.isArray(tJson) ? tJson : tJson.topics || [];
      setTopics(allTopics);

      // store topic_progress for extraAttempts detection
      const tp = sJson.topic_progress && typeof sJson.topic_progress === "object" ? sJson.topic_progress : {};
      setTopicProgress(tp);

      // store server time (ISO) and compute offset server - client so we can compute canonical server "now"
      const serverIso = oJson.server_time_utc || new Date().toISOString();
      setServerTimeUtc(serverIso);

      try {
        const serverMs = new Date(serverIso).getTime();
        // offset = serverMs - clientNow
        setServerOffsetMs(Number.isFinite(serverMs) ? serverMs - Date.now() : 0);
      } catch (e) {
        setServerOffsetMs(0);
      }

      // build overrides map keyed by topicId (accepting different field names)
      const ovMap = {};
      (oJson.overrides || []).forEach((r) => {
        if (!r) return;
        // tolerate different field names coming from firestore/legacy
        const tid = r.topicId || r.topic_id || r.topic || r.topicId?.toString();
        const tempUntil = r.temp_open_until || r.tempOpenUntil || r.temp_open || r.temp || null;

        if (tid) {
          ovMap[tid] = {
            // preserve raw doc but normalize key names we use in UI
            ...r,
            topicId: tid,
            temp_open_until: tempUntil ? String(tempUntil) : null,
          };
        }
      });
      setOverrides(ovMap);

      // Normalize path fields to id arrays
      const p = {
        mastered: normalizeToIds(pJson.mastered),
        recommended: normalizeToIds(pJson.recommended),
        inProgress: normalizeToIds(pJson.inProgress),
        upcoming: normalizeToIds(pJson.upcoming),
      };

      // Derive "inProgress" from seen content (keep ids)
      const seenSet = new Set(sJson.content_seen || []);
      const notMasteredTopics = allTopics.filter((t) => !p.mastered.includes(t.id));

      // fetch contents for not-mastered topics in parallel
      const fetches = notMasteredTopics.map((t) =>
        fetch(`${API_BASE}/content/${t.id}`)
          .then((r) => r.json())
          .then((list) => ({ topicId: t.id, list }))
          .catch((err) => ({ topicId: t.id, list: [] }))
      );

      const results = await Promise.all(fetches);

      const derivedInProgressIds = new Set(p.inProgress); // start with existing ones
      for (const res of results) {
        if (res.list.some((c) => seenSet.has(c.id))) derivedInProgressIds.add(res.topicId);
      }

      p.inProgress = Array.from(derivedInProgressIds);
      setPath(p);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(); // initial load

    const handleContentSeen = (e) => {
      // If the event contains a studentId and it's not this dashboard's student, ignore it
      try {
        const sid = e?.detail?.studentId;
        if (sid && sid !== id && sid !== "all") return;
      } catch (err) {
        // ignore malformed event, continue to reload
      }
      console.log("🔄 Detected content/path/data update — refreshing dashboard...");
      loadAll();
    };

    window.addEventListener("contentSeenUpdated", handleContentSeen);
    window.addEventListener("studentPathUpdated", handleContentSeen);
    window.addEventListener("studentDataUpdated", handleContentSeen);
    window.addEventListener("studentDataUpdatedAll", handleContentSeen); // optional generic event

    return () => {
      window.removeEventListener("contentSeenUpdated", handleContentSeen);
      window.removeEventListener("studentPathUpdated", handleContentSeen);
      window.removeEventListener("studentDataUpdated", handleContentSeen);
    };
  }, [id]);

  // use sets for fast membership checks
  const masteredSet = new Set(path.mastered || []);
  const recommendedSet = new Set(path.recommended || []);
  const inProgressSet = new Set(path.inProgress || []);

  // compute extraAttempt set from topicProgress
  const extraAttemptSet = new Set(
    Object.entries(topicProgress || {})
      .filter(([tid, tdata]) => Number(tdata?.extraAttempts || 0) > 0)
      .map(([tid]) => tid)
  );

  // build a lookup so we can inspect topic metadata (prerequisites)
  const topicsMap = Object.fromEntries((topics || []).map((t) => [t.id, t]));

  // CHANGED: helper to check if a topic is currently temporarily open for this student
  function isTempOpen(topicId, canonicalNowMs = null) {
    const o = overrides[topicId];
    if (!o || !o.temp_open_until) return false;

    const tempUtcMs = new Date(o.temp_open_until).getTime();
    if (!Number.isFinite(tempUtcMs)) return false;

    const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

    let nowUtcMs;
    if (Number.isFinite(canonicalNowMs)) {
      nowUtcMs = canonicalNowMs;
    } else {
      const serverMs = serverTimeUtc ? new Date(serverTimeUtc).getTime() : NaN;
      nowUtcMs = Number.isFinite(serverMs) ? serverMs : Date.now();
    }

    const tempManilaMs = tempUtcMs + MANILA_OFFSET_MS;
    const nowManilaMs = nowUtcMs + MANILA_OFFSET_MS;

    return tempManilaMs > nowManilaMs;
  }

  function getStatus(topicId) {
    if (extraAttemptSet.has(topicId)) return "ExtraAttempt";

    const canonicalNowUtcMs = Date.now() + (Number.isFinite(serverOffsetMs) ? serverOffsetMs : 0);

    if (isTempOpen(topicId, canonicalNowUtcMs)) return "TemporaryOpen";

    if (inProgressSet.has(topicId)) return "In Progress";
    if (masteredSet.has(topicId)) return "Mastered";
    if (recommendedSet.has(topicId)) return "Recommended";

    const topic = topicsMap[topicId];
    const prereqs = topic?.prerequisites || [];
    if (prereqs.length === 0 && !masteredSet.has(topicId)) return "Recommended";

    const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
    const nowManilaMs = canonicalNowUtcMs + MANILA_OFFSET_MS;

    if (topic) {
      if (topic.manual_lock) return "Locked";

      const openUtcMs = topic.open_at ? new Date(topic.open_at).getTime() : NaN;
      const closeUtcMs = topic.close_at ? new Date(topic.close_at).getTime() : NaN;

      const openMs = Number.isFinite(openUtcMs) ? openUtcMs + MANILA_OFFSET_MS : NaN;
      const closeMs = Number.isFinite(closeUtcMs) ? closeUtcMs + MANILA_OFFSET_MS : NaN;

      if (Number.isFinite(openMs) && openMs > nowManilaMs) return "Locked";
      if (Number.isFinite(closeMs) && closeMs <= nowManilaMs) return "Closed";
    }

    return "Upcoming";
  }

  function getColorForStatus(status) {
    // Softer modern palette — avoid red
    switch (status) {
      case "ExtraAttempt":
        return "#06b6d4"; // cyan/teal (calm, attention without alarm)
      case "TemporaryOpen":
        return "#0ea5a4"; // teal-ish for temp open
      case "In Progress":
        return "#3b82f6"; // blue
      case "Recommended":
        return "#f59e0b"; // warm amber (less harsh than red)
      case "Mastered":
        return "#16a34a"; // green
      case "Locked":
      case "Closed":
        return "#6b7280"; // slate gray for Locked/Closed
      default:
        return "#6b7280"; // slate gray for Upcoming
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  // ordering: ExtraAttempt, TemporaryOpen, In Progress, Recommended, Upcoming, Mastered
  const order = { ExtraAttempt: 0, TemporaryOpen: 1, "In Progress": 2, Recommended: 3, Upcoming: 4, Mastered: 5, Locked: 6, Closed: 7 };
  const sorted = [...topics].sort((a, b) => (order[getStatus(a.id)] ?? 99) - (order[getStatus(b.id)] ?? 99));

  return (
    <div style={{ padding: "20px 40px" }}>
      <h2
        style={{
          textAlign: "center",
          marginBottom: 24,
          background: "linear-gradient(90deg,#3b82f6,#06b6d4)",
          color: "white",
          padding: "10px 20px",
          borderRadius: 10,
          boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
        }}
      >
        💬 Choose a recommended card to start your learning adventure!
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 16,
        }}
      >
        {sorted.map((t) => {
          const status = getStatus(t.id);
          const color = getColorForStatus(status);
          const humanOpen = t.open_at
            ? new Date(t.open_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
            : null;

          const humanClose = t.close_at
            ? new Date(t.close_at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
            : null;
          const timePanel = ( 
            <div style={{ marginTop: 10, fontSize: 14, color: "#111827", lineHeight: "1.4" }}>
              {humanOpen && <div><strong>Opens:</strong> {humanOpen}</div>}
              {humanClose && <div><strong>Closes:</strong> {humanClose}</div>}
            </div>
          );

          // background variants — subtle & soft
          const background =
            status === "Mastered"
              ? "#ecfdf5"
              : status === "In Progress"
              ? "#eff6ff"
              : status === "Recommended"
              ? "#fffbeb"
              : status === "ExtraAttempt"
              ? "#ecfeff"
              : status === "TemporaryOpen"
              ? "#ecfdf4"
              : "#f3f4f6";

          // compute countdown display (for locked/open)
          let countdownEl = null;
          if (status === "TemporaryOpen") {
            const o = overrides[t.id];
            if (o?.temp_open_until && serverTimeUtc) {
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>
                Open for <Countdown targetUtcIso={o.temp_open_until} serverTimeUtcIso={serverTimeUtc} compact />
                {t.close_at ? <span> · Closes: <Countdown targetUtcIso={t.close_at} serverTimeUtcIso={serverTimeUtc} compact /></span> : null}
              </div>;
            }
          } else if (status === "Locked") {
            // show when it opens if open_at exists
            if (t.open_at && serverTimeUtc) {
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>
                Opens in <Countdown targetUtcIso={t.open_at} serverTimeUtcIso={serverTimeUtc} compact />
                {t.close_at ? <span> · Closes: <Countdown targetUtcIso={t.close_at} serverTimeUtcIso={serverTimeUtc} compact /></span> : null}
              </div>;
            } else {
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>Locked</div>;
            }
          } else if (status === "Closed") {
            // show when it closed and when it will reopen if open_at in future
            countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>
              Closed{t.open_at ? <span> · Reopens in <Countdown targetUtcIso={t.open_at} serverTimeUtcIso={serverTimeUtc} compact /></span> : null}
            </div>;
          }

          return (
            <div
              key={t.id}
              onClick={() => {
                const st = getStatus(t.id);
                if (st === "Locked" || st === "Closed") {
                  window.alert("This topic is currently locked. It will open at the scheduled time or if your teacher grants access.");
                  return;
                }
                navigate(`/student-dashboard/${id}/topic/${t.id}`);
              }}
              style={{
                background,
                border: `2px solid ${color}`,
                borderRadius: 10,
                padding: 16,
                cursor: "pointer",
                position: "relative",
                transition: "transform 0.15s",
                display: "flex",           // <-- make card a column flex container
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 180,            // adjust as needed so cards have consistent height
              }}
            >
              {/* badge area (top-right) */}
              <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    background: color,
                    color: "white",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "5px 10px",
                    borderRadius: 14,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  {status === "ExtraAttempt" ? "Retake Assessment" : status === "TemporaryOpen" ? "Open (temp)" : status}
                </div>
              </div>

              {/* main content (top) */}
              <div style={{ paddingRight: 8 }}>
                <h3 style={{ marginBottom: 8, fontSize: 18 }}>{t.name}</h3>
                <p style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>{t.description}</p>
              </div>

              {/* time panel (sticks to bottom because of column + space-between) */}
              <div style={{ marginTop: 12 }}>
                {timePanel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
