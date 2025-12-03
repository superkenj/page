import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

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

  // Normalize helper: accept array of ids or objects {id,...}
  function normalizeToIds(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => (x && typeof x === "object" ? x.id : x)).filter(Boolean);
  }

  async function loadAll() {
    try {
      setLoading(true);

      const [tRes, pRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/topics/list`),
        fetch(`${API_BASE}/students/${id}/path`),
        fetch(`${API_BASE}/students/${id}`),
      ]);

      const tJson = await tRes.json();
      const pJson = await pRes.json();
      const sJson = await sRes.json();

      const allTopics = Array.isArray(tJson) ? tJson : tJson.topics || [];
      setTopics(allTopics);

      // store topic_progress for extraAttempts detection
      const tp = sJson.topic_progress && typeof sJson.topic_progress === "object" ? sJson.topic_progress : {};
      setTopicProgress(tp);

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

  function getStatus(topicId) {
    // New priority: ExtraAttempt first
    if (extraAttemptSet.has(topicId)) return "ExtraAttempt";

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

    return "Upcoming";
  }

  function getColorForStatus(status) {
    // Softer modern palette — avoid red
    switch (status) {
      case "ExtraAttempt":
        return "#06b6d4"; // cyan/teal (calm, attention without alarm)
      case "In Progress":
        return "#3b82f6"; // blue
      case "Recommended":
        return "#f59e0b"; // warm amber (less harsh than red)
      case "Mastered":
        return "#16a34a"; // green
      default:
        return "#6b7280"; // slate gray for Upcoming
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading dashboard...</div>;

  // ordering: ExtraAttempt, In Progress, Recommended, Upcoming, Mastered
  const order = { ExtraAttempt: 0, "In Progress": 1, Recommended: 2, Upcoming: 3, Mastered: 4 };
  const sorted = [...topics].sort((a, b) => order[getStatus(a.id)] - order[getStatus(b.id)]);

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
              ? "#ecfeff" // very light cyan for extra attempt cards
              : "#f3f4f6";

          return (
            <div
              key={t.id}
              onClick={() => navigate(`/student-dashboard/${id}/topic/${t.id}`)}
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
                {/* Extra attempt badge (prominent, calming color) */}

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
                  {status === "ExtraAttempt" ? "Try Again" : status}
                </div>
              </div>

              <h3 style={{ marginBottom: 8 }}>{t.name}</h3>
              <p style={{ fontSize: 14, color: "#374151" }}>{t.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
