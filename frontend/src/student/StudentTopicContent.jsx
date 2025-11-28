// frontend/src/layout/StudentTopicContent.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentTopicContent() {
  const { id: studentId, topicId } = useParams();
  const navigate = useNavigate();

  // existing state
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeContentId, setActiveContentId] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW: tabs + assessment state
  const [tab, setTab] = useState("content"); // "content" | "assessment"
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessment, setAssessment] = useState(null); // null => not loaded or not found
  const [answers, setAnswers] = useState({}); // { question_id: student_answer }
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null); // { score, passed }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [topicRes, contentRes, stuRes] = await Promise.all([
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/content/${topicId}`),
          fetch(`${API_BASE}/students/${studentId}`),
        ]);
        const topicList = await topicRes.json();
        setTopic((topicList || []).find((t) => t.id === topicId) || null);
        const contentList = await contentRes.json();
        setContents(contentList || []);
        const stu = await stuRes.json();
        setSeen(stu.content_seen || []);
      } catch (err) {
        console.error("Error loading topic content:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId, topicId]);

  // Load assessment when switching to assessment tab
  useEffect(() => {
    if (tab !== "assessment") return;
    let mounted = true;
    async function loadAssessment() {
      setAssessmentLoading(true);
      setAssessment(null);
      setSubmissionResult(null);
      setAnswers({});
      try {
        const res = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (res.ok) {
          const json = await res.json();
          if (!mounted) return;
          setAssessment(json);
          // try to load latest submission for this student (optional)
          const sub = await fetch(`${API_BASE}/assessments/${topicId}/submission/${studentId}`);
          if (sub.ok) {
            const sj = await sub.json();
            if (mounted) {
              setSubmissionResult({ score: sj.score, passed: sj.passed });
            }
          }
        } else {
          // no assessment found
          if (mounted) setAssessment(null);
        }
      } catch (err) {
        console.error("Failed to load assessment:", err);
        if (mounted) setAssessment(null);
      } finally {
        if (mounted) setAssessmentLoading(false);
      }
    }
    loadAssessment();
    return () => { mounted = false; };
  }, [tab, topicId, studentId]);

  async function markSeen(contentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });
      const data = await res.json();
      setSeen(data.content_seen || []);
      return data;
    } catch (err) {
      console.error("markSeen failed:", err);
      throw err;
    }
  }

  function getEmbedLink(link) {
    if (!link) return "";
    if (link.includes("youtube.com/watch?v=")) {
      const id = link.split("v=")[1].split("&")[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return link;
  }

  // Answer handlers
  function setAnswer(questionId, value) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  async function submitAssessment() {
    if (!assessment || !assessment.questions || assessment.questions.length === 0) {
      alert("No assessment available.");
      return;
    }

    // Build answers array in expected format
    const payloadAnswers = assessment.questions.map((q) => {
      const ans = answers[q.question_id];
      // For ordering questions where student provides array, ensure we pass array
      return { question_id: q.question_id, student_answer: typeof ans === "undefined" ? null : ans };
    });

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/assessments/${topicId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, answers: payloadAnswers }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("submit failed", json);
        alert(json.error || "Failed to submit assessment");
      } else {
        setSubmissionResult({ score: json.score, passed: json.passed });

        // refresh student record to pick up mastered flag
        try {
          const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
          if (stuRes.ok) {
            const stu = await stuRes.json();
            setSeen(stu.content_seen || []);
            // notify generic student-data update (existing behavior)
            window.dispatchEvent(new Event("studentDataUpdated"));
          }
        } catch (err) {
          console.warn("Failed to refresh student record:", err);
        }

        // --- NEW: fetch the authoritative path and broadcast it to listeners ---
        try {
          const pathRes = await fetch(`${API_BASE}/students/${studentId}/path`);
          if (pathRes.ok) {
            const pathJson = await pathRes.json();
            // dispatch with the new path so other components (dashboard, sidebar) can update immediately
            window.dispatchEvent(new CustomEvent("studentPathUpdated", { detail: pathJson }));
          } else {
            // fallback: still notify components to refresh themselves
            window.dispatchEvent(new Event("studentPathUpdated"));
          }
        } catch (err) {
          console.warn("Failed to fetch student path:", err);
          window.dispatchEvent(new Event("studentPathUpdated"));
        }

        // Optionally refresh the dashboard contentSeenUpdated as well (if relevant)
        window.dispatchEvent(new Event("contentSeenUpdated"));

        if (json.passed) {
          alert(`Passed! Score: ${json.score}. Topic will be marked completed.`);
          // OPTIONAL: redirect student to the topic's content page after pass
          // navigate(`/student-dashboard/${studentId}/topic/${topicId}`);
        } else {
          alert(`Score: ${json.score}. You did not pass. Try again if allowed.`);
        }
      }
    } catch (err) {
      console.error("submitAssessment error", err);
      alert("Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading topic...</div>;

  return (
    <div style={{ background: "linear-gradient(to bottom,#eaf6ff,#fff6f8)", minHeight: "100vh", padding: "40px 60px", position: "relative" }}>
      <button onClick={() => navigate(-1)} style={{ display: "block", width: "100%", background: "#4db6ac", border: "none", color: "white", fontWeight: "bold", padding: "12px", borderRadius: 10, cursor: "pointer", marginBottom: 24 }}>
        ← Back to Dashboard
      </button>

      <div style={{ background: "#fff", border: "1px solid #dbeafe", borderRadius: 12, padding: 24, marginBottom: 8 }}>
        <h1 style={{ marginBottom: 8, fontSize: 26, color: "#1e3a8a" }}>📘 {topic?.name}</h1>
        <p style={{ color: "#334155" }}>{topic?.description}</p>
      </div>

      {/* TAB SWITCHER */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab("content")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: tab === "content" ? "2px solid #2563eb" : "1px solid #e5e7eb",
            background: tab === "content" ? "#eef2ff" : "#fff",
            cursor: "pointer"
          }}
        >
          Content
        </button>
        <button
          onClick={() => setTab("assessment")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: tab === "assessment" ? "2px solid #2563eb" : "1px solid #e5e7eb",
            background: tab === "assessment" ? "#eef2ff" : "#fff",
            cursor: "pointer"
          }}
        >
          Assessment
        </button>
      </div>

      {/* CONTENT TAB */}
      {tab === "content" && (
        <>
          <h2 style={{ marginBottom: 16, color: "#2563eb" }}>🎨 Learning Materials</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {contents.map((c) => (
              <div key={c.id} style={{ background: "#fff", border: "1px solid #e0e7ff", borderRadius: 12, padding: 16, boxShadow: "0 3px 6px rgba(0,0,0,0.08)", position: "relative" }}>
                <h3 style={{ marginBottom: 8, fontWeight: "bold", color: "#2563eb", cursor: "pointer" }}
                    onClick={() => { setActiveVideo(getEmbedLink(c.link)); setActiveContentId(c.id); }}>
                  ▶ {c.title}
                </h3>

                <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>{c.description}</p>

                {seen.includes(c.id) ? (
                  <span style={{ color: "#16a34a", fontWeight: "bold" }}>✅ Viewed</span>
                ) : (
                  <span style={{ color: "#f59e0b", fontWeight: "bold" }}>Not viewed</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ASSESSMENT TAB */}
      {tab === "assessment" && (
        <div style={{ marginTop: 8, maxWidth: 900 }}>
          <h2 style={{ color: "#2563eb" }}>📝 Assessment</h2>

          {assessmentLoading ? (
            <div>Loading assessment...</div>
          ) : !assessment ? (
            <div style={{ padding: 12, background: "#fff", border: "1px solid #f1f5f9", borderRadius: 8 }}>
              <p style={{ margin: 0 }}>No assessment has been created for this topic yet. Please notify your teacher.</p>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #e6eefc" }}>
              <h3 style={{ marginTop: 0 }}>{assessment.title}</h3>
              {assessment.instructions && <p style={{ color: "#475569" }}>{assessment.instructions}</p>}

              {(assessment.questions || []).map((q, idx) => (
                <div key={q.question_id} style={{ border: "1px solid #eef2ff", padding: 10, borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{`Q${idx + 1}.`}</strong>
                    <div style={{ color: "#334155" }}>{q.question}</div>
                  </div>

                  {/* render input by type */}
                  {q.type === "multiple_choice" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(q.choices || []).map((c, ci) => (
                        <label key={ci} style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="radio"
                            name={q.question_id}
                            checked={answers[q.question_id] === c}
                            onChange={() => setAnswer(q.question_id, c)}
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "short_answer" && (
                    <input
                      value={answers[q.question_id] ?? ""}
                      onChange={(e) => setAnswer(q.question_id, e.target.value)}
                      placeholder="Type your answer"
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                    />
                  )}

                  {q.type === "numeric" && (
                    <input
                      type="number"
                      value={answers[q.question_id] ?? ""}
                      onChange={(e) => setAnswer(q.question_id, e.target.value)}
                      placeholder="Numeric answer"
                      style={{ width: "200px", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                    />
                  )}

                  {q.type === "ordering" && (
                    <>
                      <p style={{ marginTop: 8, color: "#6b7280" }}>Drag & drop not available in this minimal UI — enter the items in the correct order separated by `|` (pipe).</p>
                      <input
                        value={answers[q.question_id] ?? ""}
                        onChange={(e) => setAnswer(q.question_id, e.target.value.split("|").map(s => s.trim()))}
                        placeholder="item1 | item2 | item3"
                        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                      />
                    </>
                  )}
                </div>
              ))}

              {/* show last submission if exists */}
              {submissionResult && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Last attempt:</strong> Score: {submissionResult.score} — {submissionResult.passed ? "Passed" : "Not passed"}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setTab("content")} style={{ background: "#ddd", padding: "8px 12px", borderRadius: 6 }}>Back to Content</button>
                <button onClick={submitAssessment} disabled={submitting} style={{ background: "#2563eb", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={() => navigate(-1)} style={{ display: "block", width: "100%", background: "#4db6ac", border: "none", color: "white", fontWeight: "bold", padding: "12px", borderRadius: 10, cursor: "pointer", marginTop: 24 }}>
        ← Back to Dashboard
      </button>

      {/* Modal pop-out for video */}
      {activeVideo && (
        <div onClick={() => { setActiveVideo(null); setActiveContentId(null); }} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 12, borderRadius: 12, maxWidth: "95%", width: "900px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)", position: "relative" }}>
            <button onClick={() => { setActiveVideo(null); setActiveContentId(null); }}
              style={{ position: "absolute", top: 10, right: 12, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", zIndex: 1300 }}>
              ✖
            </button>

            {/* Mark as Seen & Close — visible if not already seen */}
            {activeContentId && !seen.includes(activeContentId) && (
              <button onClick={(e) => {
                e.stopPropagation();
                markSeen(activeContentId)
                  .then(() => {
                    window.dispatchEvent(new Event("contentSeenUpdated"));
                    setActiveVideo(null);
                    setActiveContentId(null);
                  })
                  .catch(() => {});
              }}
                style={{ position: "absolute", top: 10, left: 12, background: "#f59e0b", color: "white", border: "none", padding: "8px 10px", borderRadius: 8, cursor: "pointer", zIndex: 1300 }}>
                ✅ Mark as Seen & Close
              </button>
            )}

            <iframe src={activeVideo} title="player" width="100%" height="520" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: "none", borderRadius: 8 }} />
          </div>
        </div>
      )}
    </div>
  );
}
