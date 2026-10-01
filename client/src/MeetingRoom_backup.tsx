import { useEffect, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Dashboard from "./Dashboard";

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
}

function MeetingRoom({
  meetingId,
  meetingTitle
}: MeetingRoomProps) {

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const [leftMeeting, setLeftMeeting] = useState(false);

  const [meetingNotes, setMeetingNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);


  // SOCKET.IO CONNECTION
  useEffect(() => {

    const newSocket = io("http://127.0.0.1:5000");

    setSocket(newSocket);

    newSocket.emit(
      "joinMeeting",
      meetingId
    );


    // RECEIVE CHAT MESSAGE
    newSocket.on("receiveMessage", (data) => {

      const newMessage =
        `${data.sender}: ${data.message}`;

      setMessages((previousMessages) => [
        ...previousMessages,
        newMessage
      ]);

    });


    // PARTICIPANT JOINED
    newSocket.on("userJoined", (data) => {

      setMessages((previousMessages) => [
        ...previousMessages,
        `System: ${data.message}`
      ]);

    });


    return () => {

      newSocket.emit(
        "leaveMeeting",
        meetingId
      );

      newSocket.disconnect();

    };

  }, [meetingId]);


  // SEND CHAT MESSAGE
  const sendMessage = () => {

    if (!message.trim()) {
      return;
    }

    if (!socket) {
      alert("Chat connection is not ready.");
      return;
    }

    socket.emit("sendMessage", {
      meetingId: meetingId,
      message: message,
      sender: "Kalpana Test"
    });

    setMessage("");

  };


  // GENERATE AI SUMMARY
  const generateAISummary = async () => {

    if (!meetingNotes.trim()) {
      alert("Please enter some meeting notes first.");
      return;
    }

    try {

      setAiLoading(true);
      setAiSummary("");

      const response = await axios.post(
        "http://127.0.0.1:5000/api/ai/summarize",
        {
          meetingNotes: meetingNotes
        }
      );

      setAiSummary(
        response.data.result
      );

    } catch (error: any) {

      console.error(
        "AI Summary Error:",
        error
      );

      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to generate AI summary."
      );

    } finally {

      setAiLoading(false);

    }

  };


  // LEAVE MEETING
  const leaveMeeting = () => {

    setLeftMeeting(true);

  };


  if (leftMeeting) {
    return <Dashboard />;
  }


  return (
    <div className="meeting-room">


      {/* HEADER */}

      <div className="meeting-room-header">

        <div>

          <h1>
            {meetingTitle}
          </h1>

          <p>
            Meeting ID: {meetingId}
          </p>

        </div>


        <button
          className="leave-button"
          onClick={leaveMeeting}
        >
          Leave Meeting
        </button>

      </div>



      {/* MAIN MEETING AREA */}

      <div className="meeting-room-content">


        {/* VIDEO */}

        <div className="video-section">

          <div className="video-placeholder">

            {cameraOn ? (

              <>
                <h2>
                  🎥 Camera On
                </h2>

                <p>
                  Your video will appear here.
                </p>
              </>

            ) : (

              <>
                <h2>
                  📷 Camera Off
                </h2>

                <p>
                  Your camera is currently turned off.
                </p>
              </>

            )}

          </div>



          {/* CONTROLS */}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginTop: "20px",
              flexWrap: "wrap"
            }}
          >

            <button
              className="create-meeting-button"
              onClick={() =>
                setMicOn(!micOn)
              }
            >
              {micOn
                ? "🎤 Mute"
                : "🔇 Unmute"}
            </button>


            <button
              className="create-meeting-button"
              onClick={() =>
                setCameraOn(!cameraOn)
              }
            >
              {cameraOn
                ? "📹 Camera Off"
                : "📷 Camera On"}
            </button>


            <button
              className="create-meeting-button"
              onClick={() =>
                setScreenSharing(!screenSharing)
              }
            >
              {screenSharing
                ? "🛑 Stop Sharing"
                : "🖥️ Share Screen"}
            </button>

          </div>



          {screenSharing && (

            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                background: "#374151",
                borderRadius: "8px",
                textAlign: "center"
              }}
            >
              Screen sharing is active.
            </div>

          )}



          {/* PARTICIPANTS */}

          <div className="participants-section">

            <h2>
              Participants
            </h2>

            <div className="participant-card">

              <strong>
                Kalpana Test
              </strong>

              <span>
                Host
              </span>

            </div>

          </div>

        </div>



        {/* CHAT */}

        <div className="chat-section">

          <h2>
            Meeting Chat
          </h2>


          <div className="chat-messages">

            {messages.length === 0 ? (

              <p className="empty-chat">
                No messages yet.
              </p>

            ) : (

              messages.map(
                (msg, index) => (

                  <div
                    className="chat-message"
                    key={index}
                  >
                    {msg}
                  </div>

                )
              )

            )}

          </div>



          <div className="chat-input">

            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {
                  sendMessage();
                }

              }}
            />


            <button
              onClick={sendMessage}
            >
              Send
            </button>

          </div>

        </div>


      </div>



      {/* AI ASSISTANT */}

      <div className="ai-meeting-section">

        <h2>
          🤖 AI Meeting Assistant
        </h2>


        <p>
          Enter your meeting notes below and let
          the local AI generate a summary and
          action items.
        </p>


        <div
          style={{
            marginTop: "20px"
          }}
        >

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold"
            }}
          >
            Meeting Notes
          </label>


          <textarea
            value={meetingNotes}
            onChange={(e) =>
              setMeetingNotes(e.target.value)
            }
            placeholder="Enter important points discussed during the meeting..."
            style={{
              width: "100%",
              minHeight: "150px",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #6b7280",
              background: "#111827",
              color: "white",
              resize: "vertical"
            }}
          />

        </div>



        <button
          className="create-meeting-button"
          onClick={generateAISummary}
          disabled={aiLoading}
        >

          {aiLoading
            ? "🤖 Generating..."
            : "✨ Generate AI Summary"}

        </button>



        {aiSummary && (

          <div
            className="ai-card"
            style={{
              marginTop: "20px"
            }}
          >

            <h3>
              📝 AI Meeting Summary
            </h3>

            <div
              style={{
                whiteSpace: "pre-wrap"
              }}
            >
              {aiSummary}
            </div>

          </div>

        )}

      </div>


    </div>
  );
}

export default MeetingRoom;