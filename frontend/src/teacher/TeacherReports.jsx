// frontend/src/teacher/TeacherReports.jsx
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
  LineChart,
  Line,
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
  const [selectedAssessment, setSelectedAssessment] = useState("all"); // "all" or assessmentId
  const [studentDetail, setStudentDetail] = useState(null); // { student, attempts: [...] }
  const [itemAnalysis, setItemAnalysis] = useState(null); // analysis for selected assessment
  const [modalOpen, setModalOpen] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    fetchReport();
  }, []);

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
      console.debug("reports/student attempts response", { ok: res.ok, status: res.status, body: json });
      let attempts = json.attempts || [];
    } catch (err) {
      console.error("Failed to load report:", err);
      alert("Failed to load reports (see console)");
    } finally {
      setLoading(false);
    }
  }

  // Calculate progress as number of topics with attempts vs total topics
  function topicAttemptsCount(student) {
    // Only count *assessment* attempts — look for topic_progress entries with attempts>0 or last_attempted_at
    if (student.topic_progress && typeof student.topic_progress === "object") {
      return Object.keys(student.topic_progress).reduce((acc, tid) => {
        const tp = student.topic_progress[tid] || {};
        // Only count if this topic has recorded assessment attempts (attempts>0 or last_attempted_at)
        if ((tp.attempts && Number(tp.attempts) > 0) || tp.last_attempted_at) return acc + 1;
        return acc;
      }, 0);
    }

    // No topic_progress -> do NOT fallback to mastered; count is 0 (no assessment attempts recorded)
    return 0;
  }

  // Helper: compute progress ratio and format
  function formatProgress(student) {
    const totalTopics = (data.topics || []).length || 0;
    const attempted = topicAttemptsCount(student);
    const percent = totalTopics ? Math.round((attempted / totalTopics) * 100) : 0;
    return { attempted, totalTopics, percent };
  }

  // Filter + search + sort
  const studentsVisible = useMemo(() => {
    let arr = (data.students || []).slice();

    if (selectedAssessment !== "all") {
      // keep students who attempted or are assigned this assessment
      arr = arr.filter(s => {
        if (!s.topic_progress && !s.attempts) return false;
        // either topic_progress contains that topic or student has submissions on that assessment
        if (s.topic_progress && Object.keys(s.topic_progress).some(k => k === selectedAssessment || k === (selectedAssessment.replace('_assessment','')) )) return true;
        // else fallback keep everyone and let view modal show none
        return false;
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
      // For this simplified view, atrisk = progress < 60%
      arr = arr.filter(s => {
        const { percent } = formatProgress(s);
        return percent < 60;
      });
    }
    // pass/fail filters removed (user asked to remove status)

    arr.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "progress") {
        return formatProgress(b).percent - formatProgress(a).percent;
      }
      if (sortBy === "masteredCount") return (b.masteredCount || 0) - (a.masteredCount || 0);
      return 0;
    });

    return arr;
  }, [data.students, query, filter, sortBy, selectedAssessment]);

  // Top metrics (retain)
  const passFailCounts = useMemo(() => {
    const pass = (data.students || []).filter(s => s.status === "PASS").length;
    const fail = (data.students || []).filter(s => s.status === "FAIL").length;
    return [{ name: "Pass", value: pass }, { name: "Fail", value: fail }];
  }, [data.students]);

  const avgMastery = useMemo(() => {
    const arr = (data.students || []);
    if (!arr.length) return 0;
    const sum = arr.reduce((acc, s) => acc + (formatProgress(s).percent || 0), 0);
    return Math.round(sum / arr.length);
  }, [data.students]);

  const atRiskCount = useMemo(() => {
    return (data.students || []).filter(s => formatProgress(s).percent < 60).length;
  }, [data.students]);

  const avgAttempts = useMemo(() => {
    const arr = (data.students || []);
    const sum = arr.reduce((acc, s) => acc + ((s.attempts && Number(s.attempts)) || 0), 0);
    return arr.length ? Number((sum / arr.length).toFixed(1)) : 0;
  }, [data.students]);

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

  // PDF export (capture reportRef)
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

  // Print
  function printView() {
    window.print();
  }

  // Drill: open student modal and lazy-load attempts (same endpoint)
  async function openStudentDetail(student) {
    setModalOpen(true);
    setStudentDetail({ loading: true, student, attempts: [] });
    try {
      const res = await fetch(`${API_BASE}/reports/student/${encodeURIComponent(student.id)}/attempts`);
      const json = await res.json();
      let attempts = json.attempts || [];

      // Normalize fields for each attempt so UI can rely on consistent names
      attempts = attempts.map(a => {
        const attemptNumber = a.attempt_number ?? a.attemptNumber ?? a.attempt ?? null;
        const attemptedAt = a.attempted_at ?? a.attemptedAt ?? null;

        // Ensure items array exists
        const items = Array.isArray(a.items) ? a.items : [];

        // compute earned/total when possible
        const earned = items.reduce((acc, it) => acc + (Number(it.points_awarded || 0)), 0);
        const totalQ = items.length;
        // If the backend provided totalPoints/earnedPoints, prefer that (compat)
        const earnedPoints = (typeof a.earnedPoints === "number") ? a.earnedPoints : earned;
        const totalPoints = (typeof a.totalPoints === "number") ? a.totalPoints : totalQ;

        // keep score if present (percent), else compute percent from score or items
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

      // Sort attempts: prefer attempted_at desc, else attempt_number desc
      attempts.sort((x, y) => {
        const tA = x.attempted_at ? new Date(x.attempted_at).getTime() : (x.attempt_number ?? 0);
        const tB = y.attempted_at ? new Date(y.attempted_at).getTime() : (y.attempt_number ?? 0);
        return tB - tA;
      });

      // FALLBACK: synthesize attempts from student.topic_progress if endpoint returned none
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

  // Drill: load item analysis for selected assessment
  async function loadItemAnalysis(assessmentId) {
    setItemAnalysis({ loading: true });
    try {
      const res = await fetch(`${API_BASE}/reports/assessment/${encodeURIComponent(assessmentId)}/item-analysis`);
      const json = await res.json();
      setItemAnalysis({ loading: false, analysis: json });
    } catch (err) {
      console.error("Failed to load item analysis", err);
      setItemAnalysis({ loading: false, analysis: null, error: true });
    }
  }

  // Whenever selectedAssessment changes (and not "all"), fetch analysis
  useEffect(() => {
    if (selectedAssessment && selectedAssessment !== "all") {
      loadItemAnalysis(selectedAssessment);
    } else {
      setItemAnalysis(null);
    }
  }, [selectedAssessment]);

  if (loading) return <div style={{ padding: 20 }}>Loading reports...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>🧾 Performance Reports (Assessment-first)</h1>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search student..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", width: 260 }}
        />

        <select value={selectedAssessment} onChange={e => setSelectedAssessment(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">All assessments</option>
          {(data.assessments || []).map(a => (
            <option key={a.id} value={a.id}>
              {a.title} {a.dueDate ? `(${a.dueDate.slice(0, 10)})` : ""}
            </option>
          ))}
        </select>

        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="all">All</option>
          <option value="atrisk">At-risk</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="name">Sort: Name</option>
          <option value="progress">Sort: Progress</option>
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
        <div style={{ display: "flex", gap: 16, alignItems: "stretch", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 260px", minHeight: 120, padding: 12, borderRadius: 8, border: "1px solid #eef2ff" }}>
            <h3 style={{ margin: 0 }}>Summary</h3>
            <div style={{ marginTop: 8 }}>
              <div>Total students: <strong>{data.students.length}</strong></div>
              <div>Avg mastery: <strong>{avgMastery}%</strong></div>
              <div>At-risk: <strong>{atRiskCount}</strong></div>
              <div>Avg attempts: <strong>{avgAttempts}</strong></div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 160, padding: 8 }}>
            <h4 style={{ margin: 0 }}>Pass / Fail</h4>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={passFailCounts}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ flex: "0 0 320px", padding: 8 }}>
            <h4 style={{ marginTop: 0 }}>Assessment Item Analysis (selected)</h4>
            {selectedAssessment === "all" ? (
              <div style={{ fontSize: 13, color: "#555" }}>Select an assessment to view item-level issues (low p-value, low discrimination).</div>
            ) : itemAnalysis?.loading ? (
              <div>Loading analysis...</div>
            ) : itemAnalysis?.analysis?.items?.length ? (
              <div style={{ maxHeight: 140, overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr><th style={{ textAlign: "left" }}>Q</th><th style={{ textAlign: "right" }}>Correct%</th></tr>
                  </thead>
                  <tbody>
                    {itemAnalysis.analysis.items.map((it, idx) => (
                      <tr key={it.questionId}>
                        <td>{(idx+1)}. {it.shortText || it.text?.slice(0,60)}</td>
                        <td style={{ textAlign: "right" }}>{Math.round((it.correctPercent||0))}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : itemAnalysis?.analysis === null ? (
              <div style={{ color: "#888" }}>No analysis found for this assessment.</div>
            ) : (
              <div style={{ color: "#888" }}>Select an assessment to load analysis.</div>
            )}
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
                  <th style={{ padding: 8, width: 260 }}>Progress</th>
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
                  // progress bar color
                  const barColor = percent >= 85 ? "#16a34a" : percent >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #fafafa" }}>
                      <td style={{ padding: 8 }}>{s.id}</td>
                      <td style={{ padding: 8 }}>{s.name}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            title={tooltipText}
                            style={{
                              width: "70%",       // move bar more centered
                              background: "#f3f4f6",
                              height: 18,
                              borderRadius: 10,
                              overflow: "hidden",
                              position: "relative"
                            }}
                          >
                            {/* filled portion */}
                            <div
                              style={{
                                width: `${percent}%`,
                                height: "100%",
                                background: barColor,
                                transition: "width 300ms",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",   // fully centered
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            />

                            {/* centered label overlay (always centered regardless of fill width) */}
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
                                color: "#000",
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
                            onClick={() => {
                              fetch(`${API_BASE}/teachers/assign-remediation`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ studentId: s.id, assessmentId: selectedAssessment === "all" ? null : selectedAssessment }),
                              })
                                .then(r => {
                                  if (!r.ok) throw new Error("failed");
                                  alert("Remediation assigned (backend must implement endpoint).");
                                })
                                .catch(err => {
                                  console.error(err);
                                  alert("Failed to assign remediation (see console).");
                                });
                            }}
                            style={{ padding: "6px 8px", borderRadius: 6 }}
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

        {/* Optional: per-student radar chart for mastery (show top N students) */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Mastery Snapshot (sample)</h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {studentsVisible.slice(0, 3).map(s => {
              const radarData =
                (data.topics || []).slice(0, 6).map(t => ({
                  topic: t.name,
                  value: (s.mastered || []).includes(t.id) ? 100 : Math.round((s.topicMastery?.[t.id] || 0) * 100) || 0,
                }));
              return (
                <div key={s.id} style={{ width: 300, height: 300, background: "#fff", borderRadius: 8, padding: 8, border: "1px solid #eef2ff" }}>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>{s.name}</h4>
                  <ResponsiveContainer width="100%" height="85%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="topic" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name={s.name} dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
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
                {/* If no attempts were returned, show explicit message */}
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

                    return Object.entries(byTopic).map(([tid, attemptsForTopic]) => {
                      // find topic title from data.topics or assessments
                      const topicObj =
                        (data.topics || []).find((t) => t.id === tid) ||
                        (data.assessments || []).find((a) => a.topic_id === tid) ||
                        null;
                      const topicTitle = topicObj ? (topicObj.name || topicObj.title || topicObj.id) : tid;

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
                                <div style={{ fontSize: 12, color: "#64748b" }}>{/* optional subtitle - empty for now */}</div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              <span style={{
                                display: "inline-block",
                                fontSize: 12,
                                padding: "6px 10px",
                                borderRadius: 18,
                                background: "#eef2ff",
                                color: "#1e40af",
                                fontWeight: 700,
                                border: "1px solid rgba(37,99,235,0.08)"
                              }}>
                                {attemptsForTopic.length} attempt(s)
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
