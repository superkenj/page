import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserGraduate, FaBook } from "react-icons/fa";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherDashboard() {
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [links, setLinks] = useState([]);

  const navigate = useNavigate();

  /* ------------------------------
      Verify Login Role
  ------------------------------*/
  useEffect(() => {
    if (localStorage.getItem("role") !== "teacher") {
      navigate("/");
    }
  }, []);

  /* ------------------------------
      Load Summary + Topics + Contents
  ------------------------------*/
  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, topicRes, contentRes] = await Promise.all([
          fetch(`${API_BASE}/teacher/summary`),
          fetch(`${API_BASE}/topics/list`),
          fetch(`${API_BASE}/content`)
        ]);

        setSummary(await summaryRes.json());
        setTopics(await topicRes.json());
        setContents(await contentRes.json());
      } catch (err) {
        console.error("Loading dashboard failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!summary) return <div>No data available</div>;

  /* ------------------------------
      Utility: Count Content by Topic
  ------------------------------*/
  const countContent = (topicId) =>
    contents.filter((c) => c.topic_id === topicId).length;

  const actionItems = topics
    .map((t) => ({
      ...t,
      count: countContent(t.id)
    }))
    .filter((t) => t.count === 0 || t.count === 1);

  /* ------------------------------
      Modal management
  ------------------------------*/
  function openModal(topicId) {
    setSelectedTopic(topicId);
    setLinks([{ link: "", type: "video", description: "" }]);
    setShowModal(true);
  }

  function addLinkField() {
    setLinks([...links, { link: "", type: "video", description: "" }]);
  }

  function updateLink(i, newVal) {
    const temp = [...links];
    temp[i] = newVal;
    setLinks(temp);
  }

  function removeLinkField(i) {
    const temp = [...links];
    temp.splice(i, 1);
    setLinks(temp);
  }

  async function handleAddContent() {
    if (!selectedTopic) return;

    for (const entry of links) {
      await fetch(`${API_BASE}/content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: selectedTopic,
          link: entry.link,
          type: entry.type,
          description: entry.description
        })
      });
    }

    alert("Content successfully added!");
    setShowModal(false);
  }

  /* ------------------------------
      UI Styles
  ------------------------------*/
  const cardStyle = {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    padding: "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "0.2s",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    textAlign: "left",
    gap: "14px",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    marginTop: "2rem"
  };

  /* =============================
        RENDER START
  =============================*/

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Teacher Dashboard</h1>

      {/* ---------------- Cards ---------------- */}
      <div style={gridStyle}>

        {/* Students Card */}
        <div
          style={cardStyle}
          onClick={() => navigate("/teacher/students")}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaUserGraduate size={40} color="#3b82f6" />
            <div>
              <h2 style={{ color: "#3b82f6", margin: 0 }}>{summary.students_total}</h2>
              <p style={{ margin: 0 }}>Students</p>
            </div>
          </div>
        </div>

        {/* Topics Card */}
        <div
          style={cardStyle}
          onClick={() => navigate("/teacher/topics")}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FaBook size={40} color="#f59e0b" />
            <div>
              <h2 style={{ color: "#f59e0b", margin: 0 }}>{summary.topic_count}</h2>
              <p style={{ margin: 0 }}>Topics</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Action Points ---------------- */}
      <h2 style={{ marginTop: "3rem", marginBottom: "1rem" }}>
        🔧 Action Points
      </h2>

      {actionItems.length === 0 && (
        <p style={{ color: "#4b5563" }}>All topics have enough content 🎉</p>
      )}

      {actionItems.map((t) => (
        <div
          key={t.id}
          style={{
            background: "#fff",
            padding: 16,
            marginBottom: 10,
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #e5e7eb"
          }}
        >
          <div>
            <strong>{t.name}</strong>
            <p style={{ color: "#6b7280", margin: 0 }}>
              {t.count === 0
                ? "No content added yet"
                : "Only 1 content available"}
            </p>
          </div>

          <button
            onClick={() => openModal(t.id)}
            style={{
              background: "#3b82f6",
              color: "white",
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer"
            }}
          >
            ➕ Add Content
          </button>
        </div>
      ))}

      {/* ---------------- Modal ---------------- */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5000
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
          >
            <h2 style={{ marginBottom: 20 }}>Add Content</h2>

            {/* ----- Topic dropdown (preselected) ----- */}
            <label style={{ fontWeight: 600 }}>Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                display: "block",
                marginBottom: 16,
                padding: 10,
                width: "100%"
              }}
            >
              <option value="">-- Select Topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* ----- Content Inputs ----- */}
            {links.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#f9fafb",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={`Resource link #${i + 1}`}
                    value={item.link}
                    onChange={(e) =>
                      updateLink(i, { ...item, link: e.target.value })
                    }
                    style={{ flex: 1, padding: 8 }}
                  />

                  <select
                    value={item.type}
                    onChange={(e) =>
                      updateLink(i, { ...item, type: e.target.value })
                    }
                    style={{ padding: 8 }}
                  >
                    <option value="video">Video</option>
                    <option value="presentation">Presentation</option>
                    <option value="pdf">PDF</option>
                    <option value="link">Link</option>
                  </select>

                  {links.length > 1 && (
                    <button
                      onClick={() => removeLinkField(i)}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        padding: "6px 8px"
                      }}
                    >
                      ✖
                    </button>
                  )}
                </div>

                <textarea
                  rows={2}
                  placeholder="Short description..."
                  value={item.description}
                  onChange={(e) =>
                    updateLink(i, { ...item, description: e.target.value })
                  }
                  style={{ width: "100%", marginTop: 8, padding: 8 }}
                />
              </div>
            ))}

            <button
              onClick={addLinkField}
              style={{
                background: "#2563eb",
                color: "white",
                padding: "6px 12px",
                borderRadius: 6,
                border: "none",
                marginBottom: 10
              }}
            >
              ➕ Add Another Resource
            </button>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "#6b7280",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "none"
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleAddContent}
                style={{
                  background: "#16a34a",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "none"
                }}
              >
                Save Content
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
