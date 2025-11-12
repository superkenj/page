// index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// ---------------- Firebase Setup ----------------
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

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
      const status = Number(score) >= Number(final) * 0.5 ? "PASS" : "FAIL";
      return { id: doc.id, name: d.name, score, final, status };
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
    const { name, score, final, scores, finals } = req.body;
    const status = Number(score) >= Number(final) * 0.5 ? "PASS" : "FAIL";

    await db
      .collection("students")
      .doc(req.params.id)
      .set(
        {
          name,
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
      if (!prereqs.length) return false; // if no prereqs, don't recommend just because
      // require every prereq to be mastered
      return prereqs.every((p) => masteredIds.includes(p)) && !masteredIds.includes(t.id);
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

// ------------------------------------------------
// 🔹 SERVER START
// ------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
