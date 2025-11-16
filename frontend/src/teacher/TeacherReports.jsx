// frontend/src/teacher/TeacherReports.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import Papa from "papaparse";

const API_BASE = "https://page-jirk.onrender.com";

export default function TeacherReports() {
  const [data, setData] = useState({ students: [], topics: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name"); // name | score | masteredCount
  const reportRef = useRef();

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/performance`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load report:", err);
      alert("Failed to load reports (see console)");
    } finally {
      setLoading(false);
    }
  }

  // Filter + search + sort
  const studentsVisible = useMemo(() => {
    let arr = (data.students || []).slice();
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(s => (s.name || "").toLowerCase().includes(q) || (s.id || "").toLowerCase().includes(q));
    }
    if (filter === "pass") arr = arr.filter(s => s.status === "PASS");
    if (filter === "fail") arr = arr.filter(s => s.status === "FAIL");

    arr.sort((a,b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "masteredCount") return (b.masteredCount || 0) - (a.masteredCount || 0);
      return 0;
    });

    return arr;
  }, [data.students, query, filter, sortBy]);

  // Simple aggregates for charts
  const passFailCounts = useMemo(() => {
    const pass = (data.students || []).filter(s => s.status === "PASS").length;
    const fail = (data.students || []).filter(s => s.status === "FAIL").length;
    return [{ name: "Pass", value: pass }, { name: "Fail", value: fail }];
  }, [data.students]);

  // CSV export
  function exportCSV() {
    const rows = studentsVisible.map(s => ({
      id: s.id,
      name: s.name,
      gender: s.gender ? (s.gender[0] || "").toUpperCase() : "",
      score: s.score ?? "",
      final: s.final ?? "",
      status: s.status
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF export (capture reportRef)
  async function exportPDF() {
    if (!reportRef.current) return alert("Nothing to export");
    const node = reportRef.current;
    // increase scale to improve chart resolution
    const canvas = await html2canvas(node, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // keep aspect ratio
    const imgProps = pdf.getImageProperties(imgData);
    const imgW = pageWidth - 40;
    const imgH = (imgProps.height * imgW) / imgProps.width;
    pdf.addImage(imgData, "PNG", 20, 20, imgW, imgH);
    pdf.save(`performance_report_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  // Print
  function printView() {
    window.print();
  }

  if (loading) return <div style={{ padding: 20 }}>Loading reports...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>🧾 Performance Reports</h1>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input placeholder="Search student..." value={query} onChange={e => setQuery(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: 260 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">All</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="name">Sort: Name</option>
          <option value="score">Sort: Score</option>
          <option value="masteredCount">Sort: Mastered</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ padding: "8px 10px", borderRadius: 6 }}>⬇ CSV</button>
          <button onClick={exportPDF} style={{ padding: "8px 10px", borderRadius: 6 }}>⬇ PDF</button>
          <button onClick={printView} style={{ padding: "8px 10px", borderRadius: 6 }}>🖨 Print</button>
        </div>
      </div>

      {/* Report content — captured for PDF */}
      <div ref={reportRef} style={{ background: "white", padding: 16, borderRadius: 10, border: "1px solid #e6eefc" }}>
        {/* Top summary + chart */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", marginBottom: 18 }}>
          <div style={{ flex: "0 0 340px", minHeight: 200, padding: 12, borderRadius: 8, border: "1px solid #eef2ff" }}>
            <h3 style={{ margin: 0 }}>Summary</h3>
            <div style={{ marginTop: 8 }}>
              <div>Total students: <strong>{data.students.length}</strong></div>
              <div>Pass: <strong>{passFailCounts.find(x=>x.name==="Pass")?.value || 0}</strong></div>
              <div>Fail: <strong>{passFailCounts.find(x=>x.name==="Fail")?.value || 0}</strong></div>
            </div>
          </div>

          <div style={{ flex: 1, height: 200, padding: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={passFailCounts}>
                <XAxis dataKey="name"/>
                <YAxis allowDecimals={false}/>
                <Tooltip/>
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Students table */}
        <div>
          <h3 style={{ marginTop: 0 }}>Students</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: 8, width: 140 }}>ID</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8, width: 50 }}>G</th>
                  <th style={{ padding: 8, width: 120, textAlign: "right" }}>Pre-test</th>
                  <th style={{ padding: 8, width: 100 }}>Status</th>
                  <th style={{ padding: 8, width: 150 }}>Mastered</th>
                </tr>
              </thead>
              <tbody>
                {studentsVisible.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #fafafa" }}>
                    <td style={{ padding: 8 }}>{s.id}</td>
                    <td style={{ padding: 8 }}>{s.name}</td>
                    <td style={{ padding: 8 }}>{s.gender ? (s.gender[0]?.toUpperCase() === "M" ? "M" : s.gender[0]?.toUpperCase() === "F" ? "F" : s.gender[0]?.toUpperCase()) : "-"}</td>
                    <td style={{ padding: 8, textAlign: "right" }}>{(s.score ?? "-") + (s.final ? ` / ${s.final}` : "")}</td>
                    <td style={{ padding: 8 }}>{s.status}</td>
                    <td style={{ padding: 8 }}>{s.masteredCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Optional: per-student radar chart for mastery (show top N students) */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Mastery Snapshot (sample)</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {studentsVisible.slice(0, 3).map(s => {
              // build radar data from s.mastered (placeholder)
              const radarData = (data.topics || []).slice(0, 6).map(t => ({
                topic: t.name,
                value: (s.mastered || []).includes(t.id) ? 100 : 0
              }));
              return (
                <div key={s.id} style={{ width: 300, height: 300, background: "#fff", borderRadius: 8, padding: 8, border: "1px solid #eef2ff" }}>
                  <h4 style={{ marginTop: 0 }}>{s.name}</h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="topic" />
                      <PolarRadiusAxis angle={30} domain={[0,100]} />
                      <Radar name={s.name} dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
