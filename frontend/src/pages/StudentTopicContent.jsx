// frontend/src/pages/StudentTopicContent.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react"; // optional icons if using lucide-react

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentTopicContent() {
  const { id: studentId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const topicRes = await fetch(`${API_BASE}/topics/list`);
        const topicList = await topicRes.json();
        const found = topicList.find((t) => t.id === topicId);
        setTopic(found);

        const res = await fetch(`${API_BASE}/content/${topicId}`);
        const json = await res.json();
        setContents(json);

        const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
        const stuJson = await stuRes.json();
        setSeen(stuJson.content_seen || []);
      } catch (err) {
        console.error("Error loading content:", err);
      }
    }
    load();
  }, [studentId, topicId]);

  async function markSeen(contentId) {
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/content_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId }),
      });
      const data = await res.json();
      setSeen(data.content_seen || []);
    } catch (err) {
      console.error("Failed to mark content as seen:", err);
    }
  }

  if (!topic) return <div className="p-6 text-center text-gray-600">Loading topic...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-pink-100 to-emerald-100 p-6 flex flex-col items-center">
      {/* 🟡 Top Back Button */}
      <div className="w-full max-w-3xl mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded-full shadow-md transition-transform hover:scale-105"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      {/* 🧩 Topic Header */}
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-lg p-6 text-center">
        <h1 className="text-3xl font-bold text-sky-600 mb-2 flex justify-center items-center gap-2">
          <BookOpen size={28} /> {topic.name}
        </h1>
        <p className="text-gray-700 mb-4">{topic.description}</p>
        <hr className="border-gray-300 my-4" />

        <h2 className="text-2xl font-semibold text-emerald-600 mb-4">
          📚 Learning Materials
        </h2>

        {contents.length === 0 && (
          <p className="text-gray-600 italic">No materials yet for this topic.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {contents.map((c) => (
            <div
              key={c.id}
              className="bg-white border-2 border-sky-200 rounded-2xl p-4 text-left shadow-md hover:shadow-lg transition-transform hover:scale-105"
            >
              <a
                href={c.link}
                target="_blank"
                rel="noreferrer"
                className="text-lg font-semibold text-sky-700 hover:underline"
              >
                {c.title}
              </a>
              <p className="text-sm text-gray-600 mt-1">{c.description}</p>

              <div className="mt-3">
                {seen.includes(c.id) ? (
                  <span className="text-green-600 font-bold">✅ Viewed</span>
                ) : (
                  <button
                    onClick={() => markSeen(c.id)}
                    className="bg-orange-400 hover:bg-orange-500 text-white font-semibold px-3 py-1 rounded-full shadow-md transition-transform hover:scale-105"
                  >
                    Mark as Seen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 Bottom Back Button */}
      <div className="w-full max-w-3xl mt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-6 py-3 rounded-full shadow-md transition-transform hover:scale-105"
        >
          <ArrowLeft size={22} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
