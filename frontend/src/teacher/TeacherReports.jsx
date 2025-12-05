// TeacherReports.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import Papa from "papaparse";

const API_BASE = "https://page-jirk.onrender.com";

function clamp(n, a = 0, b = 100) {
  return Math.max(a, Math.min(b, n));
}

export default function TeacherReports() {
  const [data, setData] = useState({ students: [], topics: [], assessments: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name"); // name | progress | masteredCount
  const [selectedTopic, setSelectedTopic] = useState("all"); // "all" or topicId
  const [countMode, setCountMode] = useState("unique-students"); // "topic-level" | "unique-students"
  const [studentDetail, setStudentDetail] = useState(null); // { student, attempts: [...] }
  const [itemAnalysis, setItemAnalysis] = useState(null); // normalized analysis { loading, items, error }
  const [modalOpen, setModalOpen] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    fetchReport();
  }, []);

  // when topics load, default selectedTopic to first topic (per-topic view default)
  useEffect(() => {
    if (data.topics && data.topics.length && selectedTopic === "all") {
      // default to first topic id (but keep "all" available)
      setSelectedTopic(data.topics[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.topics]);

  // When selectedTopic changes, automatically load item analysis for its single assessment (1:1)
  useEffect(() => {
    if (selectedTopic && selectedTopic !== "all") {
      const assessmentId = `${selectedTopic}_assessment`;
      loadItemAnalysis(assessmentId);
    } else {
      setItemAnalysis(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/performance`);
      const json = await res.json();
      setData({
        students: json.students || [],
        topics: json.topics || [],
        assessments: json.assessments || [],
      });
      console.debug("reports/performance response", { ok: res.ok, status: res.status, body: json });
    } catch (err) {
      console.error("Failed to load report:", err);
      alert("Failed to load reports (see console)");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentById(id) {
    try {
      const r = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`);
      if (!r.ok) return null;
      const j = await r.json();
      return j;
    } catch (err) {
      console.error("fetchStudentById error", err);
      return null;
    }
  }

  // Count topics with recorded assessment attempts in student.topic_progress
  function topicAttemptsCount(student) {
    if (student.topic_progress && typeof student.topic_progress === "object") {
      return Object.keys(student.topic_progress).reduce((acc, tid) => {
        const tp = student.topic_progress[tid] || {};
        if ((tp.attempts && Number(tp.attempts) > 0) || tp.last_attempted_at) return acc + 1;
        return acc;
      }, 0);
    }
    return 0;
  }

  function formatProgress(student) {
    const totalTopics = (data.topics || []).length || 0;
    const attempted = topicAttemptsCount(student);
    const percent = totalTopics ? Math.round((attempted / totalTopics) * 100) : 0;
    return { attempted, totalTopics, percent };
  }

  // Filter + sort students
  const studentsVisible = useMemo(() => {
    let arr = (data.students || []).slice();

    // if a specific topic is selected, restrict to students who have any activity or presence of that topic
    if (selectedTopic !== "all") {
      arr = arr.filter(s => {
        if (!s.topic_progress) return false;
        return Object.keys(s.topic_progress).some(k => k === selectedTopic || k === (selectedTopic.replace('_assessment','')));
      });
    }

    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(
        s =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q)
      );
    }

    if (filter === "atrisk") {
      arr = arr.filter(s => formatProgress(s).percent < 60);
    }

    arr.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "progress") return formatProgress(b).percent - formatProgress(a).percent;
      if (sortBy === "masteredCount") return (b.masteredCount || 0) - (a.masteredCount || 0);
      return 0;
    });

    return arr;
  }, [data.students, query, filter, sortBy, selectedTopic, data.topics]);

  // SUMMARY & METRICS (refined)
  const totalTopics = (data.topics || []).length || 0;
  const summary = useMemo(() => {
    const students = data.students || [];
    const totalStudents = students.length;
    const masteryPercents = students.map(s => formatProgress(s).percent);
    const avgMastery = masteryPercents.length ? Math.round(masteryPercents.reduce((a,b)=>a+b,0)/masteryPercents.length) : 0;
    const attemptsArr = students.map(s => Number(s.attempts || 0));
    const avgAttempts = attemptsArr.length ? Number((attemptsArr.reduce((a,b)=>a+b,0)/attemptsArr.length).toFixed(1)) : 0;
    const atRisk = students.filter(s => formatProgress(s).percent < 60).length;
    return { totalStudents, avgMastery, avgAttempts, atRisk };
  }, [data.students, data.topics]);

  // Mastery distribution buckets (0-19,20-39,40-59,60-79,80-100) — five buckets as requested
  const masteryBuckets = useMemo(() => {
    const buckets = [
      { name: "0-19", value: 0 },
      { name: "20-39", value: 0 },
      { name: "40-59", value: 0 },
      { name: "60-79", value: 0 },
      { name: "80-100", value: 0 },
    ];
    (data.students || []).forEach(s => {
      const p = formatProgress(s).percent ?? 0;
      if (p < 20) buckets[0].value++;
      else if (p < 40) buckets[1].value++;
      else if (p < 60) buckets[2].value++;
      else if (p < 80) buckets[3].value++;
      else buckets[4].value++;
    });
    return buckets;
  }, [data.students, data.topics]);

  // CSV export
  function exportCSV() {
    const rows = studentsVisible.map(s => {
      const { attempted, totalTopics, percent } = formatProgress(s);
      return {
        id: s.id,
        name: s.name,
        gender: s.gender ? (s.gender[0] || "").toUpperCase() : "",
        progress: `${attempted}/${totalTopics} (${percent}%)`,
        attempts: s.attempts ?? 0
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF export
  async function exportPDF() {
    if (!reportRef.current) return alert("Nothing to export");
    const node = reportRef.current;
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgW = pageWidth - 40;
      const imgH = (imgProps.height * imgW) / imgProps.width;
      pdf.addImage(imgData, "PNG", 20, 20, imgW, imgH);
      pdf.save(`performance_report_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Failed to export PDF (see console)");
    }
  }

  function printView() {
    window.print();
  }

  // Open student modal and load attempts
  async function openStudentDetail(student) {
    setModalOpen(true);
    setStudentDetail({ loading: true, student, attempts: [] });
    try {
      const res = await fetch(`${API_BASE}/reports/student/${encodeURIComponent(student.id)}/attempts`);
      const json = await res.json();
      let attempts = json.attempts || [];

      // Normalize fields
      attempts = attempts.map(a => {
        const attemptNumber = a.attempt_number ?? a.attemptNumber ?? a.attempt ?? null;
        const attemptedAt = a.attempted_at ?? a.attemptedAt ?? null;
        const items = Array.isArray(a.items) ? a.items : [];
        const earned = items.reduce((acc, it) => acc + (Number(it.points_awarded || 0)), 0);
        const totalQ = items.length;
        const earnedPoints = (typeof a.earnedPoints === "number") ? a.earnedPoints : earned;
        const totalPoints = (typeof a.totalPoints === "number") ? a.totalPoints : totalQ;
        const score = (typeof a.score === "number") ? a.score : (a.score ?? null);
        const percentFromItems = totalPoints ? Math.round((earnedPoints / (totalPoints || 1)) * 100) : null;

        return {
          ...a,
          attempt_number: attemptNumber,
          attempted_at: attemptedAt,
          items,
          earnedPoints,
          totalPoints,
          score,
          percentFromItems,
        };
      });

      // sort attempts: prefer attempted_at desc, else attempt_number desc
      attempts.sort((x, y) => {
        const tA = x.attempted_at ? new Date(x.attempted_at).getTime() : (x.attempt_number ?? 0);
        const tB = y.attempted_at ? new Date(y.attempted_at).getTime() : (y.attempt_number ?? 0);
        return tB - tA;
      });

      // fallback: synthesize attempts from student.topic_progress if none returned
      if ((!attempts || attempts.length === 0) && student && student.topic_progress && typeof student.topic_progress === "object") {
        const synth = [];
        Object.entries(student.topic_progress).forEach(([tid, tp]) => {
          const atCount = Number(tp.attempts || 0);
          if (atCount > 0 || tp.last_attempted_at) {
            synth.push({
              id: `${student.id}-${tid}-synth`,
              assessment_id: `${tid}_assessment`,
              topic_id: tid,
              score: (typeof tp.last_score === "number") ? tp.last_score : tp.last_score ?? null,
              passed: !!tp.passed,
              attempt_number: tp.attempts || null,
              attempted_at: tp.last_attempted_at || null,
              items: [],
              earnedPoints: 0,
              totalPoints: 0,
              synthesized: true
            });
          }
        });
        synth.sort((a,b) => (new Date(b.attempted_at || 0) - new Date(a.attempted_at || 0)));
        if (synth.length) attempts = synth;
      }

      setStudentDetail({ loading: false, student, attempts });
    } catch (err) {
      console.error("Failed to load student attempts", err);
      setStudentDetail({ loading: false, student, attempts: [], error: true });
    }
  }

  // Load and normalize item analysis
  async function loadItemAnalysis(assessmentId) {
    setItemAnalysis({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/reports/assessment/${encodeURIComponent(assessmentId)}/item-analysis`);
      const json = await res.json();
      let items = [];

      if (!json) items = [];
      else if (Array.isArray(json)) items = json;
      else if (Array.isArray(json.items)) items = json.items;
      else if (json.analysis && Array.isArray(json.analysis.items)) items = json.analysis.items;
      else items = [];

      items = items.map(it => ({
        ...it,
        correctPercent: Number(it.correctPercent ?? it.correctPercent === 0 ? it.correctPercent : it.pValue ? (it.pValue * 100) : 0),
        totalAttempts: Number(it.totalAttempts ?? it.total ?? 0),
      }));

      setItemAnalysis({ loading: false, items, error: false });
    } catch (err) {
      console.error("Failed to load item analysis", err);
      setItemAnalysis({ loading: false, items: [], error: true });
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading reports...</div>;

  // small shared styles
  const cardStyle = { background: "#fff", padding: 12, borderRadius: 10, boxShadow: "0 6px 20px rgba(15,23,42,0.04)", border: "1px solid #eef2ff" };
  const smallText = { fontSize: 13, color: "#444" };

  // -------------------------
  // Attempts distribution compute (supports per-topic, topic-level, unique-students)
  // -------------------------
  function computeAttemptsDistribution() {
    // buckets: 0, 1-2, 3+
    const buckets = { "0": 0, "1-2": 0, "3+": 0 };

    // If a specific topic selected -> compute per-topic (number of students who have 0/1-2/3+ attempts on that topic)
    if (selectedTopic !== "all") {
      (data.students || []).forEach(s => {
        const tp = (s.topic_progress && s.topic_progress[selectedTopic]) || (s.topic_progress && s.topic_progress[selectedTopic.replace('_assessment','')]) || null;
        const a = tp ? Number(tp.attempts || 0) : 0;
        if (a <= 0) buckets["0"]++;
        else if (a <= 2) buckets["1-2"]++;
        else buckets["3+"]++;
      });
      return [
        { name: "0", value: buckets["0"] },
        { name: "1-2", value: buckets["1-2"] },
        { name: "3+", value: buckets["3+"] },
      ];
    }

    // Otherwise (all topics): two modes
    if (countMode === "topic-level") {
      // count each topic-instance separately (topic-level). For each student-topic entry increment appropriate bucket.
      (data.students || []).forEach(s => {
        const tpObj = s.topic_progress || {};
        Object.keys(tpObj).forEach(tid => {
          const a = Number((tpObj[tid] && tpObj[tid].attempts) || 0);
          if (a <= 0) buckets["0"]++;
          else if (a <= 2) buckets["1-2"]++;
          else buckets["3+"]++;
        });
      });
      return [
        { name: "0", value: buckets["0"] },
        { name: "1-2", value: buckets["1-2"] },
        { name: "3+", value: buckets["3+"] },
      ];
    } else {
      // unique-students mode: for each student compute their WORST attempts across topics (max attempts) and bucket them once
      (data.students || []).forEach(s => {
        const tpObj = s.topic_progress || {};
        let maxAttempts = 0;
        Object.keys(tpObj).forEach(tid => {
          const a = Number((tpObj[tid] && tpObj[tid].attempts) || 0);
          if (a > maxAttempts) maxAttempts = a;
        });
        // If student has no topic_progress entries treat as 0
        if (maxAttempts <= 0) buckets["0"]++;
        else if (maxAttempts <= 2) buckets["1-2"]++;
        else buckets["3+"]++;
      });
      return [
        { name: "0", value: buckets["0"] },
        { name: "1-2", value: buckets["1-2"] },
        { name: "3+", value: buckets["3+"] },
      ];
    }
  }

  // -------------------------
  // Needs attention list (adapts to selectedTopic). Show clearer attempt breakdown.
  // -------------------------
  function buildAttentionList() {
    // If a topic is selected, only consider attentionReasons for that topic
    const list = (data.students || []).map(s => {
      return {
        ...s,
        attentionReasonsFiltered: (s.attentionReasons || []).filter(r => selectedTopic === "all" ? true : (r.topicId === selectedTopic || r.topicId === selectedTopic.replace('_assessment',''))),
      };
    }).filter(s => (s.attentionReasonsFiltered && s.attentionReasonsFiltered.length > 0));

    // sort by number of attention reasons (desc) and attempts sum
    list.sort((a,b) => {
      const aCount = a.attentionReasonsFiltered.length;
      const bCount = b.attentionReasonsFiltered.length;
      if (bCount !== aCount) return bCount - aCount;
      const aAttempts = (a.attentionReasonsFiltered || []).reduce((acc, r) => acc + (r.attempts || 0), 0);
      const bAttempts = (b.attentionReasonsFiltered || []).reduce((acc, r) => acc + (r.attempts || 0), 0);
      return bAttempts - aAttempts;
    });

    return list.slice(0, 5);
  }

  const attemptsDistributionData = computeAttemptsDistribution();
  const attentionList = buildAttentionList();

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <h1 style={{ marginBottom: 10 }}>🧾 Performance Reports</h1>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search student..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 260, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)" }}
        />

        <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="all">All topics (roll-up)</option>
          {(data.topics || []).map(t => (
            <option key={t.id} value={t.id}>
              {t.name || t.title || t.id}
            </option>
          ))}
        </select>

        {/* count mode only relevant when All topics is selected */}
        <select value={countMode} onChange={e => setCountMode(e.target.value)} style={{ padding: 8, borderRadius: 8, display: selectedTopic === "all" ? "inline-block" : "none" }}>
          <option value="unique-students">Unique students (each student counted once)</option>
          <option value="topic-level">Topic-level (counts each problematic topic instance)</option>
        </select>

        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="all">All</option>
          <option value="atrisk">At-risk</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          <option value="name">Sort: Name</option>
          <option value="progress">Sort: Progress</option>
          <option value="masteredCount">Sort: Mastered</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ padding: "8px 10px", borderRadius: 8 }}>⬇ CSV</button>
          <button onClick={exportPDF} style={{ padding: "8px 10px", borderRadius: 8 }}>⬇ PDF</button>
          <button onClick={printView} style={{ padding: "8px 10px", borderRadius: 8 }}>🖨 Print</button>
        </div>
      </div>

      {/* Report content */}
      <div ref={reportRef} style={{ background: "#fbfdff", padding: 16, borderRadius: 12 }}>
        {/* Top summary + chart */}
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 260px", minHeight: 120, ...cardStyle }}>
            <h3 style={{ margin: "0 0 8px 0" }}>Summary</h3>
            <div style={{ marginTop: 6 }}>
              <div style={smallText}>Total students: <strong style={{ marginLeft: 6 }}>{summary.totalStudents}</strong></div>
              <div style={smallText}>Total topics: <strong style={{ marginLeft: 6 }}>{totalTopics}</strong></div>
              <div style={smallText}>Avg mastery: <strong style={{ marginLeft: 6 }}>{summary.avgMastery}%</strong></div>
              <div style={smallText}>At-risk: <strong style={{ marginLeft: 6 }}>{summary.atRisk}</strong></div>
              <div style={smallText}>Avg attempts: <strong style={{ marginLeft: 6 }}>{summary.avgAttempts}</strong></div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 160, padding: 8 }}>
            <h4 style={{ margin: 0 }}>Mastery distribution (by progress %)</h4>
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              Shows how many students fall into each progress range (based on attempted topics).
            </div>
            <div style={{ height: 140, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={masteryBuckets} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(val) => [`${val}`, 'Students']} />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ flex: "0 0 320px", padding: 12, borderRadius: 10 }}>
            <h4 style={{ marginTop: 0 }}>Assessment Item Analysis</h4>
            <div style={{ ...cardStyle, padding: 10, minHeight: 100 }}>
              {selectedTopic === "all" ? (
                <div style={{ fontSize: 13, color: "#555" }}>Select a topic to view item-level issues (low p-value, low discrimination).</div>
              ) : itemAnalysis?.loading ? (
                <div>Loading analysis...</div>
              ) : itemAnalysis?.error ? (
                <div style={{ color: "#a00" }}>Failed to load analysis.</div>
              ) : (itemAnalysis?.items && itemAnalysis.items.length) ? (
                <div style={{ maxHeight: 140, overflowY: "auto" }}>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "6px 8px", width: 28 }}>#</th>
                        <th style={{ textAlign: "left", padding: "6px 8px" }}>Question</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", width: 90 }}>Correct%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemAnalysis.items.map((it, idx) => (
                        <tr key={it.questionId || idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px" }}>{idx+1}</td>
                          <td style={{ padding: "8px", color: "#333" }}>{(it.shortText || it.text || "").slice(0, 80)}{(it.shortText || it.text || "").length > 80 ? "..." : ""}</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>{Math.round(it.correctPercent || 0)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: "#777", fontSize: 13 }}>No item-analysis data available for this topic's assessment.</div>
              )}
            </div>
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
                  <th style={{ padding: 8, width: 340 }}>Progress</th>
                  <th style={{ padding: 8, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsVisible.map(s => {
                  const { attempted, totalTopics, percent } = formatProgress(s);
                  const attemptedNames = (s.topic_progress ? Object.keys(s.topic_progress) : [])
                    .map(tid => {
                      const tObj = (data.topics || []).find(tt => tt.id === tid);
                      return tObj ? (tObj.name || tObj.title || tid) : tid;
                    })
                    .filter(Boolean);

                  const tooltipText = attemptedNames.length
                    ? attemptedNames.slice(0, 6).join(", ") + (attemptedNames.length > 6 ? " (and more)" : "")
                    : "No attempted topics";
                  const barColor = percent >= 85 ? "#16a34a" : percent >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #fafafa" }}>
                      <td style={{ padding: 8 }}>{s.id}</td>
                      <td style={{ padding: 8, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{s.name}</span>
                            { ( (selectedTopic === "all" && s.attentionCount > 0) || (selectedTopic !== "all" && s.attentionReasons && s.attentionReasons.some(r=> r.topicId === selectedTopic)) ) && (
                              <span
                                title={ ( (s.attentionReasons || []).map(r=> `${r.topicLabel}: ${r.attempts} attempts (${r.lastScore != null ? r.lastScore + '%' : 'no score'})`).join('\n') ) }
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  background: "#fff7ed",
                                  color: "#92400e",
                                  fontWeight: 700,
                                  fontSize: 12,
                                  border: "1px solid rgba(245,158,11,0.12)"
                                }}
                              >
                                ⚠ { selectedTopic === "all" ? (s.attentionCount || 0) : (s.attentionReasons || []).filter(r => r.topicId === selectedTopic).length }
                              </span>
                            )}
                          </div>
                          {/* optional subtitle */}
                          <div style={{ fontSize: 12, color: "#64748b" }}>{s.id}</div>
                        </div>
                      </td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            title={tooltipText}
                            style={{
                              width: "78%",
                              background: "#f3f4f6",
                              height: 20,
                              borderRadius: 12,
                              overflow: "hidden",
                              position: "relative",
                              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
                            }}
                          >
                            <div
                              style={{
                                width: `${clamp(percent, 0, 100)}%`,
                                height: "100%",
                                background: barColor,
                                transition: "width 300ms",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            />
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 2,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#111",
                                pointerEvents: "none",
                              }}
                            >
                              {`${attempted}/${totalTopics}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openStudentDetail(s)} style={{ padding: "6px 8px", borderRadius: 6 }}>
                            View
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const body = { studentId: s.id };
                                // if a specific topic is selected, tell backend which assessment (single assessment per topic)
                                if (selectedTopic && selectedTopic !== "all") body.assessmentId = `${selectedTopic}_assessment`;

                                const resp = await fetch(`${API_BASE}/teachers/assign-remediation`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(body),
                                });

                                if (!resp.ok) {
                                  const text = await resp.text().catch(()=>null);
                                  throw new Error(`server ${resp.status} ${text || ""}`);
                                }
                                const json = await resp.json().catch(()=>({}));
                                if (json.topicsGranted && json.topicsGranted > 0) {
                                  const details = Array.isArray(json.details) && json.details.length ? ` (${json.details.join(", ")})` : "";
                                  alert(`Remediation assigned — ${json.topicsGranted} topic(s) unlocked for 1 extra attempt${details}.`);
                                } else {
                                  alert("No eligible topics found for remediation (no topics with 3 failed attempts and no extra attempts).");
                                }

                                // refresh data
                                await fetchReport();
                                // notify other clients
                                window.dispatchEvent(new CustomEvent("studentDataUpdated", { detail: { studentId: s.id } }));
                                window.dispatchEvent(new CustomEvent("studentPathUpdated", { detail: { studentId: s.id } }));
                                window.dispatchEvent(new Event("studentDataUpdatedAll"));

                                // open refreshed detail
                                const refreshed = await fetchStudentById(s.id);
                                openStudentDetail(refreshed || s);
                              } catch (err) {
                                console.error("Remediate error (table):", err);
                                alert("Failed to assign remediation (see console).");
                              }
                            }}
                            style={{ padding: "6px 10px", borderRadius: 8, background: "#fff", border: "1px solid rgba(37,99,235,0.14)", cursor: "pointer" }}
                          >
                            Remediate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actionable snapshot: Attempts distribution + Lowest-progress students */}
        <div style={{ marginTop: 20, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* Compact "Needs attention" snapshot (top 5) */}
          <div style={{ flex: 1, minWidth: 320, padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #eef2ff" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Needs attention (top students)</h4>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              Students flagged because they have ≥3 attempts on a topic but still below the passing threshold. {selectedTopic !== "all" ? `Showing results for topic: ${ (data.topics.find(t=>t.id===selectedTopic)?.name) || selectedTopic }.` : `Mode: ${ countMode === "topic-level" ? "Topic-level (counts each problematic topic instance)" : "Unique students (each student counted once)" }.`}
            </div>

            {(() => {
              if (!attentionList.length) return <div style={{ color: "#94a3b8" }}>No students currently flagged.</div>;

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {attentionList.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 6px", borderRadius: 8, background: "#fbfdff", border: "1px solid rgba(37,99,235,0.04)" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name || s.id}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {`${s.attentionReasonsFiltered.length} topic(s) • `}
                          { (s.attentionReasonsFiltered || []).map((r, idx) => `${r.attempts} on ${r.topicLabel}${idx < s.attentionReasonsFiltered.length - 1 ? ", " : ""}`) }
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openStudentDetail(s)} style={{ padding: "6px 10px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>View</button>
                        <button
                          onClick={async () => {
                            try {
                              const body = { studentId: s.id };
                              if (selectedTopic && selectedTopic !== "all") body.assessmentId = `${selectedTopic}_assessment`;
                              const resp = await fetch(`${API_BASE}/teachers/assign-remediation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                              if (!resp.ok) throw new Error(`server ${resp.status}`);
                              const json = await resp.json().catch(()=>({}));
                              if (json.topicsGranted && json.topicsGranted > 0) {
                                alert(`Remediation assigned — ${json.topicsGranted} topic(s) unlocked.`);
                              } else {
                                alert("No eligible topics found for remediation.");
                              }
                              await fetchReport();
                              window.dispatchEvent(new CustomEvent("studentDataUpdated", { detail: { studentId: s.id } }));
                              const refreshed = await fetchStudentById(s.id);
                              openStudentDetail(refreshed || s);
                            } catch (err) {
                              console.error("Remediate error (snapshot):", err);
                              alert("Failed to assign remediation (see console).");
                            }
                          }}
                          style={{ padding: "6px 10px", borderRadius: 8, background: "#fff", border: "1px solid rgba(37,99,235,0.14)", cursor: "pointer" }}
                        >
                          Remediate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Attempts distribution chart */}
          <div style={{ flex: "0 0 420px", padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #eef2ff" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>
              Attempts distribution
            </h4>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
              { selectedTopic === "all"
                ? (countMode === "topic-level"
                    ? "Counts each topic-instance across all students (students may be counted multiple times)."
                    : "Counts unique students once, using their highest attempts across topics.")
                : `Showing attempts for topic: ${(data.topics.find(t=>t.id===selectedTopic)?.name) || selectedTopic}.`
              }
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={attemptsDistributionData}
                  margin={{ top: 6, right: 8, left: 0, bottom: 6 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v}`, "Count"]} />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: student detail => show assessments taken grouped by topic */}
      {modalOpen && studentDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => {
            setModalOpen(false);
            setStudentDetail(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 960,
              maxHeight: "86vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: 18,
              boxShadow: "0 20px 40px rgba(2,6,23,0.35)",
              border: "1px solid rgba(20,40,80,0.06)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: 0.2 }}>
                  {studentDetail.student.name} — <span style={{ fontWeight: 500, color: "#475569" }}>Assessment Attempts</span>
                </h3>
                <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
                  Review attempts grouped by topic. Click Close to return.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setStudentDetail(null);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(2,6,23,0.12)",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {studentDetail.loading ? (
              <div style={{ padding: 12, color: "#475569" }}>Loading attempts...</div>
            ) : studentDetail.error ? (
              <div style={{ color: "red" }}>Failed to load attempts.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {(!Array.isArray(studentDetail.attempts) || studentDetail.attempts.length === 0) ? (
                  <div style={{ padding: 14, background: "#fff8f6", border: "1px solid #ffede9", borderRadius: 8, color: "#7f1d1d" }}>
                    No assessment attempts found for this student.
                  </div>
                ) : (
                  (() => {
                    const byTopic = {};
                    studentDetail.attempts.forEach((a) => {
                      const tid = a.topic_id || a.assessment_id || "unknown";
                      if (!byTopic[tid]) byTopic[tid] = [];
                      byTopic[tid].push(a);
                    });

                    // Replace the current map body with this block:
                    return Object.entries(byTopic).map(([tid, attemptsForTopic]) => {
                      const topicObj =
                        (data.topics || []).find((t) => t.id === tid) ||
                        (data.assessments || []).find((a) => a.topic_id === tid) ||
                        null;
                      const topicTitle = topicObj ? (topicObj.name || topicObj.title || topicObj.id) : tid;

                      // compute topic_progress entry for this student (MUST be outside JSX)
                      const studentTP = (studentDetail.student.topic_progress || {})[tid] || {};
                      const extraAttempts = Number(studentTP.extraAttempts || 0);

                      // sort attempts ascending by attempt_number (if present) else by date ascending
                      attemptsForTopic.sort((x, y) => {
                        const ax = x.attempt_number != null ? x.attempt_number : (x.attempted_at ? new Date(x.attempted_at).getTime() : 0);
                        const ay = y.attempt_number != null ? y.attempt_number : (y.attempted_at ? new Date(y.attempted_at).getTime() : 0);
                        return ax - ay;
                      });

                      return (
                        <div
                          key={tid}
                          style={{
                            borderRadius: 10,
                            padding: 12,
                            border: "1px solid rgba(14, 42, 80, 0.06)",
                            background: "linear-gradient(180deg, #ffffff, #fbfdff)",
                            boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 8,
                                height: 32,
                                borderRadius: 4,
                                background: "linear-gradient(180deg,#2563eb,#60a5fa)"
                              }} />
                              <div>
                                <div style={{ fontWeight: 700, color: "#0f172a" }}>{topicTitle}</div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{/* optional subtitle */}</div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                                padding: "6px 10px",
                                borderRadius: 18,
                                background: "#eef2ff",
                                color: "#1e40af",
                                fontWeight: 700,
                                border: "1px solid rgba(37,99,235,0.08)"
                              }}>
                                <span>{attemptsForTopic.length} attempt{attemptsForTopic.length !== 1 ? "s" : ""}</span>
                                {extraAttempts > 0 && (
                                  <span style={{
                                    display: "inline-block",
                                    fontSize: 11,
                                    padding: "4px 8px",
                                    borderRadius: 12,
                                    background: "#fff",
                                    color: "#2563eb",
                                    fontWeight: 700,
                                    boxShadow: "inset 0 -1px 0 rgba(37,99,235,0.06)",
                                    border: "1px solid rgba(37,99,235,0.06)"
                                  }}>
                                    +{extraAttempts} extra
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* centered table block */}
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <table
                              style={{
                                width: "94%",
                                borderCollapse: "collapse",
                                marginTop: 6,
                                tableLayout: "fixed",
                                fontSize: 14,
                                color: "#0b1220"
                              }}
                            >
                              <colgroup>
                                <col style={{ width: 90 }} />
                                <col style={{ width: 170 }} />
                                <col style={{ width: 110 }} />
                                <col />
                              </colgroup>

                              <thead>
                                <tr style={{ textAlign: "center", borderBottom: "1px solid #e6eefc" }}>
                                  <th style={{ padding: "10px 8px", verticalAlign: "middle", fontWeight: 700 }}>Attempt #</th>
                                  <th style={{ padding: "10px 8px", verticalAlign: "middle", fontWeight: 700 }}>Score</th>
                                  <th style={{ padding: "10px 8px", verticalAlign: "middle", fontWeight: 700 }}>Passed</th>
                                  <th style={{ padding: "10px 8px", verticalAlign: "middle", fontWeight: 700 }}>Submitted</th>
                                </tr>
                              </thead>

                              <tbody>
                                {attemptsForTopic.map((at, idx) => {
                                  const attemptNumber = at.attempt_number ?? (idx + 1);
                                  const earned = Number(at.earnedPoints ?? 0);
                                  const total = Number(at.totalPoints ?? (Array.isArray(at.items) ? at.items.length : 0));
                                  const pct = (typeof at.score === "number") ? `${at.score}%` : (total ? `${Math.round((earned / (total || 1)) * 100)}%` : "-");
                                  const scoreDisplay = Array.isArray(at.items) && at.items.length
                                    ? `${earned}/${total} (${pct})`
                                    : (typeof at.score === "number" ? `${at.score}%` : (at.score ?? (at.percentFromItems !== null ? `${at.percentFromItems}%` : "-")));

                                  return (
                                    <tr key={at.id || `${tid}-${attemptNumber}`} style={{ borderBottom: "1px solid #f4f8ff", background: idx % 2 === 0 ? "transparent" : "#fbfdff" }}>
                                      <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: "#0f172a" }}>{attemptNumber}</td>
                                      <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: "#0f172a" }}>{scoreDisplay}</td>
                                      <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: at.passed ? "#065f46" : "#7f1d1d", fontWeight: 600 }}>
                                        {at.passed ? "Yes" : "No"}
                                      </td>
                                      <td style={{ padding: "10px 8px", textAlign: "center", verticalAlign: "middle", color: "#475569" }}>
                                        {at.attempted_at ? new Date(at.attempted_at).toLocaleString() : "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
