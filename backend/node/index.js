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
      "https://pathgen.netlify.app", // your frontend (Netlify) domain
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

// ✅ Student learning path (used by StudentDashboard)
app.get("/students/:id/path", async (req, res) => {
  try {
    const studentId = req.params.id;
    const doc = await db.collection("students").doc(studentId).get();

    if (!doc.exists) {
      return res.status(404).json({
        mastered: [],
        recommended: [],
        inProgress: [],
        upcoming: [],
        error: "Student not found",
      });
    }

    const data = doc.data() || {};

    // Safely normalize
    const path = {
      mastered: Array.isArray(data.mastered) ? data.mastered : [],
      recommended: Array.isArray(data.recommended) ? data.recommended : [],
      inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
      upcoming: Array.isArray(data.upcoming) ? data.upcoming : [],
    };

    res.status(200).json(path);
  } catch (err) {
    console.error("Error fetching student path:", err);
    res.status(500).json({
      mastered: [],
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
