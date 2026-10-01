import { useEffect, useState } from "react";
import axios from "axios";
import CreateMeeting from "./CreateMeeting";
import JoinMeeting from "./JoinMeeting";

interface Meeting {
  _id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  description: string;
  meetingId: string;
}

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

function Dashboard() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);


  // =========================
  // LOAD MEETINGS
  // =========================

  const loadMeetings = async () => {
    try {
      setLoadingMeetings(true);

      const response = await axios.get(
        "https://intellmeet-backend-u3jz.onrender.com/api/meetings/all"
      );

      setMeetings(response.data.meetings || []);

    } catch (error) {
      console.error("Error loading meetings:", error);
    } finally {
      setLoadingMeetings(false);
    }
  };


  // =========================
  // LOAD PROFILE
  // =========================

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      const token = localStorage.getItem("token");

      const response = await axios.get(
        "https://intellmeet-backend-u3jz.onrender.com/api/auth/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProfile(response.data.user);

    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };


  useEffect(() => {
    if (
      activeMenu === "Dashboard" ||
      activeMenu === "Meetings" ||
      activeMenu === "History"
    ) {
      loadMeetings();
    }

    if (activeMenu === "Profile") {
      loadProfile();
    }

  }, [activeMenu]);


  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };


  return (
    <div className="dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-logo">

          <h2>
            IntellMeet
          </h2>

          <p>
            AI Collaboration
          </p>

        </div>


        <nav>

          <button
            onClick={() => setActiveMenu("Dashboard")}
            className={
              activeMenu === "Dashboard"
                ? "active"
                : ""
            }
          >
            Dashboard
          </button>


          <button
            onClick={() => setActiveMenu("Meetings")}
            className={
              activeMenu === "Meetings"
                ? "active"
                : ""
            }
          >
            Meetings
          </button>


          <button
            onClick={() => setActiveMenu("Create Meeting")}
            className={
              activeMenu === "Create Meeting"
                ? "active"
                : ""
            }
          >
            Create Meeting
          </button>


          <button
            onClick={() => setActiveMenu("Join Meeting")}
            className={
              activeMenu === "Join Meeting"
                ? "active"
                : ""
            }
          >
            Join Meeting
          </button>


          <button
            onClick={() => setActiveMenu("History")}
            className={
              activeMenu === "History"
                ? "active"
                : ""
            }
          >
            Meeting History
          </button>


          <button
            onClick={() => setActiveMenu("Profile")}
            className={
              activeMenu === "Profile"
                ? "active"
                : ""
            }
          >
            Profile
          </button>

        </nav>


        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </aside>


      {/* MAIN CONTENT */}

      <main className="dashboard-main">


        {/* CREATE MEETING */}

        {activeMenu === "Create Meeting" && (
          <CreateMeeting />
        )}


        {/* JOIN MEETING */}

        {activeMenu === "Join Meeting" && (
          <JoinMeeting />
        )}


        {/* DASHBOARD */}

        {activeMenu === "Dashboard" && (

          <>

            <header className="dashboard-header">

              <div>

                <h1>
                  Welcome to IntellMeet
                </h1>

                <p>
                  Manage your meetings and collaboration from one place.
                </p>

              </div>


              <div className="user-info">

                <span>
                  {profile?.name || "Kalpana Test"}
                </span>

              </div>

            </header>


            <section className="stats-grid">

              <div className="stat-card">

                <h3>
                  Total Meetings
                </h3>

                <strong>
                  {meetings.length}
                </strong>

                <p>
                  Meetings created
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  Upcoming Meetings
                </h3>

                <strong>
                  {meetings.length}
                </strong>

                <p>
                  Scheduled meetings
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  Completed
                </h3>

                <strong>
                  0
                </strong>

                <p>
                  Completed meetings
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  Team Members
                </h3>

                <strong>
                  1
                </strong>

                <p>
                  Active members
                </p>

              </div>

            </section>


            <section className="quick-actions">

              <h2>
                Quick Actions
              </h2>


              <div className="action-grid">

                <button
                  className="action-card"
                  onClick={() =>
                    setActiveMenu("Create Meeting")
                  }
                >

                  <h3>
                    Create New Meeting
                  </h3>

                  <p>
                    Schedule a new meeting with your team.
                  </p>

                </button>


                <button
                  className="action-card"
                  onClick={() =>
                    setActiveMenu("Join Meeting")
                  }
                >

                  <h3>
                    Join Meeting
                  </h3>

                  <p>
                    Join an existing meeting using a meeting ID.
                  </p>

                </button>


                <button
                  className="action-card"
                  onClick={() =>
                    setActiveMenu("History")
                  }
                >

                  <h3>
                    Meeting History
                  </h3>

                  <p>
                    View your previous meetings.
                  </p>

                </button>

              </div>

            </section>


            <section className="recent-meetings">

              <h2>
                Recent Meetings
              </h2>


              {meetings.length === 0 ? (

                <div className="empty-state">

                  <h3>
                    No meetings yet
                  </h3>

                  <p>
                    Create your first meeting to get started with IntellMeet.
                  </p>

                </div>

              ) : (

                meetings.slice(0, 5).map((meeting) => (

                  <div
                    key={meeting._id}
                    className="meeting-created"
                  >

                    <h3>
                      {meeting.title}
                    </h3>

                    <p>
                      {meeting.date} at {meeting.time}
                    </p>

                    <p>
                      Meeting ID:{" "}
                      <strong>
                        {meeting.meetingId}
                      </strong>
                    </p>

                  </div>

                ))

              )}

            </section>

          </>

        )}


        {/* MEETINGS */}

        {activeMenu === "Meetings" && (

          <div className="create-meeting">

            <div className="create-header">

              <h1>
                Meetings
              </h1>

              <p>
                View all meetings created in IntellMeet.
              </p>

            </div>


            {loadingMeetings ? (

              <div className="meeting-form">

                <h3>
                  Loading meetings...
                </h3>

              </div>

            ) : meetings.length === 0 ? (

              <div className="meeting-form">

                <h3>
                  No meetings found
                </h3>

                <p>
                  Create a meeting to see it here.
                </p>

              </div>

            ) : (

              meetings.map((meeting) => (

                <div
                  key={meeting._id}
                  className="meeting-created"
                >

                  <h2>
                    {meeting.title}
                  </h2>

                  <p>
                    <strong>Date:</strong>{" "}
                    {meeting.date}
                  </p>

                  <p>
                    <strong>Time:</strong>{" "}
                    {meeting.time}
                  </p>

                  <p>
                    <strong>Duration:</strong>{" "}
                    {meeting.duration} minutes
                  </p>

                  <p>
                    <strong>Meeting ID:</strong>{" "}
                    {meeting.meetingId}
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {meeting.description || "No description"}
                  </p>

                </div>

              ))

            )}

          </div>

        )}


        {/* HISTORY */}

        {activeMenu === "History" && (

          <div className="create-meeting">

            <div className="create-header">

              <h1>
                Meeting History
              </h1>

              <p>
                View all your created meetings.
              </p>

            </div>


            {loadingMeetings ? (

              <div className="meeting-form">

                <h3>
                  Loading meeting history...
                </h3>

              </div>

            ) : meetings.length === 0 ? (

              <div className="meeting-form">

                <h3>
                  No meeting history found
                </h3>

                <p>
                  Your created meetings will appear here.
                </p>

              </div>

            ) : (

              meetings.map((meeting) => (

                <div
                  key={meeting._id}
                  className="meeting-created"
                >

                  <h2>
                    {meeting.title}
                  </h2>

                  <p>
                    <strong>Date:</strong>{" "}
                    {meeting.date}
                  </p>

                  <p>
                    <strong>Time:</strong>{" "}
                    {meeting.time}
                  </p>

                  <p>
                    <strong>Duration:</strong>{" "}
                    {meeting.duration} minutes
                  </p>

                  <p>
                    <strong>Meeting ID:</strong>{" "}
                    {meeting.meetingId}
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {meeting.description || "No description"}
                  </p>

                </div>

              ))

            )}

          </div>

        )}


        {/* PROFILE */}

        {activeMenu === "Profile" && (

          <div className="create-meeting">

            <div className="create-header">

              <h1>
                My Profile
              </h1>

              <p>
                View your IntellMeet account information.
              </p>

            </div>


            {loadingProfile ? (

              <div className="meeting-form">

                <h3>
                  Loading profile...
                </h3>

              </div>

            ) : profile ? (

              <div className="meeting-form">

                <h2>
                  Account Information
                </h2>


                <label>
                  Name
                </label>

                <input
                  type="text"
                  value={profile.name}
                  readOnly
                />


                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={profile.email}
                  readOnly
                />


                <label>
                  Role
                </label>

                <input
                  type="text"
                  value={profile.role}
                  readOnly
                />


                <button
                  className="create-meeting-button"
                  onClick={handleLogout}
                >
                  Logout
                </button>

              </div>

            ) : (

              <div className="meeting-form">

                <h3>
                  Unable to load profile
                </h3>

                <p>
                  Please login again.
                </p>

              </div>

            )}

          </div>

        )}

      </main>

    </div>
  );
}

export default Dashboard;