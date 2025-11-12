import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles } from "lucide-react";

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

  if (!topic)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-xl">
        Loading topic...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-pink-100 to-emerald-100 flex flex-col items-center py-8 px-4">
      {/* 🟡 Top Back Button */}
      <div className="w-full max-w-4xl mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg transition-transform hover:scale-105"
        >
          <ArrowLeft size={22} /> Back to Dashboard
        </button>
      </div>

      {/* 📘 Topic Card */}
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl p-8 text-center border-4 border-sky-200">
        <h1 className="text-4xl font-bold text-sky-600 mb-2 flex justify-center items-center gap-2">
          <BookOpen size={36} /> {topic.name}
        </h1>
        <p className="text-gray-700 mb-6 text-lg">{topic.description}</p>
        <hr className="border-gray-300 mb-6" />

        <h2 className="text-3xl font-bold text-emerald-600 mb-6 flex items-center justify-center gap-2">
          <Sparkles size={30} /> Learning Materials
        </h2>

        {contents.length === 0 && (
          <p className="text-gray-600 italic text-lg">
            No materials yet for this topic.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {contents.map((c) => (
            <div
              key={c.id}
              className="bg-white border-2 border-sky-300 rounded-2xl p-5 shadow-md hover:shadow-lg transition-transform hover:scale-105 text-left"
            >
              <a
                href={c.link}
                target="_blank"
                rel="noreferrer"
                className="text-xl font-semibold text-sky-700 hover:underline block mb-2"
              >
                {c.title}
              </a>
              <p className="text-gray-600 mb-4">{c.description}</p>

              {seen.includes(c.id) ? (
                <span className="text-green-600 font-bold text-lg">✅ Viewed</span>
              ) : (
                <button
                  onClick={() => markSeen(c.id)}
                  className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 rounded-full shadow-md transition-transform hover:scale-105"
                >
                  Mark as Seen
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 Bottom Back Button */}
      <div className="w-full max-w-4xl mt-8">
        <button
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-full shadow-lg transition-transform hover:scale-105"
        >
          <ArrowLeft size={22} /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
