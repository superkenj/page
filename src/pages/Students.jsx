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
        const passThreshold = student.final / 2;
        const status = student.score >= passThreshold ? "PASS" : "FAIL";
        return {
          id: docSnap.id,
          ...student,
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

    try {
      await setDoc(doc(db, "students", id), {
        name,
        score: Number(score),
        final: Number(final)
      });
      setId("");
      setName("");
      setScore("");
      setFinal("");
      fetchData(); // refresh list
    } catch (err) {
      console.error("Error adding student:", err);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Manage Students</h1>

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
            {student.id}: {student.name} → Score {student.score}/{student.final} → {student.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Students;
