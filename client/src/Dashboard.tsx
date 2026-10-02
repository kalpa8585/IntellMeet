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

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  const userName = profile?.name || "Kalpana";

  const upcomingMeetings = meetings.length;

  return (
    <div className="dashboard">

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="sidebar-brand-icon">
            IM
          </div>

          <div>
            <h2>IntellMeet</h2>
            <span>AI Collaboration</span>
          </div>

        </div>


        {/* WORKSPACE */}

        <div className="sidebar-section">

          <p className="sidebar-label">
            WORKSPACE
          </p>

          <nav className="sidebar-nav">

            <button
              onClick={() => setActiveMenu("Dashboard")}
              className={
                activeMenu === "Dashboard"
                  ? "active"
                  : ""
              }
            >
              <span className="nav-icon">
                ⌂
              </span>

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
              <span className="nav-icon">
                ▣
              </span>

              Meetings
            </button>

          </nav>

        </div>


        {/* COLLABORATION */}

        <div className="sidebar-section">

          <p className="sidebar-label">
            COLLABORATION
          </p>

          <nav className="sidebar-nav">

            <button
              onClick={() => setActiveMenu("Create Meeting")}
              className={
                activeMenu === "Create Meeting"
                  ? "active"
                  : ""
              }
            >
              <span className="nav-icon">
                ＋
              </span>

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
              <span className="nav-icon">
                →
              </span>

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
              <span className="nav-icon">
                ◷
              </span>

              Meeting History
            </button>

          </nav>

        </div>


        {/* ACCOUNT */}

        <div className="sidebar-section">

          <p className="sidebar-label">
            ACCOUNT
          </p>

          <nav className="sidebar-nav">

            <button
              onClick={() => setActiveMenu("Profile")}
              className={
                activeMenu === "Profile"
                  ? "active"
                  : ""
              }
            >
              <span className="nav-icon">
                ◯
              </span>

              Profile
            </button>

          </nav>

        </div>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <div className="sidebar-user">

            <div className="sidebar-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>

            <div className="sidebar-user-info">

              <strong>
                {userName}
              </strong>

              <span>
                Workspace member
              </span>

            </div>

          </div>


          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>
              ↪
            </span>

            Logout
          </button>

        </div>

      </aside>


      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="dashboard-main">


        {/* =========================================
            DASHBOARD HOME
        ========================================= */}

        {activeMenu === "Dashboard" && (

          <>

            {/* TOP HEADER */}

            <header className="dashboard-topbar">

              <div>

                <p className="page-eyebrow">
                  WORKSPACE
                </p>

                <h1>
                  Welcome back,{" "}
                  {userName.split(" ")[0]}
                </h1>

                <p className="page-description">
                  Manage your meetings and collaborate
                  with your team.
                </p>

              </div>


              <div className="topbar-user">

                <div className="topbar-avatar">
                  {userName.charAt(0).toUpperCase()}
                </div>

                <div>

                  <strong>
                    {userName}
                  </strong>

                  <span>
                    IntellMeet member
                  </span>

                </div>

              </div>

            </header>


            {/* =========================================
                STATISTICS
            ========================================= */}

            <section className="stats-grid">


              {/* TOTAL MEETINGS */}

              <div className="stat-card">

                <div className="stat-card-top">

                  <div className="stat-icon purple">
                    ◫
                  </div>

                  <span className="stat-status">
                    All time
                  </span>

                </div>

                <strong>
                  {meetings.length}
                </strong>

                <h3>
                  Total Meetings
                </h3>

                <p>
                  Meetings created in your workspace
                </p>

              </div>


              {/* UPCOMING */}

              <div className="stat-card">

                <div className="stat-card-top">

                  <div className="stat-icon blue">
                    ◷
                  </div>

                  <span className="stat-status">
                    Scheduled
                  </span>

                </div>

                <strong>
                  {upcomingMeetings}
                </strong>

                <h3>
                  Upcoming Meetings
                </h3>

                <p>
                  Meetings available for collaboration
                </p>

              </div>


              {/* COMPLETED */}

              <div className="stat-card">

                <div className="stat-card-top">

                  <div className="stat-icon green">
                    ✓
                  </div>

                  <span className="stat-status">
                    Activity
                  </span>

                </div>

                <strong>
                  0
                </strong>

                <h3>
                  Completed
                </h3>

                <p>
                  Completed meetings
                </p>

              </div>


              {/* TEAM MEMBERS */}

              <div className="stat-card">

                <div className="stat-card-top">

                  <div className="stat-icon orange">
                    ◉
                  </div>

                  <span className="stat-status">
                    Active
                  </span>

                </div>

                <strong>
                  1
                </strong>

                <h3>
                  Team Members
                </h3>

                <p>
                  Members in your workspace
                </p>

              </div>

            </section>


            {/* =========================================
                QUICK ACTIONS
            ========================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <div>

                  <h2>
                    Quick actions
                  </h2>

                  <p>
                    Start your next collaboration in seconds.
                  </p>

                </div>

              </div>


              <div className="action-grid">


                {/* CREATE MEETING */}

                <button
                  className="action-card action-primary"
                  onClick={() =>
                    setActiveMenu("Create Meeting")
                  }
                >

                  <div className="action-icon">
                    +
                  </div>

                  <div>

                    <h3>
                      Create a meeting
                    </h3>

                    <p>
                      Schedule a new meeting with your team.
                    </p>

                  </div>

                  <span className="action-arrow">
                    →
                  </span>

                </button>


                {/* JOIN MEETING */}

                <button
                  className="action-card"
                  onClick={() =>
                    setActiveMenu("Join Meeting")
                  }
                >

                  <div className="action-icon">
                    ↗
                  </div>

                  <div>

                    <h3>
                      Join a meeting
                    </h3>

                    <p>
                      Enter a meeting ID and join instantly.
                    </p>

                  </div>

                  <span className="action-arrow">
                    →
                  </span>

                </button>


                {/* HISTORY */}

                <button
                  className="action-card"
                  onClick={() =>
                    setActiveMenu("History")
                  }
                >

                  <div className="action-icon">
                    ◷
                  </div>

                  <div>

                    <h3>
                      Meeting history
                    </h3>

                    <p>
                      Review your previous meetings.
                    </p>

                  </div>

                  <span className="action-arrow">
                    →
                  </span>

                </button>

              </div>

            </section>


            {/* =========================================
                RECENT MEETINGS + AI ASSISTANT
            ========================================= */}

            <section className="dashboard-lower-grid">


              {/* RECENT MEETINGS */}

              <div className="dashboard-card">

                <div className="card-header">

                  <div>

                    <h2>
                      Recent meetings
                    </h2>

                    <p>
                      Your latest meeting activity.
                    </p>

                  </div>

                  <button
                    className="text-button"
                    onClick={() =>
                      setActiveMenu("Meetings")
                    }
                  >
                    View all →
                  </button>

                </div>


                {loadingMeetings ? (

                  <div className="dashboard-empty">

                    <p>
                      Loading meetings...
                    </p>

                  </div>

                ) : meetings.length === 0 ? (

                  <div className="dashboard-empty">

                    <div className="empty-icon">
                      ◷
                    </div>

                    <h3>
                      No meetings yet
                    </h3>

                    <p>
                      Create your first meeting to get started.
                    </p>

                    <button
                      className="small-primary-button"
                      onClick={() =>
                        setActiveMenu("Create Meeting")
                      }
                    >
                      Create meeting
                    </button>

                  </div>

                ) : (

                  <div className="recent-meeting-list">

                    {meetings
                      .slice(0, 5)
                      .map((meeting) => (

                        <div
                          key={meeting._id}
                          className="recent-meeting-item"
                        >

                          <div className="meeting-date-icon">
                            ◷
                          </div>

                          <div className="recent-meeting-info">

                            <h3>
                              {meeting.title}
                            </h3>

                            <p>
                              {meeting.date} ·{" "}
                              {meeting.time}
                            </p>

                          </div>

                          <div className="meeting-id-badge">
                            {meeting.meetingId}
                          </div>

                        </div>

                      ))}

                  </div>

                )}

              </div>


              {/* =========================================
                  AI ASSISTANT
              ========================================= */}

              <div className="dashboard-card ai-dashboard-card">

                <div className="ai-card-top">

                  <div className="ai-card-icon">
                    AI
                  </div>

                  <span className="ai-badge">
                    AI ASSISTANT
                  </span>

                </div>


                <h2>
                  Smarter meeting insights
                </h2>


                <p>
                  Turn your meeting notes into clear summaries,
                  key discussion points, and actionable tasks
                  with IntellMeet AI.
                </p>


                <div className="ai-features">

                  <span>
                    ✓ Meeting summaries
                  </span>

                  <span>
                    ✓ Action items
                  </span>

                  <span>
                    ✓ Key discussion points
                  </span>

                </div>


                <button
                  className="ai-insights-button"
                  onClick={() =>
                    setActiveMenu("Meetings")
                  }
                >
                  Explore meeting insights

                  <span>
                    →
                  </span>

                </button>

              </div>

            </section>

          </>

        )}


        {/* =========================================
            CREATE MEETING
        ========================================= */}

        {activeMenu === "Create Meeting" && (
          <CreateMeeting />
        )}


        {/* =========================================
            JOIN MEETING
        ========================================= */}

        {activeMenu === "Join Meeting" && (
          <JoinMeeting />
        )}


        {/* =========================================
            MEETINGS
        ========================================= */}

        {activeMenu === "Meetings" && (

          <div className="page-content">

            <div className="page-header">

              <div>

                <p className="page-eyebrow">
                  WORKSPACE
                </p>

                <h1>
                  Meetings
                </h1>

                <p>
                  View and manage meetings created in IntellMeet.
                </p>

              </div>


              <button
                className="primary-button"
                onClick={() =>
                  setActiveMenu("Create Meeting")
                }
              >
                + Create meeting
              </button>

            </div>


            {loadingMeetings ? (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <p>
                    Loading meetings...
                  </p>

                </div>

              </div>

            ) : meetings.length === 0 ? (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <div className="empty-icon">
                    ◷
                  </div>

                  <h3>
                    No meetings found
                  </h3>

                  <p>
                    Create a meeting to see it here.
                  </p>

                </div>

              </div>

            ) : (

              <div className="meetings-list">

                {meetings.map((meeting) => (

                  <div
                    key={meeting._id}
                    className="meeting-list-card"
                  >

                    <div className="meeting-list-main">

                      <div className="meeting-list-icon">
                        M
                      </div>

                      <div>

                        <h2>
                          {meeting.title}
                        </h2>

                        <p>
                          {meeting.description ||
                            "No description"}
                        </p>

                      </div>

                    </div>


                    <div className="meeting-meta">

                      <span>
                        📅 {meeting.date}
                      </span>

                      <span>
                        ◷ {meeting.time}
                      </span>

                      <span>
                        {meeting.duration} min
                      </span>

                      <span className="meeting-id-badge">
                        {meeting.meetingId}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}


        {/* =========================================
            MEETING HISTORY
        ========================================= */}

        {activeMenu === "History" && (

          <div className="page-content">

            <div className="page-header">

              <div>

                <p className="page-eyebrow">
                  ACTIVITY
                </p>

                <h1>
                  Meeting History
                </h1>

                <p>
                  Review your meeting activity.
                </p>

              </div>

            </div>


            {loadingMeetings ? (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <p>
                    Loading meeting history...
                  </p>

                </div>

              </div>

            ) : meetings.length === 0 ? (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <div className="empty-icon">
                    ◷
                  </div>

                  <h3>
                    No meeting history
                  </h3>

                  <p>
                    Your meetings will appear here.
                  </p>

                </div>

              </div>

            ) : (

              <div className="meetings-list">

                {meetings.map((meeting) => (

                  <div
                    key={meeting._id}
                    className="meeting-list-card"
                  >

                    <div className="meeting-list-main">

                      <div className="meeting-list-icon">
                        ✓
                      </div>

                      <div>

                        <h2>
                          {meeting.title}
                        </h2>

                        <p>
                          {meeting.description ||
                            "No description"}
                        </p>

                      </div>

                    </div>


                    <div className="meeting-meta">

                      <span>
                        📅 {meeting.date}
                      </span>

                      <span>
                        ◷ {meeting.time}
                      </span>

                      <span>
                        {meeting.duration} min
                      </span>

                      <span className="meeting-id-badge">
                        {meeting.meetingId}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        )}


        {/* =========================================
            PROFILE
        ========================================= */}

        {activeMenu === "Profile" && (

          <div className="page-content">

            <div className="page-header">

              <div>

                <p className="page-eyebrow">
                  ACCOUNT
                </p>

                <h1>
                  My Profile
                </h1>

                <p>
                  Manage your IntellMeet account information.
                </p>

              </div>

            </div>


            {loadingProfile ? (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <p>
                    Loading profile...
                  </p>

                </div>

              </div>

            ) : profile ? (

              <div className="profile-layout">


                {/* PROFILE SUMMARY */}

                <div className="dashboard-card profile-summary">

                  <div className="profile-avatar">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>

                  <h2>
                    {profile.name}
                  </h2>

                  <p>
                    {profile.email}
                  </p>

                  <span className="profile-role">
                    {profile.role}
                  </span>

                </div>


                {/* ACCOUNT INFORMATION */}

                <div className="dashboard-card profile-details">

                  <h2>
                    Account information
                  </h2>


                  <div className="profile-field">

                    <label>
                      Full name
                    </label>

                    <input
                      type="text"
                      value={profile.name}
                      readOnly
                    />

                  </div>


                  <div className="profile-field">

                    <label>
                      Email address
                    </label>

                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                    />

                  </div>


                  <div className="profile-field">

                    <label>
                      Role
                    </label>

                    <input
                      type="text"
                      value={profile.role}
                      readOnly
                    />

                  </div>


                  <button
                    className="logout-profile-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>

                </div>

              </div>

            ) : (

              <div className="dashboard-card">

                <div className="dashboard-empty">

                  <h3>
                    Unable to load profile
                  </h3>

                  <p>
                    Please login again.
                  </p>

                </div>

              </div>

            )}

          </div>

        )}

      </main>

    </div>
  );
}

export default Dashboard;
