import { useEffect, useRef, useState } from "react";
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

  const [mediaError, setMediaError] = useState("");

  const [remoteConnected, setRemoteConnected] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);

  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(null);

  const targetSocketIdRef =
    useRef<string | null>(null);


  // =====================================================
  // CAMERA + MICROPHONE
  // =====================================================

  useEffect(() => {

    const startCameraAndMicrophone = async () => {

      try {

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setMediaError("");

      } catch (error) {

        console.error(
          "Camera/Microphone error:",
          error
        );

        setMediaError(
          "Camera or microphone permission was not granted."
        );

      }

    };

    startCameraAndMicrophone();


    return () => {

      if (mediaStreamRef.current) {

        mediaStreamRef.current
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

      }

    };

  }, []);


  // =====================================================
  // WEBRTC + SOCKET.IO
  // =====================================================

  useEffect(() => {

    const newSocket = io(
      "http://127.0.0.1:5000"
    );

    setSocket(newSocket);


    // -----------------------------------------------------
    // CREATE PEER CONNECTION
    // -----------------------------------------------------

    const createPeerConnection = (
      targetSocketId: string
    ) => {

      targetSocketIdRef.current =
        targetSocketId;


      if (peerConnectionRef.current) {

        peerConnectionRef.current.close();

      }


      const peerConnection =
        new RTCPeerConnection({
          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            }
          ]
        });


      peerConnectionRef.current =
        peerConnection;


      // ---------------------------------------------------
      // ADD LOCAL CAMERA + MICROPHONE
      // ---------------------------------------------------

      if (mediaStreamRef.current) {

        mediaStreamRef.current
          .getTracks()
          .forEach((track) => {

            peerConnection.addTrack(
              track,
              mediaStreamRef.current!
            );

          });

      }


      // ---------------------------------------------------
      // RECEIVE REMOTE VIDEO + AUDIO
      // ---------------------------------------------------

      peerConnection.ontrack = (event) => {

        console.log(
          "Remote participant media received."
        );

        if (remoteVideoRef.current) {

          remoteVideoRef.current.srcObject =
            event.streams[0];

        }

        setRemoteConnected(true);

      };


      // ---------------------------------------------------
      // ICE CANDIDATES
      // ---------------------------------------------------

      peerConnection.onicecandidate = (
        event
      ) => {

        if (
          event.candidate &&
          targetSocketIdRef.current
        ) {

          newSocket.emit(
            "webrtcIceCandidate",
            {
              target:
                targetSocketIdRef.current,

              candidate:
                event.candidate
            }
          );

        }

      };


      return peerConnection;

    };


    // =====================================================
    // NEW PARTICIPANT JOINED
    // =====================================================

    newSocket.on(
      "participantJoined",
      async (data) => {

        console.log(
          "New participant joined:",
          data.socketId
        );


        const peerConnection =
          createPeerConnection(
            data.socketId
          );


        try {

          const offer =
            await peerConnection.createOffer();

          await peerConnection.setLocalDescription(
            offer
          );


          newSocket.emit(
            "webrtcOffer",
            {
              target:
                data.socketId,

              offer
            }
          );


          console.log(
            "WebRTC offer sent."
          );

        } catch (error) {

          console.error(
            "Error creating WebRTC offer:",
            error
          );

        }

      }
    );


    // =====================================================
    // RECEIVE WEBRTC OFFER
    // =====================================================

    newSocket.on(
      "webrtcOffer",
      async (data) => {

        console.log(
          "WebRTC offer received."
        );


        const peerConnection =
          createPeerConnection(
            data.sender
          );


        try {

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              data.offer
            )
          );


          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );


          newSocket.emit(
            "webrtcAnswer",
            {
              target:
                data.sender,

              answer
            }
          );


          console.log(
            "WebRTC answer sent."
          );

        } catch (error) {

          console.error(
            "Error handling WebRTC offer:",
            error
          );

        }

      }
    );


    // =====================================================
    // RECEIVE WEBRTC ANSWER
    // =====================================================

    newSocket.on(
      "webrtcAnswer",
      async (data) => {

        console.log(
          "WebRTC answer received."
        );


        try {

          if (
            peerConnectionRef.current
          ) {

            await peerConnectionRef.current
              .setRemoteDescription(
                new RTCSessionDescription(
                  data.answer
                )
              );

          }

        } catch (error) {

          console.error(
            "Error setting WebRTC answer:",
            error
          );

        }

      }
    );


    // =====================================================
    // RECEIVE ICE CANDIDATE
    // =====================================================

    newSocket.on(
      "webrtcIceCandidate",
      async (data) => {

        console.log(
          "WebRTC ICE candidate received."
        );


        try {

          if (
            peerConnectionRef.current
          ) {

            await peerConnectionRef.current
              .addIceCandidate(
                new RTCIceCandidate(
                  data.candidate
                )
              );

          }

        } catch (error) {

          console.error(
            "Error adding ICE candidate:",
            error
          );

        }

      }
    );


    // =====================================================
    // PARTICIPANT LEFT
    // =====================================================

    newSocket.on(
      "participantLeft",
      () => {

        console.log(
          "Remote participant left."
        );


        setRemoteConnected(false);


        if (
          remoteVideoRef.current
        ) {

          remoteVideoRef.current.srcObject =
            null;

        }


        if (
          peerConnectionRef.current
        ) {

          peerConnectionRef.current.close();

          peerConnectionRef.current =
            null;

        }

        targetSocketIdRef.current =
          null;

      }
    );


    // =====================================================
    // CHAT
    // =====================================================

    newSocket.on(
      "receiveMessage",
      (data) => {

        const newMessage =
          `${data.sender}: ${data.message}`;

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            newMessage
          ]
        );

      }
    );


    // =====================================================
    // USER JOINED MESSAGE
    // =====================================================

    newSocket.on(
      "userJoined",
      (data) => {

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            `System: ${data.message}`
          ]
        );

      }
    );


    // =====================================================
    // JOIN MEETING
    // =====================================================

    newSocket.emit(
      "joinMeeting",
      meetingId
    );


    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {

      newSocket.emit(
        "leaveMeeting",
        meetingId
      );

      newSocket.disconnect();


      if (
        peerConnectionRef.current
      ) {

        peerConnectionRef.current.close();

        peerConnectionRef.current =
          null;

      }

    };

  }, [meetingId]);


  // =====================================================
  // MICROPHONE TOGGLE
  // =====================================================

  const toggleMicrophone = () => {

    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    audioTracks.forEach((track) => {

      track.enabled =
        !track.enabled;

    });

    setMicOn(
      audioTracks.some(
        (track) => track.enabled
      )
    );

  };


  // =====================================================
  // CAMERA TOGGLE
  // =====================================================

  const toggleCamera = () => {

    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    videoTracks.forEach((track) => {

      track.enabled =
        !track.enabled;

    });

    setCameraOn(
      videoTracks.some(
        (track) => track.enabled
      )
    );

  };


  // =====================================================
  // CHAT MESSAGE
  // =====================================================

  const sendMessage = () => {

    if (!message.trim()) {
      return;
    }

    if (!socket) {

      alert(
        "Chat connection is not ready."
      );

      return;

    }

    socket.emit(
      "sendMessage",
      {
        meetingId:
          meetingId,

        message:
          message,

        sender:
          "Kalpana Test"
      }
    );

    setMessage("");

  };


  // =====================================================
  // AI SUMMARY
  // =====================================================

  const generateAISummary = async () => {

    if (!meetingNotes.trim()) {

      alert(
        "Please enter some meeting notes first."
      );

      return;

    }


    try {

      setAiLoading(true);

      setAiSummary("");


      const response =
        await axios.post(
          "http://127.0.0.1:5000/api/ai/summarize",
          {
            meetingNotes:
              meetingNotes
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


  // =====================================================
  // LEAVE MEETING
  // =====================================================

  const leaveMeeting = () => {

    if (mediaStreamRef.current) {

      mediaStreamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

    }


    if (
      peerConnectionRef.current
    ) {

      peerConnectionRef.current.close();

      peerConnectionRef.current =
        null;

    }


    setLeftMeeting(true);

  };


  // =====================================================
  // RETURN TO DASHBOARD
  // =====================================================

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


      {/* MEETING AREA */}

      <div className="meeting-room-content">


        {/* VIDEO AREA */}

        <div className="video-section">


          {/* LOCAL VIDEO */}

          <h2>
            Your Video
          </h2>

          <div className="video-placeholder">

            {cameraOn ? (

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "350px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  background: "#030712"
                }}
              />

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


          {/* REMOTE VIDEO */}

          <h2
            style={{
              marginTop: "25px"
            }}
          >
            Other Participant
          </h2>

          <div className="video-placeholder">

            {remoteConnected ? (

              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "350px",
                  objectFit: "cover",
                  borderRadius: "12px",
                  background: "#030712"
                }}
              />

            ) : (

              <>
                <h2>
                  👤 Waiting for participant
                </h2>

                <p>
                  Another participant will appear here
                  when they join this meeting.
                </p>
              </>

            )}

          </div>


          {/* MEDIA ERROR */}

          {mediaError && (

            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                background: "#7f1d1d",
                borderRadius: "8px"
              }}
            >
              {mediaError}
            </div>

          )}


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
              onClick={toggleMicrophone}
            >
              {micOn
                ? "🎤 Mute"
                : "🔇 Unmute"}
            </button>


            <button
              className="create-meeting-button"
              onClick={toggleCamera}
            >
              {cameraOn
                ? "📹 Camera Off"
                : "📷 Camera On"}
            </button>


            <button
              className="create-meeting-button"
              onClick={() =>
                setScreenSharing(
                  !screenSharing
                )
              }
            >
              {screenSharing
                ? "🛑 Stop Sharing"
                : "🖥️ Share Screen"}
            </button>

          </div>


          {/* SCREEN SHARING STATUS */}

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