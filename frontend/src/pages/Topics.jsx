//Topics.jsx

import { useEffect, useState } from "react";
const API_BASE = "http://localhost:5000";

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", description: "", prerequisites: [], cluster: "" });

  useEffect(() => { load(); }, []);
  async function load() {
    const res = await fetch(`${API_BASE}/topics/list`);
    const data = await res.json();
    console.log("Fetched topics:", data);  // 👈 check here
    setTopics(data);
  }

  function setField(k,v){ setForm(prev=>({...prev,[k]:v})); }

  async function save(e) {
    e.preventDefault();
    if (!form.id || !form.name) { 
      alert("ID & name required"); 
      return; 
    }
    const payload = { 
      name: form.name, 
      description: form.description, 
      prerequisites: form.prerequisites,   // ✅ FIX: add comma
      cluster: form.cluster || "Uncategorized"  // ✅ FIX
    };
    const res = await fetch(`${API_BASE}/topics/${form.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await load();
    setForm({ id: "", name: "", description: "", prerequisites: [], cluster: "" });
  }

  function editTopic(t){
    setForm({ 
      id: t.id, 
      name: t.name || "", 
      description: t.description || "", 
      prerequisites: t.prerequisites || [],  // ✅ FIX: add comma
      cluster: t.cluster || ""               // ✅ FIX
    });
  }

  async function delTopic(id){
    if(!confirm("Delete "+id+"?")) return;
    await fetch(`${API_BASE}/topics/${id}`, { method:"DELETE" });
    await load();
  }

  const clusters = topics.reduce((acc, t) => {
    const cluster = t.cluster || "Uncategorized";
    if (!acc[cluster]) acc[cluster] = [];
    acc[cluster].push(t);
    return acc;
  }, {});

  return (
    <div style={{ padding: 20 }}>
      <h1>Topics</h1>
      <form onSubmit={save} style={{ marginBottom: 12, width: "100%" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Topic ID"
            value={form.id}
            onChange={e => setField("id", e.target.value)}
          />
          <input
            style={{ flex: 1 }}
            placeholder="Name"
            value={form.name}
            onChange={e => setField("name", e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <input
            style={{ width: "100%" }}
            placeholder="Description"
            value={form.description}
            onChange={e => setField("description", e.target.value)}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>Prerequisites (pick from existing)</div>
          <select
            multiple
            value={form.prerequisites}
            onChange={e => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              setField("prerequisites", opts);
            }}
            style={{ minHeight: 80, width: "100%" }}
          >
            {topics.map(t => (
              <option key={t.id} value={t.id}>
                {t.id} - {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 8 }}>
          <input
            style={{ width: "100%" }}
            placeholder="Cluster"
            value={form.cluster || ""}
            onChange={e => setField("cluster", e.target.value)}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <button type="submit">Save Topic</button>
          <button
            type="button"
            onClick={() => setForm({ id: "", name: "", description: "", prerequisites: [], cluster: "" })}
            style={{ marginLeft: 8 }}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Grouped by cluster */}
      <div>
        {Object.entries(clusters).map(([cluster, items]) => (
          <div key={cluster} style={{ marginBottom: 20 }}>
            <h2>{cluster}</h2>
            {items.map(t => (
              <div key={t.id} style={{ padding:8, border:"1px solid #eee", borderRadius:8, marginBottom:8, background:"#fff" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <strong>{t.name} [{t.id}]</strong>
                    <div style={{ fontSize: 12, color: "#666" }}>{t.description}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Prerequisites: {(t.prerequisites || []).join(", ") || "None"}
                    </div>
                  </div>
                  <div>
                    <button onClick={()=>editTopic(t)} style={{marginRight:8}}>Edit</button>
                    <button onClick={()=>delTopic(t.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
