// frontend/src/pages/TeacherContentView.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function TeacherContentView() {
  const { id } = useParams();
  const [content, setContent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/content`);
      const json = await res.json();
      const found = json.find((c) => c.id === id);
      setContent(found);
    }
    load();
  }, [id]);

  if (!content) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{content.title}</h1>
      <p>{content.description}</p>
      <p>
        <strong>Topic:</strong> {content.topic_id} <br />
        <strong>Type:</strong> {content.type}
      </p>
      {content.link && (
        <iframe
          src={content.link.replace("/edit", "/preview")}
          title="Preview"
          width="100%"
          height="480"
          style={{ border: "1px solid #ddd", borderRadius: 8 }}
          allowFullScreen
        />
      )}
    </div>
  );
}
