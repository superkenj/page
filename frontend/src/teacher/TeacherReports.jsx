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
  const [sortBy, setSortBy] = useState("name"); // name | score | progress | masteredCount
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
      // Get initial aggregates: students, topics, assessments
      const res = await fetch(`${API_BASE}/reports/performance`);
      // expected: { students: [...], topics: [...], assessments: [...] }
      const json = await res.json();
      // Backwards compatibility: ensure arrays exist
      setData({
        students: json.students || [],
        topics: json.topics || [],
        assessments: json.assessments || [],
      });
    } catch (err) {
      console.error("Failed to load report:", err);
      alert("Failed to load reports (see console)");
    } finally {
      setLoading(false);
    }
  }

  // Helper: robust progress calculation (tries several fields)
  function calcProgress(student) {
    // 1) if backend provides explicit progress 0-100
    if (typeof student.progress === "number") return clamp(Math.round(student.progress));

    // 2) if masteryScore provided 0-1 or 0-100
    if (typeof student.masteryScore === "number") {
      if (student.masteryScore <= 1) return clamp(Math.round(student.masteryScore * 100));
      return clamp(Math.round(student.masteryScore));
    }

    // 3) if topic counts available: masteredCount / totalTopics
    const totalTopics = data.topics?.length || student.totalTopics || 0;
    if (typeof student.masteredCount === "number" && totalTopics > 0) {
      return clamp(Math.round((student.masteredCount / totalTopics) * 100));
    }

    // 4) if completedLessons / assignedLessons
    if (typeof student.completedLessons === "number" && typeof student.assignedLessons === "number" && student.assignedLessons > 0) {
      return clamp(Math.round((student.completedLessons / student.assignedLessons) * 100));
    }

    // fallback: if score exists assume normalized to 100
    if (typeof student.score === "number") {
      return clamp(Math.round(student.score));
    }

    return 0;
  }

  // At-risk detection: progress < 60 OR status FAIL OR repeated low attempts
  function isAtRisk(student) {
    const p = calcProgress(student);
    if (student.status === "FAIL") return true;
    if (p < 60) return true;
    // optional: if many attempts but low score (attempts > 2 && score < 50)
    if ((student.attempts || 0) > 2 && (student.score || 0) < 50) return true;
    return false;
  }

  // Filter + search + sort; also allows assessment filter
  const studentsVisible = useMemo(() => {
    let arr = (data.students || []).slice();
    if (selectedAssessment !== "all") {
      // keep students who attempted or are assigned this assessment
      arr = arr.filter(s => {
        if (!s.assessments) return false;
        return s.assessments.some(a => a.id === selectedAssessment || a.assessmentId === selectedAssessment);
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
    if (filter === "pass") arr = arr.filter(s => s.status === "PASS");
    if (filter === "fail") arr = arr.filter(s => s.status === "FAIL");
    if (filter === "atrisk") arr = arr.filter(s => isAtRisk(s));

    arr.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "progress") return calcProgress(b) - calcProgress(a);
      if (sortBy === "masteredCount") return (b.masteredCount || 0) - (a.masteredCount || 0);
      return 0;
    });

    return arr;
  }, [data.students, query, filter, sortBy, selectedAssessment]);

  // Top metrics
  const passFailCounts = useMemo(() => {
    const pass = (data.students || []).filter(s => s.status === "PASS").length;
    const fail = (data.students || []).filter(s => s.status === "FAIL").length;
    return [{ name: "Pass", value: pass }, { name: "Fail", value: fail }];
  }, [data.students]);

  const avgMastery = useMemo(() => {
    const arr = (data.students || []).filter(s => typeof calcProgress(s) === "number");
    if (!arr.length) return 0;
    const sum = arr.reduce((acc, s) => acc + calcProgress(s), 0);
    return Math.round(sum / arr.length);
  }, [data.students]);

  const atRiskCount = useMemo(() => {
    return (data.students || []).filter(s => isAtRisk(s)).length;
  }, [data.students]);

  const avgAttempts = useMemo(() => {
    const arr = (data.students || []);
    const sum = arr.reduce((acc, s) => acc + (s.attempts || 0), 0);
    return arr.length ? Number((sum / arr.length).toFixed(1)) : 0;
  }, [data.students]);

  // CSV export uses visible students and includes progress
  function exportCSV() {
    const rows = studentsVisible.map(s => ({
      id: s.id,
      name: s.name,
      gender: s.gender ? (s.gender[0] || "").toUpperCase() : "",
      score: s.score ?? "",
      progress: calcProgress(s),
      final: s.final ?? "",
      status: s.status,
      attempts: s.attempts ?? 0,
      masteredCount: s.masteredCount ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
      pdf.save(`performance_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed", err);
      alert("Failed to export PDF (see console)");
    }
  }

  // Print
  function printView() {
    window.print();
  }

  // Drill: open student modal and lazy-load attempts
  async function openStudentDetail(student) {
    setModalOpen(true);
    setStudentDetail({ loading: true, student, attempts: [] });
    try {
      const res = await fetch(`${API_BASE}/reports/student/${encodeURIComponent(student.id)}/attempts`);
      const json = await res.json();
      setStudentDetail({ loading: false, student, attempts: json.attempts || [] });
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
      // expected: { items: [{ questionId, text, pValue, correctPercent, avgTime }] }
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
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="atrisk">At-risk</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: 8, borderRadius: 6 }}>
          <option value="name">Sort: Name</option>
          <option value="score">Sort: Score</option>
          <option value="progress">Sort: Progress</option>
          <option value="masteredCount">Sort: Mastered</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={exportCSV} style={{ padding: "8px 10px", borderRadius: 6 }}>
            ⬇ CSV
          </button>
          <button onClick={exportPDF} style={{ padding: "8px 10px", borderRadius: 6 }}>
            ⬇ PDF
          </button>
          <button onClick={printView} style={{ padding: "8px 10px", borderRadius: 6 }}>
            🖨 Print
          </button>
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
                  <th style={{ padding: 8, width: 120 }}>ID</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8, width: 50 }}>G</th>
                  <th style={{ padding: 8, width: 120, textAlign: "right" }}>Score</th>
                  <th style={{ padding: 8, width: 160 }}>Progress</th>
                  <th style={{ padding: 8, width: 110 }}>Status</th>
                  <th style={{ padding: 8, width: 140 }}>Mastered</th>
                  <th style={{ padding: 8, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsVisible.map(s => {
                  const progress = calcProgress(s);
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid #fafafa" }}>
                      <td style={{ padding: 8 }}>{s.id}</td>
                      <td style={{ padding: 8 }}>{s.name}</td>
                      <td style={{ padding: 8 }}>{s.gender ? (s.gender[0]?.toUpperCase() === "M" ? "M" : s.gender[0]?.toUpperCase()) : "-"}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{(s.score ?? "-") + (s.final ? ` / ${s.final}` : "")}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, background: "#f3f4f6", height: 14, borderRadius: 8, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${progress}%`,
                                height: "100%",
                                background: progress >= 85 ? "#16a34a" : progress >= 60 ? "#f59e0b" : "#ef4444",
                                transition: "width 300ms",
                              }}
                            />
                          </div>
                          <div style={{ width: 44, fontSize: 12, textAlign: "right" }}>{progress}%</div>
                        </div>
                      </td>
                      <td style={{ padding: 8 }}>{s.status}</td>
                      <td style={{ padding: 8 }}>{s.masteredCount ?? 0}</td>
                      <td style={{ padding: 8 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openStudentDetail(s)} style={{ padding: "6px 8px", borderRadius: 6 }}>
                            View
                          </button>
                          <button
                            onClick={() => {
                              // quick action: assign remediation (example)
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
                          <button
                            onClick={() => {
                              // quick message action - opens mailto
                              window.open(`mailto:${s.email || ""}?subject=Regarding your progress`);
                            }}
                            style={{ padding: "6px 8px", borderRadius: 6 }}
                          >
                            Message
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

      {/* Modal: student detail */}
      {modalOpen && studentDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => {
            setModalOpen(false);
            setStudentDetail(null);
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 900, maxHeight: "80vh", overflowY: "auto", background: "#fff", padding: 16, borderRadius: 8 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{studentDetail.student.name} — Attempts</h3>
              <div>
                <button onClick={() => { setModalOpen(false); setStudentDetail(null); }} style={{ padding: 6, borderRadius: 6 }}>
                  Close
                </button>
              </div>
            </div>

            {studentDetail.loading ? (
              <div>Loading attempts...</div>
            ) : studentDetail.error ? (
              <div style={{ color: "red" }}>Failed to load attempts.</div>
            ) : (
              <>
                <div style={{ marginTop: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                        <th style={{ padding: 8 }}>Assessment</th>
                        <th style={{ padding: 8 }}>Score</th>
                        <th style={{ padding: 8 }}>Submitted</th>
                        <th style={{ padding: 8 }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentDetail.attempts.map(a => (
                        <tr key={a.id || `${a.assessmentId}-${a.submittedAt}`} style={{ borderBottom: "1px solid #fafafa" }}>
                          <td style={{ padding: 8 }}>{a.assessmentTitle || a.assessmentId}</td>
                          <td style={{ padding: 8 }}>{a.score ?? "-"}</td>
                          <td style={{ padding: 8 }}>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "-"}</td>
                          <td style={{ padding: 8 }}>{a.durationSeconds ? `${Math.round(a.durationSeconds / 60)}m` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
