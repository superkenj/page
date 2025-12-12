// frontend/src/student/StudentTopicContent.jsx
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
  const [locked, setLocked] = useState(false); // NEW: assessment locked after pass or 3 attempts

  // NEW: attempt meta (for popup)
  const [attempts, setAttempts] = useState(0);
  const [extraAttempts, setExtraAttempts] = useState(0);
  const [allowedAttempts, setAllowedAttempts] = useState(3);

  // NEW: assessment session + soft timer
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState(null); // null = no timer
  const [timeExpired, setTimeExpired] = useState(false);

  // NEW: pretty confirmation modal for starting assessment
  const [showAssessmentConfirm, setShowAssessmentConfirm] = useState(false);
  const [confirmInfo, setConfirmInfo] = useState({
    attemptsUsed: 0,
    attemptsLeft: 0,
    allowed: 3,
    isRemedial: false,
  });

    // NEW: remediation practice state
  const [practiceConfig, setPracticeConfig] = useState(null);      // full practice bank from backend
  const [practiceLoading, setPracticeLoading] = useState(false);   // loading practice bank
  const [practiceQuestions, setPracticeQuestions] = useState([]);  // sampled questions for current session
  const [practiceAnswers, setPracticeAnswers] = useState({});      // { question_id: answer }
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);

  const [practiceMeta, setPracticeMeta] = useState({
    requiredSessions: 3,
    minPasses: 2,
    sessionsCompleted: 0,
    passes: 0,
    complete: false,  // true → assessment unlocked for remedial
  });

  function shuffle(arr) {
    const a = Array.isArray(arr) ? [...arr] : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- load initial data (topics, contents, student) ----------
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

        const tp = stu.topic_progress && stu.topic_progress[topicId] ? stu.topic_progress[topicId] : null;
        const extra = tp ? Number(tp.extraAttempts || 0) : 0;
        const attemptsUsed = tp ? Number(tp.attempts || 0) : 0;
        const allowed = 3 + extra;
        const isLocked = tp ? (tp.locked === true || tp.completed === true || attemptsUsed >= allowed) : false;

        setLocked(isLocked);
        setAttempts(attemptsUsed);
        setExtraAttempts(extra);
        setAllowedAttempts(allowed);

        // NEW: practice meta from topic_progress (fallback to defaults)
        const practiceRequired = tp && tp.practiceRequired != null ? Number(tp.practiceRequired) : 3;
        const practiceMinPasses = tp && tp.practiceMinPasses != null ? Number(tp.practiceMinPasses) : 2;
        const practiceSessionsCompleted = tp && tp.practiceSessionsCompleted != null ? Number(tp.practiceSessionsCompleted) : 0;
        const practicePasses = tp && tp.practicePasses != null ? Number(tp.practicePasses) : 0;
        const practiceComplete = tp ? !!tp.practiceComplete : false;

        setPracticeMeta({
          requiredSessions: practiceRequired,
          minPasses: practiceMinPasses,
          sessionsCompleted: practiceSessionsCompleted,
          passes: practicePasses,
          complete: practiceComplete,
        });

      } catch (err) {
        console.error("Error loading topic content:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId, topicId]);

  // ---------- when assessment tab is opened: load assessment, latest submission, and re-check student topic_progress ----------
  useEffect(() => {
    if (tab !== "assessment") return;
    let mounted = true;

    async function loadAssessment() {
      setAssessmentLoading(true);
      setAssessment(null);
      setSubmissionResult(null);
      setAnswers({});

      try {
        // Load assessment doc
        const res = await fetch(`${API_BASE}/assessments/${topicId}`);
        if (!res.ok) {
          if (!mounted) return;
          setAssessment(null);
          return;
        }

        const json = await res.json();

        // Shuffle questions and choices for presentation
        let qlist = Array.isArray(json.questions) ? [...json.questions] : [];

        qlist = qlist.map((q, idx) => {
          // 🔑 If Firestore already has question_id, KEEP it.
          // Only fall back to a generated one if missing.
          const qid = q.question_id || q.id || `${json.assessment_id}_${idx}`;
          const base = { ...q, question_id: qid };

          // shuffle choices only if MCQ
          if (base.choices && Array.isArray(base.choices)) {
            return { ...base, choices: shuffle(base.choices) };
          }

          return base;
        });

        // randomize question order AFTER preserving ids
        qlist = shuffle(qlist);

        setAssessment({ ...json, questions: qlist });

        if (!mounted) return;
        setAssessment({ ...json, questions: qlist });

        // Load latest submission (if any)
        const subRes = await fetch(`${API_BASE}/assessments/${topicId}/submission/${studentId}`);
        let submissionJson = null;
        if (subRes.ok) {
          submissionJson = await subRes.json();
          if (!mounted) return;
          setSubmissionResult({ score: submissionJson.score, passed: submissionJson.passed });
        }

        // ALSO fetch latest student record (re-check topic_progress)
        // This helps if submission vs student doc are slightly out of sync
        try {
          const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
          if (stuRes.ok) {
            const stu = await stuRes.json();
            // re-sync seen indicator
            if (mounted) setSeen(stu.content_seen || []);

            const tp = stu.topic_progress && stu.topic_progress[topicId] ? stu.topic_progress[topicId] : null;
            const extraFromTP = tp ? Number(tp.extraAttempts || 0) : 0;
            const allowedFromTP = 3 + extraFromTP;
            const attemptsFromSubmission = submissionJson ? (submissionJson.attempt_number || submissionJson.attempts || 0) : 0;
            const passedFromSubmission = submissionJson ? !!submissionJson.passed : false;

            const finalLocked = passedFromSubmission === true ||
              (attemptsFromSubmission >= allowedFromTP) ||
              (tp && (tp.locked === true || tp.completed === true));

            if (mounted) setLocked(finalLocked);
          }
        } catch (e) {
          console.warn("Failed to fetch student record while loading assessment:", e);
        }
      } catch (err) {
        console.error("Failed to load assessment:", err);
        if (mounted) setAssessment(null);
      } finally {
        if (mounted) setAssessmentLoading(false);
      }
    }

    loadAssessment();
    return () => {
      mounted = false;
    };
  }, [tab, topicId, studentId]);

  // If locked flips true while user is viewing assessment, redirect them back to content and show reason
  useEffect(() => {
    if (locked && tab === "assessment") {
      alert("This assessment is locked (passed or maximum attempts reached). Redirecting to Content.");
      setTab("content");
    }
  }, [locked, tab]);

  // Start soft timer when an assessment is in progress and the assessment defines a time_limit_minutes
  useEffect(() => {
    if (!assessmentInProgress || !assessment) return;

    // don't reset if timer already running or expired
    if (timeLeftSec !== null || timeExpired) return;

    const limitMinutes = Number(assessment.time_limit_minutes ?? assessment.timeLimitMinutes ?? 0);
    if (!Number.isFinite(limitMinutes) || limitMinutes <= 0) return;

    setTimeLeftSec(Math.round(limitMinutes * 60));
  }, [assessmentInProgress, assessment, timeLeftSec, timeExpired]);

  // Tick countdown every second while assessment is in progress
  useEffect(() => {
    if (!assessmentInProgress || timeLeftSec === null || timeExpired) return;

    const iv = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          // time is up: stop inputs but still allow submit
          setTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [assessmentInProgress, timeLeftSec, timeExpired]);

    // --- Practice helpers ---

  function pickRandomQuestions(all, countMin = 3, countMax = 5) {
    const src = Array.isArray(all) ? [...all] : [];
    if (src.length === 0) return [];
    const max = Math.min(src.length, countMax);
    const targetCount = Math.min(max, Math.max(countMin, 1));
    const shuffled = shuffle(src);
    return shuffled.slice(0, targetCount);
  }

  async function startPracticeSession() {
    try {
      setPracticeLoading(true);

      // Load practice config once
      let config = practiceConfig;
      if (!config) {
        const res = await fetch(`${API_BASE}/practice/${topicId}`);
        if (res.ok) {
          config = await res.json();
        } else {
          config = null;
        }
        setPracticeConfig(config);
      }

      if (!config || !Array.isArray(config.questions) || config.questions.length === 0) {
        alert("No practice items are available for this topic yet. Your teacher may need to add them.");
        // Fallback: unlock assessment if no practice has been configured
        setPracticeMeta((m) => ({ ...m, complete: true }));
        setAssessmentInProgress(true);
        return;
      }

      const sample = pickRandomQuestions(config.questions, 3, 5);
      setPracticeQuestions(sample);
      setPracticeAnswers({});
    } catch (err) {
      console.error("startPracticeSession error:", err);
      alert("Failed to load practice items.");
    } finally {
      setPracticeLoading(false);
    }
  }

  async function submitPracticeSession() {
    if (!practiceQuestions || practiceQuestions.length === 0) {
      alert("No practice questions to submit.");
      return;
    }

    setPracticeSubmitting(true);
    try {
      const payloadAnswers = practiceQuestions.map((q) => {
        const ans = practiceAnswers[q.question_id];
        return {
          question_id: q.question_id,
          student_answer: typeof ans === "undefined" ? null : ans,
        };
      });

      const res = await fetch(`${API_BASE}/practice/${topicId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, answers: payloadAnswers }),
      });

      let body = {};
      try {
        body = await res.json();
      } catch (e) {
        body = {};
      }

      const score = body.score ?? null;
      const passed = !!body.passed;

      // Update local meta using server values if present, otherwise fallback
      let nextMeta = { ...practiceMeta };

      if (typeof body.sessionsCompleted === "number") {
        nextMeta.sessionsCompleted = body.sessionsCompleted;
      } else {
        nextMeta.sessionsCompleted = (nextMeta.sessionsCompleted || 0) + 1;
      }

      if (typeof body.passes === "number") {
        nextMeta.passes = body.passes;
      } else if (passed) {
        nextMeta.passes = (nextMeta.passes || 0) + 1;
      }

      const required = body.requiredSessions ?? nextMeta.requiredSessions ?? 3;
      const minPasses = body.minPasses ?? nextMeta.minPasses ?? 2;
      nextMeta.requiredSessions = required;
      nextMeta.minPasses = minPasses;

      const complete =
        typeof body.practiceComplete === "boolean"
          ? body.practiceComplete
          : nextMeta.sessionsCompleted >= required &&
            nextMeta.passes >= minPasses;

      nextMeta.complete = complete;
      setPracticeMeta(nextMeta);

      // Refresh student document so topic_progress stays in sync
      try {
        const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
        if (stuRes.ok) {
          const stu = await stuRes.json();
          const tp =
            stu.topic_progress && stu.topic_progress[topicId]
              ? stu.topic_progress[topicId]
              : null;

          if (tp) {
            setPracticeMeta({
              requiredSessions:
                tp.practiceRequired ?? nextMeta.requiredSessions,
              minPasses: tp.practiceMinPasses ?? nextMeta.minPasses,
              sessionsCompleted:
                tp.practiceSessionsCompleted ?? nextMeta.sessionsCompleted,
              passes: tp.practicePasses ?? nextMeta.passes,
              complete: tp.practiceComplete ?? complete,
            });
          }
        }
      } catch (e) {
        console.warn("Failed to refresh student after practice submit:", e);
      }

      if (passed) {
        alert(`Practice session result: Passed (score: ${score ?? "N/A"}).`);
      } else {
        alert(
          `Practice session result: Not passed (score: ${score ?? "N/A"}).`
        );
      }

      if (!nextMeta.complete) {
        const remaining = Math.max(
          0,
          (nextMeta.requiredSessions || 3) - (nextMeta.sessionsCompleted || 0)
        );
        alert(
          `You have completed ${nextMeta.sessionsCompleted}/${
            nextMeta.requiredSessions
          } practice sessions.\n` +
            `You must pass at least ${nextMeta.minPasses} of them to unlock the assessment.` +
            (remaining > 0
              ? `\nYou still have ${remaining} practice session(s) to finish.`
              : "")
        );
        // Start another session
        await startPracticeSession();
      } else {
        alert(
          "You have completed enough practice sessions.\nYou may now take the assessment, or come back later."
        );
        setPracticeQuestions([]);
        setPracticeAnswers({});
      }

      window.dispatchEvent(new Event("studentDataUpdated"));
      window.dispatchEvent(new Event("studentPathUpdated"));
    } catch (err) {
      console.error("submitPracticeSession error:", err);
      alert("Failed to submit practice session.");
    } finally {
      setPracticeSubmitting(false);
    }
  }

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

  function formatSeconds(total) {
    if (total == null) return "";
    const safe = Math.max(0, Math.floor(total));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

    function handleStartAssessment() {
    setShowAssessmentConfirm(false);

    // If this is remedial and practice is not yet completed,
    // go into practice mode first (inside the Assessment tab)
    if (confirmInfo.isRemedial && !practiceMeta.complete) {
      setTab("assessment");

      // Make sure we are NOT in timed assessment mode yet
      setAssessmentInProgress(false);
      setTimeExpired(false);
      setTimeLeftSec(null);

      // Start or prepare a practice session
      startPracticeSession();
      return;
    }

    // Normal assessment flow
    setTab("assessment");
    setAssessmentInProgress(true);
    setTimeExpired(false);
    // timer (if configured on the assessment) will start via the useEffect
  }

  // Answer handlers
  function setAnswer(questionId, value) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  // submitAssessment: returns to Content tab on success 
  async function submitAssessment() {
    // Prevent submission when locked
    if (locked) {
      alert("This assessment is locked — you cannot submit anymore.");
      // ensure we stay on content
      setTab("content");
      return;
    }

    if (!assessment || !assessment.questions || assessment.questions.length === 0) {
      alert("No assessment available.");
      return;
    }

    // Build answers array in expected format
    const payloadAnswers = assessment.questions.map((q) => {
      const ans = answers[q.question_id];
      return { question_id: q.question_id, student_answer: typeof ans === "undefined" ? null : ans };
    });

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/assessments/${topicId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, answers: payloadAnswers }),
      });

      // Defensive parse: prefer JSON, fallback to text
      let body;
      try {
        body = await res.json();
      } catch (e) {
        body = await res.text().catch(() => null);
        console.warn("submitAssessment: non-JSON response:", body);
      }

      console.log("submit response", res.status, body);

      // Treat as success if res.ok OR body contains expected fields
      const looksSuccessful =
        res.ok ||
        (body && (typeof body.score === "number" || body.success === true || typeof body.mastered !== "undefined"));

      if (!looksSuccessful) {
        const msg = (body && (body.error || body.message)) || "Failed to submit assessment";
        // If server responded with mastered info in body despite non-ok, treat as success:
        if (body && body.mastered) {
          // proceed as success path below
        } else {
          console.error("submit failed:", res.status, body);
          alert(msg);
          return;
        }
      }

      const json = typeof body === "object" ? body : {};

      // --- authoritative locking decision using server response (preferred) ---
      try {
        // If server returned numeric attempts/allowedAttempts, trust that.
        const attemptsFromServer = typeof json.attempts === "number" ? Number(json.attempts) : null;
        const allowedFromServer = typeof json.allowedAttempts === "number" ? Number(json.allowedAttempts) : null;
        const passedFromServer = !!json.passed;
        const masteredFromServer = !!json.mastered;

        if (attemptsFromServer !== null || allowedFromServer !== null) {
          // compute allowed attempts (fallback to 3 if allowed not present)
          const allowed = allowedFromServer !== null ? allowedFromServer : 3;
          const finalLocked = passedFromServer || masteredFromServer || (attemptsFromServer !== null && attemptsFromServer >= allowed);
          setLocked(finalLocked);
        } else {
          // fallback: attempt to derive from submission doc + student topic_progress (existing logic)
          let attemptsFromResponse = json.attempts || null;
          let masteredFromResponse = typeof json.mastered !== "undefined" ? json.mastered : null;

          // try fetching latest submission if missing
          try {
            const subRes = await fetch(`${API_BASE}/assessments/${topicId}/submission/${studentId}`);
            if (subRes.ok) {
              const subJson = await subRes.json();
              attemptsFromResponse = attemptsFromResponse ?? (subJson.attempt_number || subJson.attempts || 0);
              masteredFromResponse = masteredFromResponse ?? subJson.mastered ?? null;
            }
          } catch (e) {
            console.warn("Failed to fetch latest submission during fallback:", e);
          }

          // try fetching student doc to check extraAttempts
          try {
            const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
            if (stuRes.ok) {
              const stu = await stuRes.json();
              const tp = stu.topic_progress && stu.topic_progress[topicId] ? stu.topic_progress[topicId] : null;
              const extra = tp ? Number(tp.extraAttempts || 0) : 0;
              const attemptsFromTP = tp ? (tp.attempts || 0) : 0;
              const allowed = 3 + extra;
              const finalLocked = (tp && (tp.locked === true || tp.completed === true)) || (attemptsFromResponse >= allowed) || masteredFromResponse === true || passedFromServer;
              if (finalLocked) setLocked(true);
            }
          } catch (e) {
            console.warn("Failed to fetch student doc during fallback:", e);
          }
        }
      } catch (errDecide) {
        console.warn("Error deciding lock state:", errDecide);
      }

      // update local submission result for UI
      setSubmissionResult({ score: json.score ?? null, passed: json.passed ?? false });

      // refresh student record (so dashboard/sidebar picks up mastered/recommended)
      try {
        const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
        if (stuRes.ok) {
          const stu = await stuRes.json();
          setSeen(stu.content_seen || []);

          // also update attempts/extraAttempts/allowed from latest topic_progress
          const tp = stu.topic_progress && stu.topic_progress[topicId] ? stu.topic_progress[topicId] : null;
          if (tp) {
            const extraFromTP = Number(tp.extraAttempts || 0);
            const attemptsFromTP = Number(tp.attempts || 0);
            const allowedFromTP = 3 + extraFromTP;

            setAttempts(attemptsFromTP);
            setExtraAttempts(extraFromTP);
            setAllowedAttempts(allowedFromTP);

            const isLockedFromTP =
              tp.locked === true ||
              tp.completed === true ||
              attemptsFromTP >= allowedFromTP;
            if (isLockedFromTP) setLocked(true);
          }
        }
      } catch (e) {
        console.warn("Failed to refresh student after submit:", e);
      }

      // Dispatch events so other components refresh immediately
      window.dispatchEvent(new Event("studentDataUpdated"));
      window.dispatchEvent(new Event("studentPathUpdated"));
      window.dispatchEvent(new Event("contentSeenUpdated"));

      // If server marked topic as mastered (auto-master after 3 attempts),
      // show an explicit message
      if (json.mastered === true || (json.attempts >= 3 && json.passed === false)) {
        alert(
          json.passed
            ? `Passed! Score: ${json.score}. Topic marked completed.`
            : `This topic has been marked completed after ${json.attempts} attempts.`
        );
      } else {
        // Not mastered: show pass/fail message
        if (json.passed) {
          alert(`Passed! Score: ${json.score}. Topic will be marked completed.`);
        } else {
          alert(`Score: ${json.score ?? "N/A"}. You did not pass. Try again if allowed.`);
        }
      }

      // Reset assessment session + timer and return to Content
      setAssessmentInProgress(false);
      setTimeLeftSec(null);
      setTimeExpired(false);
      setTab("content");
    } catch (err) {
      console.error("submitAssessment network/error:", err);
      // If network error, still warn user
      alert("Failed to submit assessment (network error). Your attempt may or may not have been recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  const isRemedialFlow = (attempts || 0) >= 3 || (extraAttempts || 0) > 0;
  const needsPracticeFirst = isRemedialFlow && !practiceMeta.complete;

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

      {/* TAB SWITCHER: full width, both buttons split evenly */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => {
            if (assessmentInProgress && !locked) {
              alert("You are currently in an ongoing assessment. Please submit it before returning to the Content tab.");
              return;
            }
            setTab("content");
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: tab === "content" ? "2px solid #2563eb" : "1px solid #e5e7eb",
            background: tab === "content" ? "#eef2ff" : "#fff",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: tab === "content" ? 700 : 500
          }}
        >
          Content
        </button>
        <button
          onClick={() => {
            if (locked) return;

            const attemptsLeft = Math.max(
              0,
              (allowedAttempts || 3) - (attempts || 0)
            );
            const isRemedial =
              (attempts || 0) >= 3 || (extraAttempts || 0) > 0;

            setConfirmInfo({
              attemptsUsed: attempts || 0,
              attemptsLeft,
              allowed: allowedAttempts || 3,
              isRemedial,
            });
            setShowAssessmentConfirm(true);
          }}
          disabled={locked}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: tab === "assessment" ? "2px solid #2563eb" : "1px solid #e5e7eb",
            background: locked
              ? "#f3f4f6"      // greyed out background when locked
              : tab === "assessment"
              ? "#eef2ff"
              : "#fff",
            color: locked ? "#9ca3af" : "#000",
            cursor: locked ? "not-allowed" : "pointer",
            textAlign: "center",
            fontWeight: tab === "assessment" ? 700 : 500
          }}
        >
          Assessment {locked && "🔒"}
        </button>
      </div>

      {/* CONTENT TAB */}
      {tab === "content" && (
        <>
          <div
            style={{
              background: "#fff",
              border: "1px solid #dbeafe",
              borderRadius: 14,
              padding: 24,
              marginBottom: 20,
              boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
            }}
          >
            {/* ───────────── Notes Section ───────────── */}
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🧾 Notes
              </h2>

              {topic?.discussion?.trim() ? (
                <div
                  style={{
                    color: "#334155",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    fontSize: 15,
                  }}
                >
                  {topic.discussion}
                </div>
              ) : (
                <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 14 }}>
                  No notes yet.
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "#e5e7eb",
                margin: "16px 0 20px",
              }}
            />

            {/* ───────────── Learning Materials ───────────── */}
            <h2 style={{ marginBottom: 16, color: "#2563eb" }}>
              🎨 Learning Materials
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
                gap: 20,
              }}
            >
              {contents.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e0e7ff",
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: "0 3px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3
                    style={{
                      marginBottom: 8,
                      fontWeight: "bold",
                      color: "#2563eb",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setActiveVideo(getEmbedLink(c.link));
                      setActiveContentId(c.id);
                    }}
                  >
                    ▶ {c.title}
                  </h3>

                  <p style={{ fontSize: 14, color: "#475569", marginBottom: 12 }}>
                    {c.description}
                  </p>

                  {seen.includes(c.id) ? (
                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                      ✅ Viewed
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b", fontWeight: "bold" }}>
                      Not viewed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ASSESSMENT TAB */}
      {tab === "assessment" && (
        <div style={{ marginTop: 8, maxWidth: 900 }}>
          <h2
            style={{
              color: "#2563eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              📝 {needsPracticeFirst ? "Practice Session" : "Assessment"}
            </span>
            {!needsPracticeFirst && timeLeftSec !== null && (
              <span
                style={{
                  fontSize: 14,
                  color: timeExpired ? "#b91c1c" : "#0f766e",
                }}
              >
                {timeExpired
                  ? "Time is up"
                  : `Time left: ${formatSeconds(timeLeftSec)}`}
              </span>
            )}
          </h2>

          {/* ───────────────── PRACTICE FLOW (REMEDIAL) ───────────────── */}
          {needsPracticeFirst ? (
            practiceLoading ? (
              <div>Loading practice...</div>
            ) : practiceQuestions.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  background: "#fff",
                  border: "1px solid #f1f5f9",
                  borderRadius: 8,
                }}
              >
                <p style={{ marginBottom: 8 }}>
                  This attempt is part of your <strong>remediation</strong>.
                  You’ll do short practice sessions first before retaking the
                  assessment.
                </p>
                <p
                  style={{
                    marginTop: 0,
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  A practice session has <strong>{practiceSessionSize}</strong>{" "}
                  questions. You need to pass at least{" "}
                  <strong>2 out of 3</strong> sessions.
                </p>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={startPracticeSession}
                    style={{
                      background: "#2563eb",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Start practice session
                  </button>
                  <button
                    onClick={() => setTab("content")}
                    style={{
                      background: "#e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Back to Content
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  Sessions done:{" "}
                  <strong>{practiceMeta.totalSessions}</strong> · Passed:{" "}
                  <strong>{practiceMeta.passedSessions}</strong>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  padding: 12,
                  border: "1px solid #e6eefc",
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    padding: 8,
                    borderRadius: 6,
                    background: "#ecfeff",
                    color: "#0f766e",
                    fontSize: 13,
                  }}
                >
                  Practice session in progress. Answer the questions below and
                  click <strong>Submit practice</strong>.
                </div>

                {(practiceQuestions || []).map((q, idx) => (
                  <div
                    key={q.question_id}
                    style={{
                      border: "1px solid #eef2ff",
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <strong>{`Q${idx + 1}.`}</strong>
                      <div style={{ color: "#334155" }}>{q.question}</div>
                    </div>

                    {/* render input by type for PRACTICE */}
                    {q.type === "multiple_choice" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {(q.choices || []).map((c, ci) => (
                          <label
                            key={ci}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`practice_${q.question_id}`}
                              checked={practiceAnswers[q.question_id] === c}
                              onChange={() =>
                                setPracticeAnswer(q.question_id, c)
                              }
                            />
                            <span>{c}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === "short_answer" && (
                      <input
                        value={practiceAnswers[q.question_id] ?? ""}
                        onChange={(e) =>
                          setPracticeAnswer(q.question_id, e.target.value)
                        }
                        placeholder="Type your answer"
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                      />
                    )}

                    {q.type === "numeric" && (
                      <input
                        type="number"
                        value={practiceAnswers[q.question_id] ?? ""}
                        onChange={(e) =>
                          setPracticeAnswer(q.question_id, e.target.value)
                        }
                        placeholder="Numeric answer"
                        style={{
                          width: "200px",
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                      />
                    )}

                    {q.type === "ordering" && (
                      <>
                        <p style={{ marginTop: 8, color: "#6b7280" }}>
                          Enter the items in the correct order separated by{" "}
                          <code>|</code> (pipe).
                        </p>
                        <input
                          value={practiceAnswers[q.question_id] ?? ""}
                          onChange={(e) =>
                            setPracticeAnswer(
                              q.question_id,
                              e.target.value.split("|").map((s) => s.trim())
                            )
                          }
                          placeholder="item1 | item2 | item3"
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid #ccc",
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={submitPracticeSession}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Submit practice
                  </button>
                  <button
                    onClick={() => {
                      // allow cancelling this practice session explicitly
                      setPracticeQuestions([]);
                      setPracticeAnswers({});
                    }}
                    style={{
                      background: "#e5e7eb",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel session
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "#6b7280",
                  }}
                >
                  Sessions done:{" "}
                  <strong>{practiceMeta.totalSessions}</strong> · Passed:{" "}
                  <strong>{practiceMeta.passedSessions}</strong>
                </div>
              </div>
            )
          ) : (
            /* ─────────────── NORMAL ASSESSMENT (EXISTING) ─────────────── */
            <>
              {assessmentLoading ? (
                <div>Loading assessment...</div>
              ) : !assessment ? (
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    border: "1px solid #f1f5f9",
                    borderRadius: 8,
                  }}
                >
                  <p style={{ margin: 0 }}>
                    No assessment has been created for this topic yet. Please
                    notify your teacher.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: 12,
                    border: "1px solid #e6eefc",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{assessment.title}</h3>
                  {assessment.instructions && (
                    <p style={{ color: "#475569" }}>
                      {assessment.instructions}
                    </p>
                  )}

                  {timeExpired && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: 8,
                        borderRadius: 6,
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontSize: 13,
                      }}
                    >
                      Time is up. You can no longer change your answers, but you
                      can still submit this attempt.
                    </div>
                  )}

                  {(assessment.questions || []).map((q, idx) => (
                    <div
                      key={q.question_id}
                      style={{
                        border: "1px solid #eef2ff",
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <strong>{`Q${idx + 1}.`}</strong>
                        <div style={{ color: "#334155" }}>{q.question}</div>
                      </div>

                      {/* render input by type */}
                      {q.type === "multiple_choice" && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {(q.choices || []).map((c, ci) => (
                            <label
                              key={ci}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name={q.question_id}
                                checked={answers[q.question_id] === c}
                                onChange={() => setAnswer(q.question_id, c)}
                                disabled={locked || timeExpired}
                              />
                              <span>{c}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "short_answer" && (
                        <input
                          value={answers[q.question_id] ?? ""}
                          onChange={(e) =>
                            setAnswer(q.question_id, e.target.value)
                          }
                          placeholder="Type your answer"
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid #ccc",
                          }}
                          disabled={locked || timeExpired}
                        />
                      )}

                      {q.type === "numeric" && (
                        <input
                          type="number"
                          value={answers[q.question_id] ?? ""}
                          onChange={(e) =>
                            setAnswer(q.question_id, e.target.value)
                          }
                          placeholder="Numeric answer"
                          style={{
                            width: "200px",
                            padding: 8,
                            borderRadius: 6,
                            border: "1px solid #ccc",
                          }}
                          disabled={locked || timeExpired}
                        />
                      )}

                      {q.type === "ordering" && (
                        <>
                          <p
                            style={{ marginTop: 8, color: "#6b7280" }}
                          >
                            Drag & drop not available in this minimal UI — enter
                            the items in the correct order separated by{" "}
                            <code>|</code> (pipe).
                          </p>
                          <input
                            value={answers[q.question_id] ?? ""}
                            onChange={(e) =>
                              setAnswer(
                                q.question_id,
                                e.target.value
                                  .split("|")
                                  .map((s) => s.trim())
                              )
                            }
                            placeholder="item1 | item2 | item3"
                            style={{
                              width: "100%",
                              padding: 8,
                              borderRadius: 6,
                              border: "1px solid #ccc",
                            }}
                            disabled={locked || timeExpired}
                          />
                        </>
                      )}
                    </div>
                  ))}

                  {/* show last submission if exists */}
                  {submissionResult && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Last attempt:</strong> Score:{" "}
                      {submissionResult.score} —{" "}
                      {submissionResult.passed ? "Passed" : "Not passed"}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => {
                        if (assessmentInProgress && !locked) {
                          alert(
                            "Please submit your assessment before going back to the Content tab."
                          );
                          return;
                        }
                        setTab("content");
                      }}
                      style={{
                        background: "#ddd",
                        padding: "8px 12px",
                        borderRadius: 6,
                      }}
                    >
                      Back to Content
                    </button>
                    <button
                      onClick={submitAssessment}
                      disabled={submitting || locked}
                      style={{
                        background:
                          submitting || locked ? "#94a3b8" : "#2563eb",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: 6,
                        cursor:
                          submitting || locked ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Submitting..." : "Submit Assessment"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button onClick={() => navigate(-1)} style={{ display: "block", width: "100%", background: "#4db6ac", border: "none", color: "white", fontWeight: "bold", padding: "12px", borderRadius: 10, cursor: "pointer", marginTop: 24 }}>
        ← Back to Dashboard
      </button>

      {/* Pretty confirmation modal for starting assessment */}
      {showAssessmentConfirm && (
        <div
          onClick={() => setShowAssessmentConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              padding: "20px 24px",
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 10px 30px rgba(15,23,42,0.35)",
              border: "1px solid #dbeafe",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 20,
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚠️ Start Assessment?
            </h3>

            <p style={{ margin: "4px 0", color: "#111827" }}>
              You have used <strong>{confirmInfo.attemptsUsed}</strong> out of{" "}
              <strong>{confirmInfo.allowed}</strong> attempts.
            </p>

            <p style={{ margin: "4px 0 8px", color: "#111827" }}>
              Attempts left: <strong>{confirmInfo.attemptsLeft}</strong>.
            </p>

            {confirmInfo.isRemedial && (
              <div
                style={{
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "#ecfeff",
                  color: "#0f766e",
                  fontSize: 13,
                }}
              >
                This attempt is part of your <strong>remediation</strong>.
              </div>
            )}

            <p style={{ margin: "4px 0 14px", color: "#4b5563", fontSize: 14 }}>
              Once you start, you <strong>cannot return to the Content tab</strong>{" "}
              until you submit this attempt.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                onClick={() => setShowAssessmentConfirm(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Not now
              </button>

              <button
                onClick={handleStartAssessment}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(90deg,#2563eb,#0ea5e9)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Start Assessment
              </button>
            </div>
          </div>
        </div>
      )}

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
