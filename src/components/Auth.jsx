import React, { useState, createContext, useContext, useEffect } from "react";

// Firebase imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app load
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      setUser(JSON.parse(userData));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Simulate API call
      const response = await new Promise((resolve) =>
        setTimeout(() => {
          if (email === "user@example.com" && password === "password") {
            resolve({
              user: { id: 1, name: "John Doe", email },
              token: "fake-jwt-token",
            });
          } else {
            resolve({ error: "Invalid credentials" });
          }
        }, 1000)
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      setUser(response.user);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      return { success: true };
    } catch (error) {
      return { success: false, error: "Login failed" };
    }
  };

  const signup = async (userData) => {
    try {
      // Simulate API call
      const response = await new Promise((resolve) =>
        setTimeout(() => {
          // Check if user already exists (for demo purposes)
          const existingUsers = JSON.parse(
            localStorage.getItem("registeredUsers") || "[]"
          );
          const userExists = existingUsers.some(
            (user) => user.email === userData.email
          );

          if (userExists) {
            resolve({ error: "User already exists with this email" });
          } else {
            // Add new user to registered users
            const newUser = {
              id: Date.now(),
              name: userData.name,
              email: userData.email,
              password: userData.password, // In real app, this would be hashed
            };

            existingUsers.push(newUser);
            localStorage.setItem(
              "registeredUsers",
              JSON.stringify(existingUsers)
            );

            resolve({
              user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
              },
              token: "fake-jwt-token-" + Date.now(),
            });
          }
        }, 1000)
      );

      if (response.error) {
        return { success: false, error: response.error };
      }

      setUser(response.user);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      return { success: true };
    } catch (error) {
      return { success: false, error: "Signup failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = {
    user,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Protected Route Component
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? (
    children
  ) : (
    <div>Please log in to view this page.</div>
  );
};

// Login Component
export const Login = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <button onClick={onSwitchToSignup}>Don't have an account? Sign up</button>
    </div>
  );
};

// Signup Component
export const Signup = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const result = await signup(formData);

    if (!result.success) {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        {error && <div>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>
      <button onClick={onSwitchToLogin}>Already have an account? Login</button>
    </div>
  );
};

export const AuthContainer = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      {isLogin ? (
        <Login onSwitchToSignup={() => setIsLogin(false)} />
      ) : (
        <Signup onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
};
