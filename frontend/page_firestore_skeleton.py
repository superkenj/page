# PaGe System Skeleton (Firestore-based)
# ======================================
# Monorepo layout aligned with thesis requirements

PaGe/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint
│   │   ├── routers/
│   │   │   ├── students.py      # Student APIs
│   │   │   ├── teachers.py      # Teacher APIs
│   │   │   ├── recommender.py   # Path generator APIs
│   │   ├── services/
│   │   │   ├── firestore.py     # Firestore client setup
│   │   │   ├── graph.py         # NetworkX-based learning path logic
│   │   ├── models/
│   │   │   ├── schemas.py       # Pydantic schemas
│   │   └── __init__.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── seed.py                  # Seed Firestore with subjects/topics
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   ├── components/
│   │   │   ├── QuizForm.tsx
│   │   │   ├── PathView.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml
├── README.md
└── .gitignore

# --- backend/requirements.txt ---
fastapi==0.110.0
uvicorn==0.29.0
google-cloud-firestore==2.16.0
networkx==3.2.1
python-dotenv==1.0.1

# --- backend/Dockerfile ---
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# --- backend/app/main.py ---
from fastapi import FastAPI
from app.routers import students, teachers, recommender

app = FastAPI(title="PaGe Backend")

app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(teachers.router, prefix="/teachers", tags=["Teachers"])
app.include_router(recommender.router, prefix="/recommender", tags=["Recommender"])

# --- backend/app/services/firestore.py ---
import os
from google.cloud import firestore

# Load service account from environment variable
SERVICE_ACCOUNT_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccount.json")

# Firestore client
client = firestore.Client.from_service_account_json(SERVICE_ACCOUNT_PATH)

# Example: get collection
subjects_ref = client.collection("subjects")

# --- backend/app/services/graph.py ---
import networkx as nx

# Build DAG of math topics
def build_graph():
    G = nx.DiGraph()
    G.add_edges_from([
        ("Addition", "Multiplication"),
        ("Multiplication", "Fractions"),
        ("Fractions", "Decimals"),
    ])
    return G

# Recommend path based on prerequisites
def recommend_path(start, goal):
    G = build_graph()
    return nx.shortest_path(G, source=start, target=goal)

# --- backend/app/routers/recommender.py ---
from fastapi import APIRouter
from app.services.graph import recommend_path

router = APIRouter()

@router.get("/path")
def get_path(start: str, goal: str):
    try:
        path = recommend_path(start, goal)
        return {"learning_path": path}
    except Exception as e:
        return {"error": str(e)}

# --- docker-compose.yml ---
version: "3.9"
services:
  backend:
    build: ./backend
    container_name: page-backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/app:/app/app
      - ./backend/serviceAccount.json:/app/serviceAccount.json:ro
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccount.json
  frontend:
    build: ./frontend
    container_name: page-frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    stdin_open: true
    tty: true

# --- frontend/package.json ---
{
  "name": "page-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}

# --- frontend/src/App.tsx ---
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
