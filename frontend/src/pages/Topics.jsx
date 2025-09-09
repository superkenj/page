import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prereqCSV, setPrereqCSV] = useState("");

  const fetchTopics = async () => {
    const snap = await getDocs(collection(db, "topics"));
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setTopics(data);
  };

  useEffect(() => { fetchTopics(); }, []);

  const saveTopic = async (e) => {
    e.preventDefault();
    if (!id || !title) {
      alert("Topic ID and Title are required");
      return;
    }
    const prerequisites = prereqCSV
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    await setDoc(doc(db, "topics", id), {
      title,
      description,
      prerequisites, // array of topic IDs
    });

    setId(""); setTitle(""); setDescription(""); setPrereqCSV("");
    fetchTopics();
  };

  const removeTopic = async (topicId) => {
    if (!confirm(`Delete topic "${topicId}"?`)) return;
    await deleteDoc(doc(db, "topics", topicId));
    fetchTopics();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Manage Topics</h1>

      <form onSubmit={saveTopic} style={{
        display: "grid", gap: 8, maxWidth: 520,
        background: "#fff", padding: 16, borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 16
      }}>
        <input
          type="text" placeholder="Topic ID (e.g., fractions)"
          value={id} onChange={e => setId(e.target.value)}
        />
        <input
          type="text" placeholder="Title (e.g., Fractions)"
          value={title} onChange={e => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description} onChange={e => setDescription(e.target.value)}
          rows={3}
        />
        <input
          type="text"
          placeholder="Prerequisites (CSV, e.g., basic_arithmetic, division)"
          value={prereqCSV} onChange={e => setPrereqCSV(e.target.value)}
        />
        <button type="submit">Save Topic</button>
      </form>

      <div style={{ display: "grid", gap: 8 }}>
        {topics.map(t => (
          <div key={t.id} style={{
            background: "#fff", padding: 12, borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex",
            justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div><strong>{t.id}</strong> — {t.title}</div>
              {t.description && <div style={{ color: "#6b7280" }}>{t.description}</div>}
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Prerequisites: {Array.isArray(t.prerequisites) && t.prerequisites.length
                  ? t.prerequisites.join(", ")
                  : "None"}
              </div>
            </div>
            <button onClick={() => removeTopic(t.id)} style={{ background: "#ef4444", color: "#fff", border: 0, padding: "6px 10px", borderRadius: 8 }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
