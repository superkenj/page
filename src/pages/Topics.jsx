import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function Topics() {
  const [topics, setTopics] = useState([]);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Fetch topics
  const fetchTopics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "topics"));
      const data = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setTopics(data);
    } catch (err) {
      console.error("Error fetching topics:", err);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  // Add or update topic
  const addTopic = async (e) => {
    e.preventDefault();
    if (!id || !title) {
      alert("ID and Title are required!");
      return;
    }

    try {
      await setDoc(doc(db, "topics", id), {
        title,
        description
      });
      setId("");
      setTitle("");
      setDescription("");
      fetchTopics();
    } catch (err) {
      console.error("Error adding topic:", err);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Manage Topics</h1>

      {/* Add Topic Form */}
      <form onSubmit={addTopic} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Topic ID"
          value={id}
          onChange={e => setId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Topic Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button type="submit">Save Topic</button>
      </form>

      {/* Display Topics */}
      <ul>
        {topics.map(topic => (
          <li key={topic.id}>
            <strong>{topic.id}:</strong> {topic.title}  
            {topic.description && <> → {topic.description}</>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Topics;
