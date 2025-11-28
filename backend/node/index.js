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
// Returns:
// {
//   students: [{ id, name, gender, score, final, status, masteryCount, recommendedCount }],
//   topics: [{ id, name, avgScore, masteryRate, totalMaterials }],
//   byTopicScores: { topicId: { studentId: score, ... }, ... }  // optional
// }

app.get("/reports/performance", async (req, res) => {
  try {
    const [studentsSnap, topicsSnap, contentsSnap] = await Promise.all([
      db.collection("students").get(),
      db.collection("topics").get(),
      db.collection("contents").get(),
    ]);

    const topics = topicsSnap.docs.map(d => ({ id: d.id, name: d.data().name, ...d.data() }));
    const contents = contentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const topicsMap = Object.fromEntries(topics.map(t => [t.id, t]));

    const students = [];
    studentsSnap.forEach(doc => {
      const d = doc.data();
      const score = d.score ?? d.scores?.general ?? 0;
      const final = d.final ?? d.finals?.general ?? 100;
      const status = Number(score) >= Number(final) * 0.5 ? "PASS" : "FAIL";
      const mastered = Array.isArray(d.mastered) ? d.mastered : [];
      const recommended = Array.isArray(d.recommended) ? d.recommended : [];
      students.push({
        id: doc.id,
        name: d.name || "",
        gender: d.gender || "",
        score,
        final,
        status,
        masteredCount: mastered.length,
        recommendedCount: recommended.length,
        mastered,
        recommended
      });
    });

    // Example topic aggregates (avg score placeholder logic)
    const topicStats = topics.map(t => {
      // naive: compute average using contents -> cannot derive per-topic test scores without more data;
      // for now count materials + placeholder metrics
      const totalMaterials = contents.filter(c => c.topic_id === t.id).length;
      return {
        id: t.id,
        name: t.name || t.title || t.id,
        totalMaterials,
        // avgScore and masteryRate require more detailed per-student-per-topic scores (extend if you have a 'scores' map).
        avgScore: null,
        masteryRate: null
      };
    });

    res.json({ students, topics: topicStats });
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
 * Grades submission, stores it, updates master's list if passed or after 3 attempts.
 */
app.post("/assessments/:topicId/submit", async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const { student_id, answers } = req.body;
    if (!student_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: "student_id and answers[] required" });
    }

    const docId = `${topicId}_assessment`;
    const docSnap = await db.collection("assessments").doc(docId).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Assessment not found" });
    const assessment = docSnap.data();

    // COUNT prior attempts (deterministic)
    const priorSnap = await db.collection("assessment_submissions")
      .where("topic_id", "==", topicId)
      .where("student_id", "==", student_id)
      .get();
    const priorAttempts = priorSnap.size || 0;
    const attemptNumber = priorAttempts + 1;

    // GRADE
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

    // Save submission (non-transactional add is ok here)
    const submission = {
      assessment_id: docId,
      topic_id: topicId,
      student_id,
      items,
      score,
      passed,
      attempted_at: new Date().toISOString(),
      attempt_number: attemptNumber
    };
    await db.collection("assessment_submissions").add(submission);

    // Now atomically update student.topic_progress and mastered using a transaction
    const studentRef = db.collection("students").doc(student_id);
    await db.runTransaction(async (tx) => {
      const sdSnap = await tx.get(studentRef);
      const sd = sdSnap.exists ? sdSnap.data() : {};

      const existingTP = sd.topic_progress || {};
      const tpForTopic = {
        ...(existingTP[topicId] || {}),
        attempts: attemptNumber,
        last_score: score,
        last_attempted_at: new Date().toISOString(),
        passed: passed
      };

      const shouldLockOrMaster = passed || attemptNumber >= 3;
      if (shouldLockOrMaster) {
        tpForTopic.completed = true;
        tpForTopic.locked = true;
        tpForTopic.passed_at = passed ? new Date().toISOString() : undefined;
      }

      // prepare updated topic_progress
      const newTopicProgress = {
        ...existingTP,
        [topicId]: tpForTopic
      };

      // update mastered array if needed
      const mastered = Array.isArray(sd.mastered) ? sd.mastered.map(m => (typeof m === "object" ? m.id : m)) : [];
      let masteredAdded = false;
      if (shouldLockOrMaster && !mastered.includes(topicId)) {
        mastered.push(topicId);
        masteredAdded = true;
      }

      // Commit the two fields atomically
      tx.set(studentRef, { topic_progress: newTopicProgress, mastered }, { merge: true });
    });

    // Trigger recommendations (best effort)
    try { await updateRecommendedAfterMastered(student_id, topicId); } catch (e) { console.error("recommendation failed:", e); }

    // Respond with authoritative info
    return res.status(200).json({
      success: true,
      score,
      passed,
      attempts: attemptNumber,
      attempt_number: attemptNumber,
      mastered: (passed || attemptNumber >= 3)
    });
  } catch (err) {
    console.error("POST /assessments/:topicId/submit", err);
    // return a 200-shaped response so frontend still shows score but flag failure
    return res.status(200).json({ success: false, error: "Server error while submitting. Attempt may be recorded." });
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
