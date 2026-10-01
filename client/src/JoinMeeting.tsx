import { useState } from "react";
import axios from "axios";
import MeetingRoom from "./MeetingRoom";

function JoinMeeting() {
  const [meetingId, setMeetingId] = useState("");
  const [message, setMessage] = useState("");
  const [meeting, setMeeting] = useState<any>(null);
  const [enteredMeeting, setEnteredMeeting] = useState(false);

  const handleJoinMeeting = async () => {
    const id = meetingId.trim();

    if (!id) {
      setMessage("Please enter a Meeting ID.");
      return;
    }

    console.log("Checking Meeting ID:", id);

    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/api/meetings/${id}`
      );

      console.log("Meeting response:", response.data);

      setMeeting(response.data.meeting);
      setMessage("Meeting found successfully.");

    } catch (error: any) {
      console.error("Join Meeting Error:", error);

      setMeeting(null);

      if (error.response) {
        setMessage(
          error.response.data?.message ||
            `Server error: ${error.response.status}`
        );
      } else {
        setMessage("Cannot connect to the backend server.");
      }
    }
  };

  if (enteredMeeting && meeting) {
    return (
      <MeetingRoom
        meetingId={meeting.meetingId}
        meetingTitle={meeting.title}
      />
    );
  }

  return (
    <div className="join-meeting">

      <div className="create-header">

        <h1>Join Meeting</h1>

        <p>
          Enter the Meeting ID shared by the meeting organizer.
        </p>

      </div>

      <div className="meeting-form">

        <label>Meeting ID</label>

        <input
          type="text"
          placeholder="Example: INT-995505"
          value={meetingId}
          onChange={(e) => setMeetingId(e.target.value)}
        />

        <button
          className="create-meeting-button"
          onClick={handleJoinMeeting}
        >
          Join Meeting
        </button>

        {message && (
          <div className="meeting-message">
            <p>{message}</p>
          </div>
        )}

        {meeting && (
          <div className="meeting-created">

            <h2>Meeting Found</h2>

            <p>
              <strong>Title:</strong> {meeting.title}
            </p>

            <p>
              <strong>Date:</strong> {meeting.date}
            </p>

            <p>
              <strong>Time:</strong> {meeting.time}
            </p>

            <p>
              <strong>Duration:</strong> {meeting.duration} minutes
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {meeting.description || "No description"}
            </p>

            <p>
              <strong>Meeting ID:</strong>{" "}
              {meeting.meetingId}
            </p>

            <button
              className="create-meeting-button"
              onClick={() => {
                setEnteredMeeting(true);
              }}
            >
              Enter Meeting
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default JoinMeeting;