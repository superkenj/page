import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

function Students() {
  const [students, setStudents] = useState([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [final, setFinal] = useState("");

  // Fetch all students
  const fetchData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "students"));
      const data = querySnapshot.docs.map(docSnap => {
        const student = docSnap.data();

        // For backward compatibility
        const totalFinal = student.final || 0;
        const totalScore = student.score || 0;

        // Compute status
        const passThreshold = totalFinal / 2;
        const status = totalScore >= passThreshold ? "PASS" : "FAIL";

        return {
          id: docSnap.id,
          ...student,
          totalScore,
          totalFinal,
          status
        };
      });
      setStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add or Update a student with custom ID
  const addStudent = async (e) => {
    e.preventDefault();
    if (!id || !name || !score || !final) {
      alert("Please fill out all fields");
      return;
    }

    // Validation: score cannot exceed final
    if (Number(score) > Number(final)) {
      alert("Score cannot be greater than Final score");
      return;
    }

    try {
      // Future-proof schema
      await setDoc(doc(db, "students", id), {
        name,
        // Store topic-level scores under "scores"
        scores: {
          general: Number(score), // placeholder for now
        },
        finals: {
          general: Number(final),
        },
        mastered: [], // empty array for now
        // Keep top-level score/final for quick dashboard
        score: Number(score),
        final: Number(final),
      });

      // Reset form
      setId("");
      setName("");
      setScore("");
      setFinal("");

      // Refresh list
      fetchData();
    } catch (err) {
      console.error("Error adding student:", err);
    }
  };

  // Dashboard summary
  const totalStudents = students.length;
  const totalPass = students.filter(s => s.status === "PASS").length;
  const totalFail = totalStudents - totalPass;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Manage Students</h1>

      {/* Dashboard summary */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>Total:</strong> {totalStudents} |
        <span style={{ color: "green", marginLeft: "0.5rem" }}>Pass: {totalPass}</span> |
        <span style={{ color: "red", marginLeft: "0.5rem" }}>Fail: {totalFail}</span>
      </div>

      {/* Add Student Form */}
      <form onSubmit={addStudent} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Student ID"
          value={id}
          onChange={e => setId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Score"
          value={score}
          onChange={e => setScore(e.target.value)}
        />
        <input
          type="number"
          placeholder="Final Score"
          value={final}
          onChange={e => setFinal(e.target.value)}
        />
        <button type="submit">Save Student</button>
      </form>

      {/* Display Students */}
      <ul>
        {students.map(student => (
          <li key={student.id}>
            {student.id}: {student.name} → Score {student.totalScore}/{student.totalFinal} → {student.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Students;
