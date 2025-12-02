// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

// ---------------- Firebase Setup ----------------
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,   // App password
  },
});

// ---------------- Express Setup ----------------
const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://pathgen.netlify.app", // Netlify frontend
      "https://page-ebon-kappa.vercel.app",  // Vercel frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors()); 
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ PaGe backend is running successfully!");
});

// ✅ Helper: Promote dependent topics to "recommended" after mastering a prerequisite
async function updateRecommendedAfterMastered(studentId, newlyMasteredTopicId) {
  const studentRef = db.collection("students").doc(studentId);
  const studentDoc = await studentRef.get();
  if (!studentDoc.exists) return;

  const studentData = studentDoc.data();

  // Normalize mastered & recommended fields
  const mastered = Array.isArray(studentData.mastered)
    ? studentData.mastered.map((m) => (typeof m === "object" ? m.id : m))
    : [];
  let recommended = Array.isArray(studentData.recommended)
    ? studentData.recommended.map((r) => (typeof r === "object" ? r.id : r))
    : [];

  // Fetch all topics
  const topicsSnap = await db.collection("topics").get();
  const allTopics = topicsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // For each topic, check if all prerequisites are mastered
  for (const topic of allTopics) {
    const prereqs = Array.isArray(topic.prerequisites) ? topic.prerequisites : [];
    if (prereqs.includes(newlyMasteredTopicId)) {
      const allMet = prereqs.every((p) => mastered.includes(p));
      if (allMet && !recommended.includes(topic.id) && !mastered.includes(topic.id)) {
        recommended.push(topic.id);
        console.log(`🌟 Topic ${topic.id} is now recommended for ${studentId}`);
      }
    }
  }

  // Save updated recommended list
  await studentRef.update({ recommended });
}

// ------------------------------------------------
// 🔹 STUDENTS ROUTES
// ------------------------------------------------

// ✅ Get all students (teacher dashboard)
app.get("/students/list", async (req, res) => {
  try {
    const snapshot = await db.collection("students").get();
    const students = snapshot.docs.map((doc) => {
      const d = doc.data();
      const score = d.score ?? d.scores?.general ?? 0;
      const final = d.final ?? d.finals?.general ?? 100;
      const status = "";
      return { id: doc.id, name: d.name, gender: d.gender || "", score, final, status };
    });

    res.status(200).json({ students });
  } catch (err) {
    console.error("Error fetching students:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching students" });
  }
});

// ✅ Get single student info
app.get("/students/:id", async (req, res) => {
  try {
    const doc = await db.collection("students").doc(req.params.id).get();
    if (!doc.exists)
      return res.status(404).json({ message: "Student not found" });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Create or update student
app.post("/students/:id", async (req, res) => {
  try {
    const { name, gender, score, final, scores, finals } = req.body;
    const status = "";

    await db
      .collection("students")
      .doc(req.params.id)
      .set(
        {
          name,
          gender: gender || "",
          score,
          final,
          status,
          scores: scores || {},
          finals: finals || {},
          mastered: [],
          recommended: [],
          inProgress: [],
          upcoming: [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    res.status(200).json({ message: "Student saved successfully" });
  } catch (err) {
    console.error("Error saving student:", err);
    res.status(500).json({ error: "Server error while saving student" });
  }
});

app.delete("/students/:id", async (req, res) => {
  try {
    await db.collection("students").doc(req.params.id).delete();
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ────────────────── reports endpoints ──────────────────
app.get("/reports/class_summary", async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const topicsSnap = await db.collection("topics").get();
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const topics = topicsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // class metrics
    const totalStudents = students.length;
    const pass = students.filter(s => s.status === "PASS").length;
    const fail = totalStudents - pass;
    const preScores = students.map(s => Number(s.score ?? s.scores?.general ?? NaN)).filter(Number.isFinite);
    const postScores = students.map(s => Number(s.post ?? NaN)).filter(Number.isFinite);
    const avgPre = preScores.length ? preScores.reduce((a,b)=>a+b,0)/preScores.length : null;
    const avgPost = postScores.length ? postScores.reduce((a,b)=>a+b,0)/postScores.length : null;

    // topic stats
    const topicStats = topics.map(t => {
      let attempted = 0, mastered = 0;
      students.forEach(s => {
        if (s.scores && s.scores[t.id] != null) attempted++;
        if (Array.isArray(s.mastered) && s.mastered.includes(t.id)) mastered++;
      });
      return { id: t.id, name: t.name || t.title || t.id, attempted, mastered, difficulty: attempted ? (1 - mastered / attempted) : 1 };
    });

    res.json({ totalStudents, pass, fail, avgPre, avgPost, topicStats });
  } catch (err) {
    console.error("reports/class_summary", err);
    res.status(500).json({ error: "Failed to build class summary" });
  }
});

app.get("/reports/student/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await db.collection("students").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Student not found" });
    const s = doc.data();
    res.json({
      id,
      name: s.name,
      gender: s.gender,
      pre: s.score ?? null,
      post: s.post ?? null,
      improvementPercent: (s.score != null && s.post != null) ? ((s.post - s.score) / s.score) * 100 : null,
      mastered: s.mastered || [], scores: s.scores || {}, finals: s.finals || {}
    });
  } catch (err) {
    console.error("reports/student", err);
    res.status(500).json({ error: "Failed to build student report" });
  }
});

app.get("/reports/topics", async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const topicsSnap = await db.collection("topics").get();
    const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const topics = topicsSnap.docs.map(t => ({ id: t.id, ...t.data() }));

    const report = topics.map(t => {
      let attempted = 0, mastered = 0;
      students.forEach(s => {
        if (s.scores && s.scores[t.id] != null) attempted++;
        if (Array.isArray(s.mastered) && s.mastered.includes(t.id)) mastered++;
      });
      return { id: t.id, name: t.name || t.title || t.id, attempted, mastered, difficulty: attempted ? (1 - mastered / attempted) : 1 };
    });
    res.json(report);
  } catch (err) {
    console.error("reports/topics", err);
    res.status(500).json({ error: "Failed to build topics report" });
  }
});

// GET /reports/performance

app.get("/reports/performance", async (req, res) => {
  try {
    const [studentsSnap, topicsSnap, contentsSnap, assessmentsSnap] = await Promise.all([
      db.collection("students").get(),
      db.collection("topics").get(),
      db.collection("contents").get(),
      db.collection("assessments").get(),
    ]);

    const topics = topicsSnap.docs.map(d => ({ id: d.id, name: d.data().name, ...d.data() }));
    const contents = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const topicsMap = Object.fromEntries(topics.map(t => [t.id, t]));

    const subsSnap = await db.collection("assessment_submissions").get();

    // build map: studentId -> { attempts, lastScore, lastAttemptedAt, perTopic }
    const subsByStudent = {};
    subsSnap.docs.forEach(doc => {
      const d = doc.data();
      const sid = d.student_id;
      if (!sid) return; // defensive: skip malformed submissions

      if (!subsByStudent[sid]) subsByStudent[sid] = { attempts: 0, lastScore: null, lastAttemptedAt: null, perTopic: {} };
      subsByStudent[sid].attempts += 1;

      // normalize attempted_at names (your submissions use attempted_at)
      const attemptedAt = d.attempted_at || d.attemptedAt || null;
      if (!subsByStudent[sid].lastAttemptedAt || (attemptedAt && new Date(attemptedAt) > new Date(subsByStudent[sid].lastAttemptedAt))) {
        subsByStudent[sid].lastAttemptedAt = attemptedAt;
        subsByStudent[sid].lastScore = (typeof d.score === "number") ? d.score : (d.score ?? null);
      }

      // per-topic summary: keep highest score per topic
      const tid = d.topic_id || d.topicId || null;
      if (tid) {
        subsByStudent[sid].perTopic[tid] = Math.max(subsByStudent[sid].perTopic[tid] || 0, Number(d.score ?? 0));
      }
    });

    // Build a per-student map of attempted topic IDs from submissions (synthesized topic_progress)
    const synthesizedTopicProgress = {}; // studentId -> { topicId: { attempts: n, last_attempted_at, last_score } }

    subsSnap.docs.forEach(doc => {
      const d = doc.data();
      const sid = d.student_id;
      if (!sid) return;
      const tid = d.topic_id || d.topicId || null;
      if (!tid) return;

      if (!synthesizedTopicProgress[sid]) synthesizedTopicProgress[sid] = {};
      if (!synthesizedTopicProgress[sid][tid]) synthesizedTopicProgress[sid][tid] = { attempts: 0, last_attempted_at: null, last_score: null };

      synthesizedTopicProgress[sid][tid].attempts += 1;

      const attemptedAt = d.attempted_at || d.attemptedAt || null;
      if (!synthesizedTopicProgress[sid][tid].last_attempted_at || (attemptedAt && new Date(attemptedAt) > new Date(synthesizedTopicProgress[sid][tid].last_attempted_at))) {
        synthesizedTopicProgress[sid][tid].last_attempted_at = attemptedAt;
        synthesizedTopicProgress[sid][tid].last_score = (typeof d.score === "number") ? d.score : (d.score ?? null);
      }
    });

    // Now build students array with attempts + progress heuristic
    const students = [];
    studentsSnap.forEach(doc => {
      const d = doc.data();
      const score = d.score ?? d.scores?.general ?? 0;
      const final = d.final ?? d.finals?.general ?? 100;
      const status = Number(score) >= Number(final) * 0.5 ? "PASS" : "FAIL";

      const mastered = Array.isArray(d.mastered) ? d.mastered : [];
      const recommended = Array.isArray(d.recommended) ? d.recommended : [];

      const sid = doc.id;
      const subs = subsByStudent[sid] || { attempts: 0, lastScore: null, perTopic: {} };

      // Progress heuristic — choose the most meaningful available metric
      let progress = null;
      if (typeof d.progress === "number") {
        progress = Math.round(d.progress);
      } else if (d.masteryScore && typeof d.masteryScore === "number") {
        // backend might expose 0-1 masteryScore
        progress = d.masteryScore <= 1 ? Math.round(d.masteryScore * 100) : Math.round(d.masteryScore);
      } else if (d.topic_progress && typeof d.topic_progress === "object") {
        const tp = d.topic_progress;
        const totalTp = Object.keys(tp).length || 0;
        if (totalTp > 0) {
          const done = Object.values(tp).filter(x => x && x.completed).length;
          progress = Math.round((done / totalTp) * 100);
        }
      } else if (Object.keys(subs.perTopic || {}).length) {
        const vals = Object.values(subs.perTopic).map(v => Number(v || 0));
        progress = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0) / vals.length) : null;
      } else if (Array.isArray(d.mastered) && topics.length) {
        progress = Math.round((d.mastered.length / topics.length) * 100);
      }
      if (progress === null) progress = 0;

      students.push({
        id: sid,
        name: d.name || "",
        gender: d.gender || "",
        score,
        final,
        status,
        masteredCount: mastered.length,
        recommendedCount: recommended.length,
        mastered,
        recommended,
        progress,
        attempts: subs.attempts || 0,
        lastScore: subs.lastScore ?? null,
        topic_progress: d.topic_progress ?? undefined,
        email: d.email ?? undefined,
      });
    });

    // Provide assessments list for the frontend
    const assessments = assessmentsSnap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || d.assessment_id || `${d.topic_id}_assessment`,
        topic_id: d.topic_id || null,
        dueDate: d.due_date || d.dueDate || null,
        // include passing_score if available
        passing_score: d.passing_score ?? d.passingScore ?? null,
      };
    });

    // Example topic aggregates (same as before)
    const topicStats = topics.map(t => {
      const totalMaterials = contents.filter(c => c.topic_id === t.id).length;
      return {
        id: t.id,
        name: t.name || t.title || t.id,
        totalMaterials,
        avgScore: null,
        masteryRate: null
      };
    });

    res.json({ students, topics: topicStats, assessments });
  } catch (err) {
    console.error("reports/performance error", err);
    res.status(500).json({ error: "Failed to build report" });
  }
});

// Student learning path (used by StudentDashboard)
app.get("/students/:id/path", async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentDoc = await db.collection("students").doc(studentId).get();
    if (!studentDoc.exists) {
      return res.status(404).json({
        student_id: studentId,
        mastered_ids: [],
        mastered: [],
        recommended_ids: [],
        recommended: [],
        inProgress: [],
        upcoming: [],
        error: "Student not found",
      });
    }

    const studentData = studentDoc.data() || {};

    // Normalise mastered ids (explicit list first, else try compute from scores/finals)
    let masteredIds = Array.isArray(studentData.mastered) ? [...studentData.mastered] : [];

    // fallback compute if explicit mastered empty
    if (!masteredIds.length && studentData.scores) {
      const scores = studentData.scores || {};
      const finals = studentData.finals || {};
      const globalFinal = studentData.final || 0;
      for (const [tid, scRaw] of Object.entries(scores)) {
        const sc = Number(scRaw);
        const maxSc = Number(finals[tid] ?? globalFinal ?? 0);
        if (maxSc && sc >= (maxSc * 0.5)) {
          if (!masteredIds.includes(tid)) masteredIds.push(tid);
        }
      }
    }

    // fetch all topics and build id -> data map
    const topicsSnap = await db.collection("topics").get();
    const allTopics = topicsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const idToData = {};
    allTopics.forEach((t) => {
      idToData[t.id] = {
        id: t.id,
        title: t.name || t.title || t.id,
        description: t.description || "",
        cluster: t.cluster || "Uncategorized",
        prerequisites: Array.isArray(t.prerequisites) ? t.prerequisites : [],
      };
    });

    // Build mastered detailed array (preserve original order)
    const masteredDetailed = masteredIds
      .filter((id) => idToData[id]) // only include known topics
      .map((id) => idToData[id]);

    // Compute recommended: any topic whose all prerequisites are in masteredIds
    // and that is not already mastered.
    const recommendedCandidates = allTopics.filter((t) => {
      const prereqs = Array.isArray(t.prerequisites) ? t.prerequisites : [];

      // If already mastered -> not recommended
      if (masteredIds.includes(t.id)) return false;

      // If no prereqs -> recommend (first-start topics)
      if (!prereqs.length) return true;

      // otherwise require every prereq to be mastered
      return prereqs.every((p) => masteredIds.includes(p));
    });

    // Convert to id array + detailed array
    const recommendedIds = recommendedCandidates.map((t) => t.id);
    const recommendedDetailed = recommendedCandidates.map((t) => idToData[t.id]);

    res.status(200).json({
      student_id: studentId,
      mastered_ids: masteredIds,
      mastered: masteredDetailed,
      recommended_ids: recommendedIds,
      recommended: recommendedDetailed,
      inProgress: Array.isArray(studentData.inProgress) ? studentData.inProgress : [],
      upcoming: Array.isArray(studentData.upcoming) ? studentData.upcoming : [],
    });
  } catch (err) {
    console.error("Error building student path:", err);
    res.status(500).json({
      mastered_ids: [],
      mastered: [],
      recommended_ids: [],
      recommended: [],
      inProgress: [],
      upcoming: [],
      error: "Internal Server Error",
    });
  }
});

app.get("/reports/student/:id/attempts", async (req, res) => {
  try {
    const studentId = req.params.id;

    // Query both common variants of the field name to maximize chance of finding docs
    const [snap1, snap2] = await Promise.all([
      db.collection("assessment_submissions").where("student_id", "==", studentId).get().catch(() => ({ docs: [] })),
      db.collection("assessment_submissions").where("studentId", "==", studentId).get().catch(() => ({ docs: [] })),
    ]);

    // Collect docs, dedupe by doc.id
    const docsMap = new Map();
    [...(snap1.docs || []), ...(snap2.docs || [])].forEach(d => docsMap.set(d.id, d));

    const attempts = Array.from(docsMap.values()).map(d => {
      const dd = d.data();

      // robust normalization for attempt number
      const attemptNumber = dd.attempt_number ?? dd.attemptNumber ?? dd.attempt ?? dd.attempt_no ?? null;

      // robust normalization for attempted timestamp
      const attemptedAt = dd.attempted_at ?? dd.attemptedAt ?? dd.attempted ?? dd.createdAt ?? dd.created_at ?? null;

      // topic/assessment id variants
      const topicId = dd.topic_id ?? dd.topicId ?? null;
      const assessmentId = dd.assessment_id ?? dd.assessmentId ?? dd.assessment ?? null;

      const items = Array.isArray(dd.items) ? dd.items : [];

      // compute earned / total points (best-effort)
      const earnedPoints = items.reduce((acc, it) => acc + (Number(it.points_awarded || 0)), 0);
      const totalPoints = items.length
        ? items.reduce((acc, it) => acc + ((Number(it.points_possible) || (it.points_awarded != null ? 1 : 1))), 0)
        : (dd.totalPoints ?? 0);

      // normalize score
      const score = (typeof dd.score === "number") ? dd.score : (dd.score ?? null);

      return {
        id: d.id,
        assessment_id: assessmentId,
        assessmentTitle: assessmentId ?? topicId ?? null,
        topic_id: topicId,
        score,
        passed: !!dd.passed,
        attempt_number: attemptNumber,
        attempted_at: attemptedAt,
        items,
        earnedPoints,
        totalPoints,
        raw: dd,
      };
    });

    // sort by best timestamp available (attempted_at), fallback to attempt_number desc, fallback to doc id
    attempts.sort((a, b) => {
      const ta = a.attempted_at ? new Date(a.attempted_at).getTime() : (a.attempt_number ?? 0);
      const tb = b.attempted_at ? new Date(b.attempted_at).getTime() : (b.attempt_number ?? 0);
      return tb - ta;
    });

    return res.status(200).json({ attempts });
  } catch (err) {
    console.error("reports/student/:id/attempts", err);
    return res.status(500).json({ error: "Failed to fetch attempts" });
  }
});

app.get("/reports/assessment/:assessmentId/item-analysis", async (req, res) => {
  try {
    const assessmentId = req.params.assessmentId;

    // Find submissions for this assessment_id
    const subSnap = await db.collection("assessment_submissions")
      .where("assessment_id", "==", assessmentId)
      .get();

    if (subSnap.empty) {
      return res.status(200).json({ items: [] });
    }

    // Gather per-question stats
    const itemStats = {}; // questionId -> { correctCount, total, texts: Set() }
    subSnap.docs.forEach(doc => {
      const dd = doc.data();
      const items = Array.isArray(dd.items) ? dd.items : [];
      items.forEach(it => {
        const qid = it.question_id;
        if (!itemStats[qid]) itemStats[qid] = { correctCount: 0, total: 0, texts: new Set(), times: [] };
        itemStats[qid].total += 1;
        if (it.is_correct) itemStats[qid].correctCount += 1;
        if (it.question_text) itemStats[qid].texts.add(it.question_text);
        if (typeof it.timeSpent === "number") itemStats[qid].times.push(it.timeSpent);
      });
    });

    // Format response
    const items = Object.entries(itemStats).map(([qid, st]) => {
      const correctPercent = st.total ? (st.correctCount / st.total) * 100 : 0;
      const avgTime = st.times.length ? Math.round(st.times.reduce((a,b)=>a+b,0)/st.times.length) : null;
      return {
        questionId: qid,
        text: Array.from(st.texts)[0] || null,
        shortText: (Array.from(st.texts)[0] || "").slice(0, 120),
        totalAttempts: st.total,
        correctCount: st.correctCount,
        correctPercent,
        pValue: correctPercent / 100, // p-value equivalent (0-1)
        avgTimeSeconds: avgTime,
      };
    });

    // Sort by ascending correctPercent so low-performing items come first
    items.sort((a,b) => (a.correctPercent || 0) - (b.correctPercent || 0));

    res.status(200).json({ items });
  } catch (err) {
    console.error("reports/assessment/:assessmentId/item-analysis", err);
    res.status(500).json({ error: "Failed to compute item analysis" });
  }
});

app.post("/teachers/assign-remediation", async (req, res) => {
  try {
    const { studentId, assessmentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "studentId is required" });

    const payload = {
      studentId,
      assessmentId: assessmentId || null,
      createdAt: new Date().toISOString(),
      createdBy: req.body.createdBy || "teacher-ui",
      status: "assigned",
    };

    const docRef = await db.collection("remediations").add(payload);
    res.status(200).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("POST /teachers/assign-remediation", err);
    res.status(500).json({ error: "Failed to assign remediation" });
  }
});

// ------------------------------------------------
// 🔹 TOPICS ROUTES
// ------------------------------------------------

// ✅ Get all topics
app.get("/topics/list", async (req, res) => {
  try {
    const snapshot = await db.collection("topics").get();
    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(topics); // return pure array
  } catch (err) {
    console.error("Error fetching topics:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Topic graph for visualization (DAG With Levels)
app.get("/topics/graph", async (req, res) => {
  try {
    const snapshot = await db.collection("topics").get();

    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Build adjacency & indegree
    const indegree = {};
    const prereqMap = {};

    topics.forEach((t) => {
      indegree[t.id] = 0;
      prereqMap[t.id] = Array.isArray(t.prerequisites)
        ? t.prerequisites
        : [];
    });

    // Count indegree
    topics.forEach((t) => {
      prereqMap[t.id].forEach((p) => {
        indegree[t.id] = (indegree[t.id] || 0) + 1;
      });
    });

    // Topological level calculation
    const level = {};
    const queue = [];

    // Start with topics that have NO prerequisites
    topics.forEach((t) => {
      if (indegree[t.id] === 0) {
        level[t.id] = 0;
        queue.push(t.id);
      }
    });

    while (queue.length) {
      const curr = queue.shift();
      const currLevel = level[curr];

      // For each topic that lists curr as a prerequisite
      topics.forEach((t) => {
        if (prereqMap[t.id].includes(curr)) {
          indegree[t.id]--;

          if (indegree[t.id] === 0) {
            level[t.id] = currLevel + 1;
            queue.push(t.id);
          }
        }
      });
    }

    // Build nodes with level
    const nodes = topics.map((t) => ({
      id: t.id,
      title: t.name || t.title || t.id,
      description: t.description || "",
      level: level[t.id] ?? 0,
    }));

    // Build edges
    const edges = [];
    topics.forEach((t) => {
      (t.prerequisites || []).forEach((p) => {
        edges.push([p, t.id]); // p → t
      });
    });

    res.json({ nodes, edges });

  } catch (err) {
    console.error("Error generating topic graph:", err);
    res.status(500).json({ error: "Failed to build topic graph" });
  }
});

// ✅ Mark content as seen for a student
app.post("/students/:id/content_seen", async (req, res) => {
  try {
    const { id } = req.params;
    const { content_id } = req.body;

    if (!content_id)
      return res.status(400).json({ error: "content_id is required" });

    const studentRef = db.collection("students").doc(id);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists)
      return res.status(404).json({ error: "Student not found" });

    const studentData = studentDoc.data();
    const seen = Array.isArray(studentData.content_seen)
      ? [...studentData.content_seen]
      : [];

    // Add content_id if not already seen
    if (!seen.includes(content_id)) {
      seen.push(content_id);
      await studentRef.update({ content_seen: seen });
    }

    // ✅ Step 1: Get content info (to know which topic it belongs to)
    const contentDoc = await db.collection("contents").doc(content_id).get();
    if (contentDoc.exists) {
      const { topic_id } = contentDoc.data();

      // ✅ Step 2: Get all contents under this topic
      const topicContentsSnap = await db
        .collection("contents")
        .where("topic_id", "==", topic_id)
        .get();
      const topicContentIds = topicContentsSnap.docs.map((d) => d.id);

      // ✅ Step 3: Reload latest student data
      const updatedStudentSnap = await studentRef.get();
      const updatedData = updatedStudentSnap.data();
      const updatedSeen = Array.isArray(updatedData.content_seen)
        ? updatedData.content_seen
        : [];

      // ✅ Step 4: Check if all contents for this topic are viewed
      const allSeen = topicContentIds.every((cid) => updatedSeen.includes(cid));

      // ✅ Step 5: Normalize mastered to simple string IDs
      let mastered = Array.isArray(updatedData.mastered)
        ? updatedData.mastered.map((m) => (typeof m === "object" ? m.id : m))
        : [];

      // ✅ Step 6: If all contents are seen, promote to mastered
      if (allSeen && !mastered.includes(topic_id)) {
        mastered.push(topic_id);
        await studentRef.update({ mastered });
        console.log(`✅ Topic ${topic_id} mastered by ${id}`);

        // 🔄 Automatically recommend dependent topics
        await updateRecommendedAfterMastered(id, topic_id);
      }

      // ✅ Return fresh data
      const refreshedDoc = await studentRef.get();
      const refreshed = refreshedDoc.data();

      res.status(200).json({
        success: true,
        content_seen: refreshed.content_seen || [],
        mastered: refreshed.mastered || [],
      });
    }

    // ✅ Respond with updated content_seen (and optionally mastered)
    const updatedDoc = await studentRef.get();
    const updatedData = updatedDoc.data();

    res.status(200).json({
      success: true,
      content_seen: updatedData.content_seen || [],
      mastered: updatedData.mastered || [],
    });
  } catch (err) {
    console.error("Error updating content_seen:", err);
    res.status(500).json({ error: "Failed to update content_seen" });
  }
});

// ✅ Manually force a topic to Mastered (for fixing stale cards)
app.post("/students/:id/master_topic", async (req, res) => {
  try {
    const { id } = req.params;
    const { topic_id } = req.body;

    if (!topic_id) {
      return res.status(400).json({ error: "topic_id is required" });
    }

    const studentRef = db.collection("students").doc(id);
    const studentDoc = await studentRef.get();
    if (!studentDoc.exists) {
      return res.status(404).json({ error: "Student not found" });
    }

    const studentData = studentDoc.data();
    let mastered = Array.isArray(studentData.mastered)
      ? studentData.mastered.map((m) => (typeof m === "object" ? m.id : m))
      : [];

    if (!mastered.includes(topic_id)) {
      mastered.push(topic_id);
      await studentRef.update({ mastered });
      console.log(`✅ Manually marked topic ${topic_id} as mastered for ${id}`);
    }

    // 🔄 Update dependent topics as recommended
    await updateRecommendedAfterMastered(id, topic_id);

    const updated = (await studentRef.get()).data();
    res.status(200).json({
      success: true,
      mastered: updated.mastered || [],
      recommended: updated.recommended || [],
    });
  } catch (err) {
    console.error("Error manually mastering topic:", err);
    res.status(500).json({ error: "Failed to manually master topic" });
  }
});

// ✅ Delete topic and its contents
app.delete("/topics/:id", async (req, res) => {
  try {
    const topicId = req.params.id;
    const contentsSnap = await db
      .collection("contents")
      .where("topic_id", "==", topicId)
      .get();

    const batch = db.batch();
    contentsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    await db.collection("topics").doc(topicId).delete();
    res
      .status(200)
      .json({ message: "Topic and related contents deleted successfully" });
  } catch (err) {
    console.error("Error deleting topic:", err);
    res.status(500).json({ message: "Server error while deleting topic" });
  }
});

// ------------------------------------------------
// 🔹 CONTENT ROUTES
// ------------------------------------------------

// ✅ Get ALL contents
app.get("/content", async (req, res) => {
  try {
    const snapshot = await db.collection("contents").get();

    if (snapshot.empty) {
      console.log("No contents found in Firestore.");
      return res.status(200).json([]);
    }

    const contents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(contents);
  } catch (err) {
    console.error("Error fetching contents:", err);
    res.status(500).json({ error: "Server error while fetching contents" });
  }
});

// ✅ Get contents by topic ID
app.get("/content/:topicId", async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const snapshot = await db
      .collection("contents")
      .where("topic_id", "==", topicId)
      .get();

    if (snapshot.empty) {
      console.log(`No contents found for topic_id ${topicId}`);
      return res.status(200).json([]); // ✅ Always return array
    }

    const contents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Fetched ${contents.length} contents for ${topicId}`);
    res.status(200).json(contents);
  } catch (err) {
    console.error("Error fetching topic contents:", err);
    res.status(500).json({ error: "Server error while fetching topic contents" });
  }
});

// ✅ Add new content
app.post("/content", async (req, res) => {
  try {
    const { topic_id, title, description, link, type, created_by } = req.body;
    if (!topic_id || !link) {
      return res.status(400).json({ error: "Missing topic_id or link" });
    }

    const newDoc = await db.collection("contents").add({
      topic_id,
      title: title || "Untitled",
      description: description || "",
      link,
      type: type || "video",
      created_by: created_by || "teacher",
      createdAt: new Date().toISOString(),
    });

    console.log("Added content:", newDoc.id);
    res.status(200).json({ id: newDoc.id, message: "Content added successfully" });
  } catch (err) {
    console.error("Error adding content:", err);
    res.status(500).json({ error: "Server error while adding content" });
  }
});

// ✅ Update content
app.post("/content/:id", async (req, res) => {
  try {
    const { link, type, description } = req.body;
    await db.collection("contents").doc(req.params.id).set(
      {
        link,
        type,
        description,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    res.status(200).json({ message: "Content updated successfully" });
  } catch (err) {
    console.error("Error updating content:", err);
    res.status(500).json({ error: "Server error while updating content" });
  }
});

// ✅ Delete content by ID
app.delete("/content/:id", async (req, res) => {
  try {
    await db.collection("contents").doc(req.params.id).delete();
    res.status(200).json({ message: "Content deleted successfully" });
  } catch (err) {
    console.error("Error deleting content:", err);
    res.status(500).json({ error: "Server error while deleting content" });
  }
});

// ========== ASSESSMENTS (Teacher create/update + Student submit) ==========
/**
 * GET /assessments/:topicId
 * returns assessment for topic (if exists)
 */
app.get("/assessments/:topicId", async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const docId = `${topicId}_assessment`;
    const doc = await db.collection("assessments").doc(docId).get();
    if (!doc.exists) return res.status(404).json({ error: "Assessment not found" });
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /assessments/:topicId", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /assessments
 * body: { topic_id, title, instructions, passing_score, questions: [...] }
 * Creates or updates assessment with deterministic id `${topic_id}_assessment`
 */
app.post("/assessments", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.topic_id || !Array.isArray(payload.questions)) {
      return res.status(400).json({ error: "topic_id and questions[] required" });
    }
    const docId = `${payload.topic_id}_assessment`;
    const now = new Date().toISOString();
    const docData = {
      ...payload,
      assessment_id: docId,
      updated_at: now,
      created_at: payload.created_at || now,
    };
    await db.collection("assessments").doc(docId).set(docData, { merge: true });
    return res.json({ success: true, id: docId });
  } catch (err) {
    console.error("POST /assessments", err);
    return res.status(500).json({ error: "Failed to save assessment" });
  }
});

/**
 * POST /assessments/:topicId/submit
 * body: { student_id, answers: [{question_id, student_answer}, ...] }
 * Grades submission, stores it, updates student's topic_progress and mastered (atomic).
 */
app.post("/assessments/:topicId/submit", async (req, res) => {
  try {
    const { topicId } = req.params;
    const { student_id, answers } = req.body;
    if (!student_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: "student_id and answers[] required" });
    }

    // load assessment
    const docId = `${topicId}_assessment`;
    const docSnap = await db.collection("assessments").doc(docId).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Assessment not found" });
    const assessment = docSnap.data();

    // ---------- count prior attempts (deterministic) ----------
    const priorSnap = await db.collection("assessment_submissions")
      .where("topic_id", "==", topicId)
      .where("student_id", "==", student_id)
      .get();
    const priorAttempts = priorSnap.size || 0;
    const attempts = priorAttempts + 1;

    // ---------- grade ----------
    const items = assessment.questions.map((q) => {
      const ansObj = answers.find(a => a.question_id === q.question_id);
      const studentAnswer = ansObj ? ansObj.student_answer : null;
      let isCorrect = false;

      if (q.type === "multiple_choice" || q.type === "short_answer") {
        isCorrect = studentAnswer != null && String(studentAnswer).trim() === String(q.answer).trim();
      } else if (q.type === "ordering" || q.type === "drag_sort") {
        isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(q.correct_order || q.answer);
      } else if (q.type === "numeric") {
        isCorrect = Number(studentAnswer) === Number(q.answer);
      } else {
        isCorrect = String(studentAnswer || "") === String(q.answer || "");
      }

      return {
        question_id: q.question_id,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        points_awarded: isCorrect ? (q.points ?? 1) : 0
      };
    });

    const totalPoints = assessment.questions.reduce((s, q) => s + (q.points ?? 1), 0);
    const earned = items.reduce((s, it) => s + (it.points_awarded || 0), 0);
    const score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
    const passed = score >= (assessment.passing_score ?? 70);

    // ---------- save submission (always) ----------
    const submission = {
      assessment_id: docId,
      topic_id: topicId,
      student_id,
      items,
      score,
      passed,
      attempted_at: new Date().toISOString(),
      attempt_number: attempts
    };
    await db.collection("assessment_submissions").add(submission);

    // ---------- update student topic_progress and mastered/lock atomically using a transaction ----------
    const studentRef = db.collection("students").doc(student_id);

    // We'll use a transaction so we both set topic_progress and mastered in one atomic operation
    const result = await db.runTransaction(async (tx) => {
      const studentDoc = await tx.get(studentRef);
      const sd = studentDoc.exists ? studentDoc.data() : {};

      const existingTP = sd.topic_progress || {};
      const tpForTopic = {
        ...(existingTP[topicId] || {}),
        attempts: attempts,
        last_score: score,
        last_attempted_at: new Date().toISOString(),
        passed: passed
      };

      const shouldLock = passed || attempts >= 3;
      if (shouldLock) {
        tpForTopic.completed = true;
        tpForTopic.locked = true;
        if (passed) tpForTopic.passed_at = new Date().toISOString();
      }

      // prepare new topic_progress map
      const newTopicProgress = {
        ...existingTP,
        [topicId]: tpForTopic
      };

      // prepare mastered list (preserve existing)
      let mastered = Array.isArray(sd.mastered) ? sd.mastered.map(m => (typeof m === "object" ? m.id : m)) : [];
      let masteredAdded = false;
      if (shouldLock && !mastered.includes(topicId)) {
        mastered.push(topicId);
        masteredAdded = true;
      }

      // write both pieces in transaction
      tx.set(studentRef, { topic_progress: newTopicProgress, mastered }, { merge: true });

      return { shouldLock, masteredAdded };
    });

    // Attempt recommended update if we just mastered a topic (non-blocking)
    if (result.shouldLock) {
      try {
        await updateRecommendedAfterMastered(student_id, topicId);
      } catch (err) {
        console.error("Non-fatal: updateRecommendedAfterMastered failed:", err);
      }
      console.log(`✅ Student ${student_id} mastered ${topicId} (passed: ${passed}, attempts: ${attempts})`);
    } else {
      console.log(`ℹ️ Submission for ${student_id} on ${topicId}: score=${score}, passed=${passed}, attempts=${attempts}`);
    }

    // ---------- respond with authoritative fields so frontend can immediately lock UI ----------
    return res.status(200).json({
      success: true,
      score,
      passed,
      attempts,
      mastered: !!result.shouldLock
    });

  } catch (err) {
    console.error("POST /assessments/:topicId/submit", err);
    // Return 500 with a clear message; frontend fallback will re-check student doc.
    return res.status(500).json({ error: "Server error while submitting. Your attempt may still be recorded." });
  }
});

/**
 * GET /assessments/:topicId/submission/:studentId
 * returns latest submission for that student & topic (optional)
 */
app.get("/assessments/:topicId/submission/:studentId", async (req, res) => {
  try {
    const { topicId, studentId } = req.params;
    const snap = await db.collection("assessment_submissions")
      .where("topic_id", "==", topicId)
      .where("student_id", "==", studentId)
      .orderBy("attempted_at", "desc")
      .limit(1)
      .get();
    if (snap.empty) return res.status(404).json({ found: false });
    const doc = snap.docs[0];
    return res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET submission", err);
    return res.status(500).json({ error: "Failed to get submission" });
  }
});

// ------------------------------------------------
// 🔹 TEACHER SUMMARY & LOGIN
// ------------------------------------------------

// ✅ Teacher dashboard summary
app.get("/teacher/summary", async (req, res) => {
  try {
    const studentsSnap = await db.collection("students").get();
    const topicsSnap = await db.collection("topics").get();

    const totalStudents = studentsSnap.size;
    let pass = 0,
      fail = 0;

    studentsSnap.forEach((doc) => {
      const data = doc.data();
      const score = data.score ?? data.scores?.general ?? 0;
      const final = data.final ?? data.finals?.general ?? 100;
      if (Number(score) >= Number(final) * 0.5) pass++;
      else fail++;
    });

    res.status(200).json({
      students_total: totalStudents,
      students_pass: pass,
      students_fail: fail,
      topic_count: topicsSnap.size,
    });
  } catch (err) {
    console.error("Error generating summary:", err);
    res.status(500).json({ message: "Server error while generating summary" });
  }
});

// ✅ Unified login route
app.post("/login", async (req, res) => {
  const { id } = req.body;

  try {
    const teacherDoc = await db.collection("users").doc(id).get();
    if (teacherDoc.exists) {
      return res.status(200).json({
        id,
        role: "teacher",
        ...teacherDoc.data(),
      });
    }

    const studentDoc = await db.collection("students").doc(id).get();
    if (studentDoc.exists) {
      return res.status(200).json({
        id,
        role: "student",
        ...studentDoc.data(),
      });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

app.post("/send-feedback", async (req, res) => {
  try {
    const { type, message } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.FEEDBACK_RECEIVER,
      subject: `PaGe Teacher Feedback (${new Date().toISOString()})`,
      text: message,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Feedback sent!" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

app.post("/feedback/student", async (req, res) => {
  try {
    const { studentId, type, message } = req.body;

    if (!studentId || !type || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const studentDoc = await db.collection("students").doc(studentId).get();
    const studentData = studentDoc.exists ? studentDoc.data() : null;

    await db.collection("feedback").add({
      role: "student",
      studentId,
      studentName: studentData?.name || "Unknown Student",
      type,
      message,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error saving student feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

app.get("/feedback/all", async (req, res) => {
  try {
    const snap = await db
      .collection("feedback")
      .orderBy("createdAt", "desc")
      .get();

    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(all);

  } catch (err) {
    console.error("🔥 Error fetching feedback:", err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// ------------------------------------------------
// 🔹 SERVER START
// ------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
