import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const API_BASE = "https://page-jirk.onrender.com";

export default function StudentTopicContent() {
  const { id: studentId, topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [contents, setContents] = useState([]);
  const [seen, setSeen] = useState([]);
  const [openCard, setOpenCard] = useState(null); // which card is expanded

  useEffect(() => {
    async function load() {
      const topicRes = await fetch(`${API_BASE}/topics/list`);
      const topicList = await topicRes.json();
      setTopic(topicList.find((t) => t.id === topicId));

      const res = await fetch(`${API_BASE}/content/${topicId}`);
      const json = await res.json();
      setContents(json);

      const stuRes = await fetch(`${API_BASE}/students/${studentId}`);
      const stuJson = await stuRes.json();
      setSeen(stuJson.content_seen || []);
    }
    load();
  }, [studentId, topicId]);

  if (!topic) return <div className="text-center mt-10 text-gray-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-pink-100 to-emerald-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-full mb-6 shadow-md transition-transform hover:scale-105"
        >
          <ArrowLeft className="inline mr-2" /> Back to Dashboard
        </button>

        {/* Topic Header */}
        <div className="bg-white p-8 rounded-3xl shadow-lg text-center border-4 border-sky-200">
          <h1 className="text-4xl font-bold text-sky-600 mb-3 flex justify-center items-center gap-2">
            <BookOpen size={36} /> {topic.name}
          </h1>
          <p className="text-gray-700 mb-6 text-lg">{topic.description}</p>
        </div>

        {/* Learning Material Cards */}
        <div className="mt-8 grid gap-6">
          {contents.map((c) => (
            <div
              key={c.id}
              className="bg-white border-2 border-sky-200 rounded-2xl p-6 shadow-md transition-transform hover:scale-105"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpenCard(openCard === c.id ? null : c.id)}
              >
                <h2 className="text-xl font-semibold text-sky-700">{c.title}</h2>
                {openCard === c.id ? <ChevronUp /> : <ChevronDown />}
              </div>

              <p className="text-gray-600 mt-2">{c.description}</p>

              {/* Expanded Inline View */}
              {openCard === c.id && (
                <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
                  <iframe
                    src={c.link}
                    title={c.title}
                    className="w-full h-64 rounded-xl"
                  ></iframe>
                </div>
              )}

              <div className="mt-4">
                {seen.includes(c.id) ? (
                  <span className="text-green-600 font-bold">✅ Viewed</span>
                ) : (
                  <button
                    onClick={() => markSeen(c.id)}
                    className="bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-full shadow-md transition-transform hover:scale-105"
                  >
                    Mark as Seen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-3 rounded-full mt-8 shadow-md transition-transform hover:scale-105"
        >
          <ArrowLeft className="inline mr-2" /> Back to Dashboard
        </button>
      </div>
    </div>
  );
}
