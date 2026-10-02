
import { useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";

function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "https://intellmeet-backend-u3jz.onrender.com/api/auth/login",
        {
          email: email,
          password: password,
        }
      );

      const token = response.data.token;

      if (!token) {
        alert("Login failed: authentication token was not received.");
        return;
      }

      localStorage.setItem("token", token);

      let loggedInUser = response.data.user;

      if (!loggedInUser) {
        try {
          const profileResponse = await axios.get(
            "https://intellmeet-backend-u3jz.onrender.com/api/auth/profile",
            {
              headers: {
                Authorization: "Bearer " + token,
              },
            }
          );

          loggedInUser = profileResponse.data.user;
        } catch (profileError) {
          console.error(
            "Unable to retrieve user profile:",
            profileError
          );
        }
      }

      if (loggedInUser) {
        localStorage.setItem(
          "user",
          JSON.stringify(loggedInUser)
        );
      }

      console.log("Login successful");
      console.log(
        "Saved user:",
        localStorage.getItem("user")
      );

      setIsLoggedIn(true);
    } catch (error: any) {
      console.error("Login error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        "https://intellmeet-backend-u3jz.onrender.com/api/auth/register",
        {
          name: name,
          email: email,
          password: password,
        }
      );

      alert(
        "Registration successful! Please login."
      );

      setName("");
      setEmail("");
      setPassword("");

      setIsLogin(true);
    } catch (error: any) {
      console.error(
        "Register error:",
        error
      );

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (isLoggedIn) {
    return <Dashboard />;
  }

  return (
    <div className="auth-page">

      <div className="auth-brand">

        <div className="auth-brand-content">

          <div className="brand-logo">

            <div className="brand-icon">
              IM
            </div>

            <span>
              IntellMeet
            </span>

          </div>

          <div className="brand-message">

            <h1>
              Smarter meetings.
              <br />
              Better collaboration.
            </h1>

            <p>
              A modern meeting and collaboration
              platform designed to help teams
              communicate, connect and work together.
            </p>

          </div>

          <div className="brand-features">

            <div className="brand-feature">

              <span>✓</span>

              <div>

                <strong>
                  Secure team meetings
                </strong>

                <p>
                  Connect with your team in a
                  secure environment.
                </p>

              </div>

            </div>

            <div className="brand-feature">

              <span>✓</span>

              <div>

                <strong>
                  Real-time collaboration
                </strong>

                <p>
                  Chat and collaborate during meetings.
                </p>

              </div>

            </div>

            <div className="brand-feature">

              <span>✓</span>

              <div>

                <strong>
                  AI-powered assistance
                </strong>

                <p>
                  Turn meeting discussions into
                  useful insights.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

      <div className="auth-panel">

        <div className="auth-container">

          <div className="mobile-brand">

            <div className="brand-icon">
              IM
            </div>

            <span>
              IntellMeet
            </span>

          </div>

          <div className="auth-box">

            <div className="auth-heading">

              <h2>
                {isLogin
                  ? "Welcome back"
                  : "Create your account"}
              </h2>

              <p>
                {isLogin
                  ? "Sign in to continue to your workspace."
                  : "Create an account to start collaborating."}
              </p>

            </div>

            {!isLogin && (

              <div className="form-group">

                <label>
                  Name
                </label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                />

              </div>

            )}

            <div className="form-group">

              <label>
                Email address
              </label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label>
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    isLogin
                  ) {
                    handleLogin();
                  }
                }}
              />

            </div>

            <button
              className="auth-button"
              onClick={
                isLogin
                  ? handleLogin
                  : handleRegister
              }
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign in"
                : "Create account"}
            </button>

            <div className="auth-switch">

              {isLogin ? (
                <>
                  Don't have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      setIsLogin(false)
                    }
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}

                  <button
                    type="button"
                    onClick={() =>
                      setIsLogin(true)
                    }
                  >
                    Sign in
                  </button>
                </>
              )}

            </div>

          </div>

          <div className="auth-footer">
            © 2026 IntellMeet · AI-powered collaboration
          </div>

        </div>

      </div>

    </div>
  );
}

export default App;
