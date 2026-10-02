import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Dashboard from "./Dashboard";

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
}

interface Participant {
  socketId: string;
  name: string;
  stream?: MediaStream;
}

const BACKEND_URL =
  "https://intellmeet-backend-u3jz.onrender.com";

function MeetingRoom({
  meetingId,
  meetingTitle,
}: MeetingRoomProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [message, setMessage] = useState("");

  const [messages, setMessages] =
    useState<string[]>([]);

  const [micOn, setMicOn] = useState(true);

  const [cameraOn, setCameraOn] =
    useState(true);

  const [screenSharing, setScreenSharing] =
    useState(false);

  const [mediaError, setMediaError] =
    useState("");

  const [leftMeeting, setLeftMeeting] =
    useState(false);

  const [meetingNotes, setMeetingNotes] =
    useState("");

  const [aiSummary, setAiSummary] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");

  const localVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const mediaStreamRef =
    useRef<MediaStream | null>(null);

  const screenStreamRef =
    useRef<MediaStream | null>(null);

  const socketRef =
    useRef<Socket | null>(null);

  const peerConnectionsRef =
    useRef<Map<string, RTCPeerConnection>>(
      new Map()
    );

  const remoteStreamsRef =
    useRef<Map<string, MediaStream>>(
      new Map()
    );


  /* =====================================================
     PARTICIPANT COUNT
  ===================================================== */

  const participantCount =
    participants.length + 1;


  /* =====================================================
     CAMERA + MICROPHONE
  ===================================================== */

  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });

        mediaStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            stream;
        }

        setMediaError("");
      } catch (error) {
        console.error(
          "Camera/microphone error:",
          error
        );

        setMediaError(
          "Camera or microphone permission was not granted."
        );
      }
    };

    startMedia();

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);


  /* =====================================================
     ADD PARTICIPANT
  ===================================================== */

  const addParticipant = (
    socketId: string,
    name = "Participant"
  ) => {
    if (!socketId) {
      return;
    }

    setParticipants((previous) => {
      const exists = previous.some(
        (participant) =>
          participant.socketId === socketId
      );

      if (exists) {
        return previous;
      }

      return [
        ...previous,
        {
          socketId,
          name,
        },
      ];
    });
  };


  /* =====================================================
     REMOVE PARTICIPANT
  ===================================================== */

  const removeParticipant = (
    socketId: string
  ) => {
    setParticipants((previous) =>
      previous.filter(
        (participant) =>
          participant.socketId !== socketId
      )
    );

    remoteStreamsRef.current.delete(
      socketId
    );

    const peer =
      peerConnectionsRef.current.get(
        socketId
      );

    if (peer) {
      peer.close();
    }

    peerConnectionsRef.current.delete(
      socketId
    );
  };


  /* =====================================================
     CREATE PEER CONNECTION
  ===================================================== */

  const createPeerConnection = (
    targetSocketId: string,
    currentSocket: Socket
  ) => {
    const existing =
      peerConnectionsRef.current.get(
        targetSocketId
      );

    if (existing) {
      return existing;
    }

    const peerConnection =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    peerConnectionsRef.current.set(
      targetSocketId,
      peerConnection
    );


    /* LOCAL TRACKS */

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


    /* REMOTE TRACKS */

    peerConnection.ontrack = (
      event
    ) => {
      const remoteStream =
        event.streams[0];

      if (!remoteStream) {
        return;
      }

      remoteStreamsRef.current.set(
        targetSocketId,
        remoteStream
      );

      setParticipants((previous) =>
        previous.map(
          (participant) =>
            participant.socketId ===
            targetSocketId
              ? {
                  ...participant,
                  stream:
                    remoteStream,
                }
              : participant
        )
      );
    };


    /* ICE CANDIDATES */

    peerConnection.onicecandidate =
      (event) => {
        if (event.candidate) {
          currentSocket.emit(
            "webrtcIceCandidate",
            {
              target:
                targetSocketId,
              candidate:
                event.candidate,
            }
          );
        }
      };


    /* CONNECTION STATUS */

    peerConnection.onconnectionstatechange =
      () => {
        const state =
          peerConnection.connectionState;

        console.log(
          `Connection with ${targetSocketId}:`,
          state
        );

        if (
          state === "failed" ||
          state === "closed"
        ) {
          removeParticipant(
            targetSocketId
          );
        }
      };

    return peerConnection;
  };


  /* =====================================================
     CREATE OFFER
  ===================================================== */

  const createOfferForParticipant = async (
    targetSocketId: string,
    currentSocket: Socket
  ) => {
    const peerConnection =
      createPeerConnection(
        targetSocketId,
        currentSocket
      );

    try {
      const offer =
        await peerConnection.createOffer();

      await peerConnection.setLocalDescription(
        offer
      );

      currentSocket.emit(
        "webrtcOffer",
        {
          target:
            targetSocketId,
          offer,
        }
      );

      console.log(
        "Offer sent to:",
        targetSocketId
      );
    } catch (error) {
      console.error(
        "Offer creation error:",
        error
      );
    }
  };


  /* =====================================================
     SOCKET.IO + WEBRTC
  ===================================================== */

  useEffect(() => {
    const newSocket =
      io(BACKEND_URL, {
        transports: [
          "websocket",
          "polling",
        ],
      });

    socketRef.current =
      newSocket;

    setSocket(newSocket);


    /* CONNECT */

    newSocket.on(
      "connect",
      () => {
        console.log(
          "Connected to IntellMeet:",
          newSocket.id
        );

        setConnectionStatus(
          "Connected"
        );

        newSocket.emit(
          "joinMeeting",
          meetingId
        );
      }
    );


    /* CONNECTION ERROR */

    newSocket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error
        );

        setConnectionStatus(
          "Connection error"
        );
      }
    );


    /* DISCONNECT */

    newSocket.on(
      "disconnect",
      () => {
        console.log(
          "Disconnected from IntellMeet"
        );

        setConnectionStatus(
          "Disconnected"
        );
      }
    );


    /* =================================================
       EXISTING PARTICIPANTS

       The NEW participant receives the IDs of
       people already inside the meeting.
    ================================================= */

    newSocket.on(
      "existingParticipants",
      async (data) => {
        const existingParticipants =
          data?.participants || [];

        console.log(
          "Existing participants:",
          existingParticipants
        );

        for (
          const participantId of
          existingParticipants
        ) {
          addParticipant(
            participantId
          );

          await createOfferForParticipant(
            participantId,
            newSocket
          );
        }
      }
    );


    /* =================================================
       NEW PARTICIPANT JOINED

       Existing participants only add the new
       participant to their participant list.

       They DO NOT create another offer.
       This avoids duplicate WebRTC offers.
    ================================================= */

    newSocket.on(
      "participantJoined",
      (data) => {
        const targetSocketId =
          data?.socketId;

        if (!targetSocketId) {
          return;
        }

        console.log(
          "New participant joined:",
          targetSocketId
        );

        addParticipant(
          targetSocketId
        );
      }
    );


    /* =================================================
       WEBRTC OFFER
    ================================================= */

    newSocket.on(
      "webrtcOffer",
      async (data) => {
        const sender =
          data?.sender;

        if (!sender || !data?.offer) {
          return;
        }

        console.log(
          "WebRTC offer received from:",
          sender
        );

        addParticipant(
          sender
        );

        const peerConnection =
          createPeerConnection(
            sender,
            newSocket
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
                sender,
              answer,
            }
          );

        } catch (error) {
          console.error(
            "Offer handling error:",
            error
          );
        }
      }
    );


    /* =================================================
       WEBRTC ANSWER
    ================================================= */

    newSocket.on(
      "webrtcAnswer",
      async (data) => {
        const sender =
          data?.sender;

        if (!sender || !data?.answer) {
          return;
        }

        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        if (!peerConnection) {
          return;
        }

        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );

        } catch (error) {
          console.error(
            "Answer handling error:",
            error
          );
        }
      }
    );


    /* =================================================
       ICE CANDIDATE
    ================================================= */

    newSocket.on(
      "webrtcIceCandidate",
      async (data) => {
        const sender =
          data?.sender;

        if (
          !sender ||
          !data?.candidate
        ) {
          return;
        }

        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          );

        if (!peerConnection) {
          return;
        }

        try {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              data.candidate
            )
          );

        } catch (error) {
          console.error(
            "ICE candidate error:",
            error
          );
        }
      }
    );


    /* =================================================
       PARTICIPANT LEFT
    ================================================= */

    newSocket.on(
      "participantLeft",
      (data) => {
        console.log(
          "Participant left:",
          data?.socketId
        );

        if (data?.socketId) {
          removeParticipant(
            data.socketId
          );
        }
      }
    );


    /* =================================================
       CHAT
    ================================================= */

    newSocket.on(
      "receiveMessage",
      (data) => {
        setMessages(
          (previous) => [
            ...previous,
            `${data.sender}: ${data.message}`,
          ]
        );
      }
    );


    /* =================================================
       USER JOINED MESSAGE
    ================================================= */

    newSocket.on(
      "userJoined",
      (data) => {
        if (!data?.message) {
          return;
        }

        setMessages(
          (previous) => [
            ...previous,
            `System: ${data.message}`,
          ]
        );
      }
    );


    /* =================================================
       CLEANUP
    ================================================= */

    return () => {
      newSocket.emit(
        "leaveMeeting",
        meetingId
      );

      newSocket.disconnect();

      peerConnectionsRef.current.forEach(
        (peer) => {
          peer.close();
        }
      );

      peerConnectionsRef.current.clear();

      remoteStreamsRef.current.clear();
    };

  }, [meetingId]);


  /* =====================================================
     MICROPHONE
  ===================================================== */

  const toggleMicrophone = () => {
    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const audioTracks =
      stream.getAudioTracks();

    audioTracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setMicOn(
      audioTracks.some(
        (track) =>
          track.enabled
      )
    );
  };


  /* =====================================================
     CAMERA
  ===================================================== */

  const toggleCamera = () => {
    const stream =
      mediaStreamRef.current;

    if (!stream) {
      return;
    }

    const videoTracks =
      stream.getVideoTracks();

    videoTracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setCameraOn(
      videoTracks.some(
        (track) =>
          track.enabled
      )
    );
  };


  /* =====================================================
     SCREEN SHARING
  ===================================================== */

  const toggleScreenSharing =
    async () => {
      try {
        if (screenSharing) {
          await stopScreenSharing();
          return;
        }

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
              audio: true,
            }
          );

        screenStreamRef.current =
          screenStream;

        const screenTrack =
          screenStream
            .getVideoTracks()[0];

        peerConnectionsRef.current.forEach(
          async (peerConnection) => {
            const sender =
              peerConnection
                .getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (sender) {
              await sender.replaceTrack(
                screenTrack
              );
            }
          }
        );

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            screenStream;
        }

        setScreenSharing(true);

        screenTrack.onended =
          () => {
            stopScreenSharing();
          };

      } catch (error) {
        console.error(
          "Screen sharing error:",
          error
        );
      }
    };


  /* =====================================================
     STOP SCREEN SHARING
  ===================================================== */

  const stopScreenSharing =
    async () => {
      if (
        screenStreamRef.current
      ) {
        screenStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        screenStreamRef.current =
          null;
      }

      const cameraTrack =
        mediaStreamRef.current
          ?.getVideoTracks()[0];

      if (cameraTrack) {
        peerConnectionsRef.current.forEach(
          async (peerConnection) => {
            const sender =
              peerConnection
                .getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (sender) {
              await sender.replaceTrack(
                cameraTrack
              );
            }
          }
        );

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            mediaStreamRef.current;
        }
      }

      setScreenSharing(false);
    };


  /* =====================================================
     CHAT
  ===================================================== */

  const sendMessage = () => {
    if (!message.trim()) {
      return;
    }

    if (!socket?.connected) {
      alert(
        "Chat connection is not ready."
      );

      return;
    }

    socket.emit(
      "sendMessage",
      {
        meetingId,
        message:
          message.trim(),
        sender:
          "Kalpana",
      }
    );

    setMessage("");
  };


  /* =====================================================
     AI SUMMARY
  ===================================================== */

  const generateAISummary =
    async () => {
      if (!meetingNotes.trim()) {
        alert(
          "Please enter meeting notes first."
        );

        return;
      }

      try {
        setAiLoading(true);
        setAiSummary("");

        const response =
          await axios.post(
            `${BACKEND_URL}/api/ai/summarize`,
            {
              meetingNotes:
                meetingNotes,
            }
          );

        setAiSummary(
          response.data.result ||
            "AI summary was generated."
        );

      } catch (error: any) {
        console.error(
          "AI Summary Error:",
          error
        );

        setAiSummary(
          error.response?.data
            ?.message ||
            "AI service is currently unavailable. Your meeting system is still working normally."
        );

      } finally {
        setAiLoading(false);
      }
    };


  /* =====================================================
     LEAVE MEETING
  ===================================================== */

  const leaveMeeting = () => {
    if (
      screenStreamRef.current
    ) {
      screenStreamRef.current
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );
    }

    if (
      mediaStreamRef.current
    ) {
      mediaStreamRef.current
        .getTracks()
        .forEach(
          (track) =>
            track.stop()
        );
    }

    peerConnectionsRef.current.forEach(
      (peer) => peer.close()
    );

    peerConnectionsRef.current.clear();

    if (socketRef.current) {
      socketRef.current.emit(
        "leaveMeeting",
        meetingId
      );

      socketRef.current.disconnect();
    }

    setLeftMeeting(true);
  };


  /* =====================================================
     RETURN TO DASHBOARD
  ===================================================== */

  if (leftMeeting) {
    return <Dashboard />;
  }


  /* =====================================================
     RENDER
  ===================================================== */

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

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "15px",
          }}
        >

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "999px",
              background:
                connectionStatus ===
                "Connected"
                  ? "#dcfce7"
                  : "#fef3c7",
              color:
                connectionStatus ===
                "Connected"
                  ? "#166534"
                  : "#92400e",
              fontSize:
                "13px",
              fontWeight:
                700,
            }}
          >
            ● {connectionStatus}
          </span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "999px",
              background:
                "#eef2ff",
              color:
                "#4f46e5",
              fontSize:
                "13px",
              fontWeight:
                700,
            }}
          >
            👥 {participantCount}{" "}
            participant
            {participantCount !== 1
              ? "s"
              : ""}
          </span>

          <button
            className="leave-button"
            onClick={
              leaveMeeting
            }
          >
            Leave Meeting
          </button>

        </div>
      </div>


      {/* MAIN CONTENT */}

      <div className="meeting-room-content">

        {/* VIDEO AREA */}

        <div className="video-section">

          <h2>
            Meeting Participants
          </h2>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap:
                "15px",
            }}
          >

            {/* LOCAL VIDEO */}

            <div
              style={{
                position:
                  "relative",
                background:
                  "#030712",
                borderRadius:
                  "12px",
                overflow:
                  "hidden",
                minHeight:
                  "220px",
              }}
            >

              <video
                ref={
                  localVideoRef
                }
                autoPlay
                muted
                playsInline
                style={{
                  width:
                    "100%",
                  height:
                    "250px",
                  objectFit:
                    "cover",
                  display:
                    cameraOn ||
                    screenSharing
                      ? "block"
                      : "none",
                }}
              />

              {!cameraOn &&
                !screenSharing && (
                  <div
                    style={{
                      height:
                        "250px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      color:
                        "white",
                      flexDirection:
                        "column",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "40px",
                      }}
                    >
                      👤
                    </div>

                    <strong>
                      Camera Off
                    </strong>
                  </div>
                )}

              <div
                style={{
                  position:
                    "absolute",
                  bottom:
                    "10px",
                  left:
                    "10px",
                  background:
                    "rgba(0,0,0,0.65)",
                  color:
                    "white",
                  padding:
                    "6px 10px",
                  borderRadius:
                    "7px",
                  fontSize:
                    "12px",
                }}
              >
                You
                {screenSharing
                  ? " • Sharing screen"
                  : ""}
              </div>

            </div>


            {/* REMOTE PARTICIPANTS */}

            {participants.map(
              (participant) => (
                <RemoteVideo
                  key={
                    participant.socketId
                  }
                  participant={
                    participant
                  }
                />
              )
            )}

          </div>


          {/* MEDIA ERROR */}

          {mediaError && (
            <div
              style={{
                marginTop:
                  "15px",
                padding:
                  "12px",
                background:
                  "#fee2e2",
                color:
                  "#991b1b",
                borderRadius:
                  "8px",
                fontSize:
                  "13px",
              }}
            >
              {mediaError}
            </div>
          )}


          {/* CONTROLS */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "center",
              gap:
                "10px",
              marginTop:
                "20px",
              flexWrap:
                "wrap",
            }}
          >

            <button
              className="create-meeting-button"
              onClick={
                toggleMicrophone
              }
            >
              {micOn
                ? "🎤 Mute"
                : "🔇 Unmute"}
            </button>

            <button
              className="create-meeting-button"
              onClick={
                toggleCamera
              }
            >
              {cameraOn
                ? "📹 Camera Off"
                : "📷 Camera On"}
            </button>

            <button
              className="create-meeting-button"
              onClick={
                toggleScreenSharing
              }
            >
              {screenSharing
                ? "🛑 Stop Sharing"
                : "🖥️ Share Screen"}
            </button>

          </div>


          {/* PARTICIPANTS */}

          <div className="participants-section">

            <h2>
              Participants (
              {participantCount})
            </h2>

            <div
              className="participant-card"
            >
              <strong>
                You
              </strong>

              <span>
                Host
              </span>
            </div>

            {participants.map(
              (participant) => (
                <div
                  key={
                    participant.socketId
                  }
                  className="participant-card"
                  style={{
                    marginTop:
                      "8px",
                  }}
                >
                  <strong>
                    {participant.name}
                  </strong>

                  <span>
                    Participant
                  </span>
                </div>
              )
            )}

          </div>

        </div>


        {/* CHAT */}

        <div className="chat-section">

          <h2>
            Meeting Chat
          </h2>

          <div className="chat-messages">

            {messages.length ===
            0 ? (
              <p className="empty-chat">
                No messages yet.
              </p>
            ) : (
              messages.map(
                (
                  msg,
                  index
                ) => (
                  <div
                    className="chat-message"
                    key={
                      index
                    }
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
              value={
                message
              }
              onChange={(
                event
              ) =>
                setMessage(
                  event
                    .target
                    .value
                )
              }
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  sendMessage();
                }
              }}
            />

            <button
              onClick={
                sendMessage
              }
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
          Add your meeting notes and
          generate a summary with
          action items.
        </p>

        <div
          style={{
            marginTop:
              "20px",
          }}
        >

          <label
            style={{
              display:
                "block",
              marginBottom:
                "8px",
              fontWeight:
                "bold",
            }}
          >
            Meeting Notes
          </label>

          <textarea
            value={
              meetingNotes
            }
            onChange={(
              event
            ) =>
              setMeetingNotes(
                event
                  .target
                  .value
              )
            }
            placeholder="Enter important points discussed during the meeting..."
            style={{
              width:
                "100%",
              minHeight:
                "150px",
              padding:
                "12px",
              borderRadius:
                "8px",
              border:
                "1px solid #6b7280",
              background:
                "#111827",
              color:
                "white",
              resize:
                "vertical",
            }}
          />

        </div>

        <button
          className="create-meeting-button"
          onClick={
            generateAISummary
          }
          disabled={
            aiLoading
          }
        >
          {aiLoading
            ? "🤖 Generating..."
            : "✨ Generate AI Summary"}
        </button>

        {aiSummary && (
          <div
            className="ai-card"
            style={{
              marginTop:
                "20px",
            }}
          >

            <h3>
              📝 AI Meeting Summary
            </h3>

            <div
              style={{
                whiteSpace:
                  "pre-wrap",
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


/* =========================================================
   REMOTE VIDEO COMPONENT
========================================================= */

function RemoteVideo({
  participant,
}: {
  participant: Participant;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    if (
      videoRef.current &&
      participant.stream
    ) {
      videoRef.current.srcObject =
        participant.stream;
    }
  }, [
    participant.stream,
  ]);

  return (
    <div
      style={{
        position:
          "relative",
        background:
          "#030712",
        borderRadius:
          "12px",
        overflow:
          "hidden",
        minHeight:
          "220px",
      }}
    >

      {participant.stream ? (
        <video
          ref={
            videoRef
          }
          autoPlay
          playsInline
          style={{
            width:
              "100%",
            height:
              "250px",
            objectFit:
              "cover",
            display:
              "block",
          }}
        />
      ) : (
        <div
          style={{
            height:
              "250px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            color:
              "white",
            flexDirection:
              "column",
          }}
        >

          <div
            style={{
              fontSize:
                "40px",
            }}
          >
            👤
          </div>

          <strong>
            {participant.name}
          </strong>

          <span
            style={{
              marginTop:
                "5px",
              color:
                "#9ca3af",
              fontSize:
                "12px",
            }}
          >
            Connecting...
          </span>

        </div>
      )}

      <div
        style={{
          position:
            "absolute",
          bottom:
            "10px",
          left:
            "10px",
          background:
            "rgba(0,0,0,0.65)",
          color:
            "white",
          padding:
            "6px 10px",
          borderRadius:
            "7px",
          fontSize:
            "12px",
        }}
      >
        {participant.name}
      </div>

    </div>
  );
}

export default MeetingRoom;