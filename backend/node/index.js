const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();
app.use(express.json());

// Example route: fetch student by ID
app.get('/students/:id', async (req, res) => {
  try {
    const doc = await db.collection('students').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).send("Not found");
    res.json(doc.data());
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

app.listen(3000, () => console.log("Node API running on http://localhost:3000"));

app.get('/recommendation/:studentId', async (req, res) => {
  const response = await fetch(`http://localhost:5000/recommend/${req.params.studentId}`);
  const data = await response.json();
  res.json(data);
});