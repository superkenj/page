import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    pass: 0,
    fail: 0,
    avgScore: 0,
    topicsCount: 0,
  });

  useEffect(() => {
    const load = async () => {
      // students
      const stuSnap = await getDocs(collection(db, "students"));
      const students = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalStudents = students.length;

      let pass = 0, fail = 0, sum = 0;
      students.forEach(s => {
        const final = Number(s.final || 0);
        const score = Number(s.score || 0);
        if (final > 0) {
          const threshold = final / 2;
          if (score >= threshold) pass++; else fail++;
        }
        sum += score;
      });
      const avgScore = totalStudents ? +(sum / totalStudents).toFixed(2) : 0;

      // topics
      const topicSnap = await getDocs(collection(db, "topics"));
      const topicsCount = topicSnap.size;

      setStats({ totalStudents, pass, fail, avgScore, topicsCount });
    };
    load();
  }, []);

  const card = (title, value) => (
    <div style={{
      padding: "16px", borderRadius: 12, background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", minWidth: 180
    }}>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {card("Total Students", stats.totalStudents)}
        {card("Pass", stats.pass)}
        {card("Fail", stats.fail)}
        {card("Average Score", stats.avgScore)}
        {card("Topics", stats.topicsCount)}
      </div>
    </div>
  );
}
