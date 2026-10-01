import { useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/api/auth/login",
        {
          email,
          password,
        }
      );

      localStorage.setItem("token", response.data.token);

      setIsLoggedIn(true);
    } catch (error: any) {
      console.error("Login error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed"
      );
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      await axios.post(
        "http://127.0.0.1:5000/api/auth/register",
        {
          name,
          email,
          password,
        }
      );

      alert("Registration successful! Please login.");

      setName("");
      setEmail("");
      setPassword("");

      setIsLogin(true);
    } catch (error: any) {
      console.error("Register error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Registration failed"
      );
    }
  };

  if (isLoggedIn) {
    return <Dashboard />;
  }

  return (
    <div className="app">
      <div className="auth-container">

        <div className="brand-section">
          <h1>IntellMeet</h1>
          <p>
            AI-Powered Enterprise Meeting & Collaboration Platform
          </p>
        </div>

        <div className="auth-box">

          {isLogin ? (
            <>
              <h2>Welcome Back</h2>

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button onClick={handleLogin}>
                Login
              </button>

              <p>
                Don't have an account?{" "}
                <span
                  onClick={() => setIsLogin(false)}
                  style={{
                    cursor: "pointer",
                    color: "blue",
                  }}
                >
                  Register
                </span>
              </p>
            </>
          ) : (
            <>
              <h2>Create Account</h2>

              <label>Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <label>Email</label>

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <label>Password</label>

              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button onClick={handleRegister}>
                Register
              </button>

              <p>
                Already have an account?{" "}
                <span
                  onClick={() => setIsLogin(true)}
                  style={{
                    cursor: "pointer",
                    color: "blue",
                  }}
                >
                  Login
                </span>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;