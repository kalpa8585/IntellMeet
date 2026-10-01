import { useState } from "react";
import axios from "axios";

function CreateMeeting() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [description, setDescription] = useState("");

  const [meetingId, setMeetingId] = useState("");
  const [message, setMessage] = useState("");

  const generateMeetingId = () => {
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    return `INT-${randomNumber}`;
  };

  const handleCreateMeeting = async () => {
    if (!title || !date || !time) {
      alert("Please enter meeting title, date and time.");
      return;
    }

    const newMeetingId = generateMeetingId();

    try {
      const response = await axios.post(
        "https://intellmeet-backend-u3jz.onrender.com/api/meetings/create",
        {
          title,
          date,
          time,
          duration: Number(duration),
          description,
          meetingId: newMeetingId
        }
      );

      setMeetingId(response.data.meeting.meetingId);
      setMessage("Meeting created successfully!");

      setTitle("");
      setDate("");
      setTime("");
      setDuration("30");
      setDescription("");

    } catch (error: any) {
      console.error("Create meeting error:", error);

      if (error.response) {
        setMessage(
          `Server Error: ${error.response.status} - ${
            error.response.data?.error ||
            error.response.data?.message ||
            "Unknown server error"
          }`
        );
      } else {
        setMessage("Cannot connect to the backend server.");
      }
    }
  };

  return (
    <div className="create-meeting">

      <div className="create-header">
        <h1>Create New Meeting</h1>

        <p>
          Schedule a meeting and invite your team members.
        </p>
      </div>

      <div className="meeting-form">

        <label>Meeting Title</label>

        <input
          type="text"
          placeholder="Enter meeting title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label>Date</label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label>Time</label>

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <label>Duration</label>

        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="45">45 minutes</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
        </select>

        <label>Description</label>

        <textarea
          placeholder="Enter meeting description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          className="create-meeting-button"
          onClick={handleCreateMeeting}
        >
          Create Meeting
        </button>

        {message && (
          <div className="meeting-message">
            <p>{message}</p>
          </div>
        )}

        {meetingId && (
          <div className="meeting-created">

            <h2>Meeting Created Successfully!</h2>

            <p>Your Meeting ID:</p>

            <strong>{meetingId}</strong>

            <p>
              Share this ID with participants so they can join the meeting.
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

export default CreateMeeting;