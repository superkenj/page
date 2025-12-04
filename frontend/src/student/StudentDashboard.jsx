import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

function Countdown({ targetUtcIso, serverTimeUtcIso, compact = false }) {
  const [now, setNow] = useState(Date.now());

  // compute delta between client and server
  const serverMs = serverTimeUtcIso ? new Date(serverTimeUtcIso).getTime() : Date.now();
  const clientMs = Date.now();
  const delta = clientMs - serverMs; // client - server

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const canonicalNow = now - delta;
  const target = new Date(targetUtcIso).getTime();
  const msLeft = target - canonicalNow;
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

      // CHANGED: store overrides map + server time
      setServerTimeUtc(oJson.server_time_utc || new Date().toISOString());
      const ovMap = {};
      (oJson.overrides || []).forEach((r) => {
        if (r.topicId) ovMap[r.topicId] = r;
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

    const handleContentSeen = () => {
      console.log("🔄 Detected contentSeenUpdated — refreshing dashboard...");
      loadAll();
    };

    // Listen for both events other parts of app might dispatch
    window.addEventListener("contentSeenUpdated", handleContentSeen);
    window.addEventListener("studentPathUpdated", handleContentSeen);
    window.addEventListener("studentDataUpdated", handleContentSeen);

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
  function isTempOpen(topicId) {
    const o = overrides[topicId];
    if (!o || !o.temp_open_until) return false;
    return new Date(o.temp_open_until).getTime() > (new Date(serverTimeUtc || new Date()).getTime());
  }

  function getStatus(topicId) {
    // New priority: ExtraAttempt first
    if (extraAttemptSet.has(topicId)) return "ExtraAttempt";

    // CHANGED: Temporary open override (teacher granted or remediation)
    if (isTempOpen(topicId)) return "TemporaryOpen";

    // In-Progress always wins after extra
    if (inProgressSet.has(topicId)) return "In Progress";

    // Mastered wins over recommended/upcoming
    if (masteredSet.has(topicId)) return "Mastered";

    // If explicitly recommended by path -> Recommended
    if (recommendedSet.has(topicId)) return "Recommended";

    // treat a starter topic (no prereqs) as "Recommended" if not mastered.
    const topic = topicsMap[topicId];
    const prereqs = (topic && Array.isArray(topic.prerequisites)) ? topic.prerequisites : [];
    if (prereqs.length === 0 && !masteredSet.has(topicId)) {
      return "Recommended";
    }

    // CHANGED: check locking states — if topic is scheduled/locked, return 'Locked' so UI can show countdown
    if (topic) {
      const now = new Date(serverTimeUtc || new Date()).getTime();
      if (topic.manual_lock) {
        // manual lock
        return "Locked";
      }
      if (topic.open_at && new Date(topic.open_at).getTime() > now) {
        return "Locked";
      }
      if (topic.close_at && new Date(topic.close_at).getTime() <= now) {
        return "Closed";
      }
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
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>Open for <Countdown targetUtcIso={o.temp_open_until} serverTimeUtcIso={serverTimeUtc} compact /></div>;
            }
          } else if (status === "Locked") {
            // show when it opens if open_at exists
            if (t.open_at && serverTimeUtc) {
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>Opens in <Countdown targetUtcIso={t.open_at} serverTimeUtcIso={serverTimeUtc} compact /></div>;
            } else {
              countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>Locked</div>;
            }
          } else if (status === "Closed") {
            countdownEl = <div style={{ fontSize: 12, marginTop: 6 }}>Closed</div>;
          }

          return (
            <div
              key={t.id}
              onClick={() => {
                // If locked & not temp-open, prevent navigation and show a toast instead
                const st = getStatus(t.id);
                if (st === "Locked" || st === "Closed") {
                  // allow teacher/probing? For now show a warning
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
              }}
            >
              {/* badge area */}
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    background: color,
                    color: "white",
                    fontSize: 12,
                    fontWeight: "700",
                    padding: "3px 8px",
                    borderRadius: 12,
                  }}
                >
                  {status === "ExtraAttempt" ? "Try Again" : status === "TemporaryOpen" ? "Open (temp)" : status}
                </div>
              </div>

              <h3 style={{ marginBottom: 8 }}>{t.name}</h3>
              <p style={{ fontSize: 14, color: "#374151" }}>{t.description}</p>

              {countdownEl}
            </div>
          );
        })}
      </div>
    </div>
  );
}
