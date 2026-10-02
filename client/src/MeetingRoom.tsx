
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";

const BACKEND_URL =
  "https://intellmeet-backend-u3jz.onrender.com";

type Participant = {
  socketId: string;
  name: string;
};

type ChatMessage = {
  sender: string;
  message: string;
  socketId?: string;
};

type RemoteVideoProps = {
  stream: MediaStream;
  name: string;
};

function RemoteVideo({
  stream,
  name
}: RemoteVideoProps) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="remote-video-card">
      <video
        ref={videoRef}
        autoPlay
        playsInline
      />

      <div className="remote-video-name">
        {name}
      </div>
    </div>
  );
}

function MeetingRoom({
  meetingId,
  userName = "Participant",
  onLeave
}: {
  meetingId: string;
  userName?: string;
  onLeave?: () => void;
}) {
  const socketRef =
    useRef<Socket | null>(null);

  const localVideoRef =
    useRef<HTMLVideoElement>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const peerConnectionsRef =
    useRef<Record<string, RTCPeerConnection>>({});

  const participantNamesRef =
    useRef<Record<string, string>>({});

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [remoteStreams, setRemoteStreams] =
    useState<
      Record<
        string,
        {
          stream: MediaStream;
          name: string;
        }
      >
    >({});

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [messageInput, setMessageInput] =
    useState("");

  const [isMuted, setIsMuted] =
    useState(false);

  const [isCameraOff, setIsCameraOff] =
    useState(false);

  const [isScreenSharing, setIsScreenSharing] =
    useState(false);

  const screenStreamRef =
    useRef<MediaStream | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");

  const [meetingNotes, setMeetingNotes] =
    useState("");

  const [aiResult, setAiResult] =
    useState("");

  const [aiLoading, setAiLoading] =
    useState(false);

  /*
  =========================================
  CREATE PEER CONNECTION
  =========================================
  */

  const createPeerConnection = (
    remoteSocketId: string,
    remoteName: string
  ) => {
    if (
      peerConnectionsRef.current[remoteSocketId]
    ) {
      return peerConnectionsRef.current[
        remoteSocketId
      ];
    }

    participantNamesRef.current[
      remoteSocketId
    ] = remoteName;

    const peerConnection =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302"
          }
        ]
      });

    peerConnectionsRef.current[
      remoteSocketId
    ] = peerConnection;

    if (localStreamRef.current) {
      localStreamRef.current
        .getTracks()
        .forEach((track) => {
          peerConnection.addTrack(
            track,
            localStreamRef.current!
          );
        });
    }

    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];

      if (!stream) {
        return;
      }

      const name =
        participantNamesRef.current[
          remoteSocketId
        ] ||
        remoteName ||
        "Participant";

      setRemoteStreams((prev) => ({
        ...prev,
        [remoteSocketId]: {
          stream,
          name
        }
      }));
    };

    peerConnection.onicecandidate =
      (event) => {
        if (
          event.candidate &&
          socketRef.current
        ) {
          socketRef.current.emit(
            "webrtcIceCandidate",
            {
              target: remoteSocketId,
              candidate: event.candidate
            }
          );
        }
      };

    return peerConnection;
  };

  /*
  =========================================
  ADD LOCAL TRACKS
  =========================================
  */

  const addLocalTracksToPeers = (
    stream: MediaStream
  ) => {
    Object.values(
      peerConnectionsRef.current
    ).forEach((peer) => {
      const existingTrackIds =
        peer
          .getSenders()
          .map(
            (sender) =>
              sender.track?.id
          );

      stream.getTracks().forEach(
        (track) => {
          if (
            !existingTrackIds.includes(
              track.id
            )
          ) {
            peer.addTrack(
              track,
              stream
            );
          }
        }
      );
    });
  };

  /*
  =========================================
  CAMERA AND MICROPHONE
  =========================================
  */

  useEffect(() => {
    let mounted = true;

    const startMedia = async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: true
            }
          );

        if (!mounted) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        localStreamRef.current =
          stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject =
            stream;
        }

        addLocalTracksToPeers(
          stream
        );

        console.log(
          "Camera and microphone started."
        );
      } catch (error: any) {
        console.error(
          "Camera/microphone error:",
          error
        );

        if (
          error?.name ===
          "NotAllowedError"
        ) {
          alert(
            "Camera and microphone permission was denied. Please allow them in your browser."
          );
        } else {
          alert(
            "Camera or microphone could not be started."
          );
        }
      }
    };

    startMedia();

    return () => {
      mounted = false;

      localStreamRef.current
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        );
    };
  }, []);

  /*
  =========================================
  CREATE OFFER
  =========================================
  */

  const createOfferForParticipant =
    async (
      remoteSocketId: string,
      remoteName: string
    ) => {
      try {
        const peerConnection =
          createPeerConnection(
            remoteSocketId,
            remoteName
          );

        const offer =
          await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
          offer
        );

        socketRef.current?.emit(
          "webrtcOffer",
          {
            target: remoteSocketId,
            offer
          }
        );
      } catch (error) {
        console.error(
          "Offer error:",
          error
        );
      }
    };

  /*
  =========================================
  SOCKET CONNECTION
  =========================================
  */

  useEffect(() => {
    const socket = io(
      BACKEND_URL,
      {
        transports: [
          "websocket",
          "polling"
        ],
        reconnection: true,
        reconnectionAttempts: 10
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      setConnectionStatus(
        "Connected"
      );

      socket.emit(
        "joinMeeting",
        {
          meetingId,
          userName:
            userName || "Participant"
        }
      );

      console.log(
        "Joined meeting:",
        meetingId,
        userName
      );
    });

    socket.on(
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

    socket.on("disconnect", () => {
      setConnectionStatus(
        "Disconnected"
      );
    });

    /*
    EXISTING PARTICIPANTS
    */

    socket.on(
      "existingParticipants",
      ({
        participants:
          existingParticipants
      }) => {
        console.log(
          "Existing participants:",
          existingParticipants
        );

        if (
          !Array.isArray(
            existingParticipants
          )
        ) {
          return;
        }

        existingParticipants.forEach(
          (data: any) => {
            let socketId = "";
            let name =
              "Participant";

            if (
              typeof data ===
              "string"
            ) {
              socketId = data;
            } else if (
              data &&
              typeof data ===
                "object"
            ) {
              socketId =
                data.socketId;

              name =
                data.userName ||
                data.name ||
                "Participant";
            }

            if (!socketId) {
              return;
            }

            participantNamesRef.current[
              socketId
            ] = name;

            setParticipants(
              (prev) => {
                if (
                  prev.some(
                    (p) =>
                      p.socketId ===
                      socketId
                  )
                ) {
                  return prev;
                }

                return [
                  ...prev,
                  {
                    socketId,
                    name
                  }
                ];
              }
            );

            createOfferForParticipant(
              socketId,
              name
            );
          }
        );
      }
    );

    /*
    NEW PARTICIPANT
    */

    socket.on(
      "participantJoined",
      ({
        socketId,
        userName:
          remoteUserName
      }) => {
        if (!socketId) {
          return;
        }

        const name =
          remoteUserName ||
          "Participant";

        console.log(
          "New participant:",
          socketId,
          name
        );

        participantNamesRef.current[
          socketId
        ] = name;

        setParticipants(
          (prev) => {
            const exists =
              prev.some(
                (p) =>
                  p.socketId ===
                  socketId
              );

            if (exists) {
              return prev;
            }

            return [
              ...prev,
              {
                socketId,
                name
              }
            ];
          }
        );

        createPeerConnection(
          socketId,
          name
        );
      }
    );

    /*
    USER JOINED
    */

    socket.on(
      "userJoined",
      ({
        message
      }) => {
        if (!message) {
          return;
        }

        setMessages(
          (prev) => [
            ...prev,
            {
              sender: "System",
              message
            }
          ]
        );
      }
    );

    /*
    WEBRTC OFFER
    */

    socket.on(
      "webrtcOffer",
      async ({
        offer,
        sender
      }) => {
        try {
          if (
            !sender ||
            !offer
          ) {
            return;
          }

          const remoteName =
            participantNamesRef
              .current[sender] ||
            "Participant";

          const peerConnection =
            createPeerConnection(
              sender,
              remoteName
            );

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          );

          if (
            localStreamRef.current
          ) {
            addLocalTracksToPeers(
              localStreamRef.current
            );
          }

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );

          socket.emit(
            "webrtcAnswer",
            {
              target: sender,
              answer
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

    /*
    WEBRTC ANSWER
    */

    socket.on(
      "webrtcAnswer",
      async ({
        answer,
        sender
      }) => {
        try {
          const peerConnection =
            peerConnectionsRef.current[
              sender
            ];

          if (
            !peerConnection ||
            !answer
          ) {
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              answer
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

    /*
    ICE CANDIDATE
    */

    socket.on(
      "webrtcIceCandidate",
      async ({
        candidate,
        sender
      }) => {
        try {
          const peerConnection =
            peerConnectionsRef.current[
              sender
            ];

          if (
            !peerConnection ||
            !candidate
          ) {
            return;
          }

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              candidate
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

    /*
    CHAT
    */

    socket.on(
      "receiveMessage",
      ({
        message,
        sender,
        socketId
      }) => {
        console.log(
          "Chat message received:",
          message,
          sender
        );

        if (!message) {
          return;
        }

        setMessages(
          (prev) => [
            ...prev,
            {
              message,
              sender:
                sender ||
                "Participant",
              socketId
            }
          ]
        );
      }
    );

    /*
    PARTICIPANT LEFT
    */

    socket.on(
      "participantLeft",
      ({
        socketId,
        userName:
          remoteUserName
      }) => {
        setParticipants(
          (prev) =>
            prev.filter(
              (p) =>
                p.socketId !==
                socketId
            )
        );

        delete participantNamesRef
          .current[socketId];

        setRemoteStreams(
          (prev) => {
            const updated = {
              ...prev
            };

            delete updated[
              socketId
            ];

            return updated;
          }
        );

        const peer =
          peerConnectionsRef.current[
            socketId
          ];

        if (peer) {
          peer.close();

          delete peerConnectionsRef.current[
            socketId
          ];
        }

        if (remoteUserName) {
          setMessages(
            (prev) => [
              ...prev,
              {
                sender: "System",
                message:
                  `${remoteUserName} left the meeting.`
              }
            ]
          );
        }
      }
    );

    return () => {
      socket.emit(
        "leaveMeeting",
        meetingId
      );

      socket.disconnect();

      Object.values(
        peerConnectionsRef.current
      ).forEach((peer) =>
        peer.close()
      );

      peerConnectionsRef.current =
        {};

      participantNamesRef.current =
        {};
    };
  }, [meetingId, userName]);

  /*
  =========================================
  MUTE
  =========================================
  */

  const toggleMute = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      alert(
        "Microphone is not available."
      );

      return;
    }

    const tracks =
      stream.getAudioTracks();

    if (!tracks.length) {
      alert(
        "No microphone was detected."
      );

      return;
    }

    tracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setIsMuted(
      (prev) => !prev
    );
  };

  /*
  =========================================
  CAMERA
  =========================================
  */

  const toggleCamera = () => {
    const stream =
      localStreamRef.current;

    if (!stream) {
      alert(
        "Camera is not available."
      );

      return;
    }

    const tracks =
      stream.getVideoTracks();

    if (!tracks.length) {
      alert(
        "No camera was detected."
      );

      return;
    }

    tracks.forEach(
      (track) => {
        track.enabled =
          !track.enabled;
      }
    );

    setIsCameraOff(
      (prev) => !prev
    );
  };

  /*
  =========================================
  SCREEN SHARING
  =========================================
  */

  const toggleScreenShare =
    async () => {
      try {
        if (
          !isScreenSharing
        ) {
          const screenStream =
            await navigator.mediaDevices.getDisplayMedia(
              {
                video: true
              }
            );

          screenStreamRef.current =
            screenStream;

          const screenTrack =
            screenStream.getVideoTracks()[0];

          Object.values(
            peerConnectionsRef.current
          ).forEach(
            (peer) => {
              const sender =
                peer
                  .getSenders()
                  .find(
                    (item) =>
                      item.track?.kind ===
                      "video"
                  );

              if (sender) {
                sender.replaceTrack(
                  screenTrack
                );
              }
            }
          );

          if (
            localVideoRef.current
          ) {
            localVideoRef.current.srcObject =
              screenStream;
          }

          screenTrack.onended =
            () => {
              stopScreenShare();
            };

          setIsScreenSharing(
            true
          );
        } else {
          stopScreenShare();
        }
      } catch (error) {
        console.error(
          "Screen sharing error:",
          error
        );
      }
    };

  const stopScreenShare =
    () => {
      const cameraStream =
        localStreamRef.current;

      if (!cameraStream) {
        return;
      }

      const cameraTrack =
        cameraStream.getVideoTracks()[0];

      Object.values(
        peerConnectionsRef.current
      ).forEach(
        (peer) => {
          const sender =
            peer
              .getSenders()
              .find(
                (item) =>
                  item.track?.kind ===
                  "video"
              );

          if (
            sender &&
            cameraTrack
          ) {
            sender.replaceTrack(
              cameraTrack
            );
          }
        }
      );

      if (
        localVideoRef.current
      ) {
        localVideoRef.current.srcObject =
          cameraStream;
      }

      screenStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      screenStreamRef.current =
        null;

      setIsScreenSharing(
        false
      );
    };

  /*
  =========================================
  SEND CHAT
  =========================================
  */

  const sendMessage = () => {
    const message =
      messageInput.trim();

    if (!message) {
      return;
    }

    const socket =
      socketRef.current;

    if (!socket) {
      alert(
        "Meeting connection is not ready."
      );

      return;
    }

    if (!socket.connected) {
      alert(
        "You are not connected to the meeting."
      );

      return;
    }

    console.log(
      "Sending chat message:",
      message
    );

    socket.emit(
      "sendMessage",
      {
        meetingId,
        message,
        sender:
          userName ||
          "Participant"
      }
    );

    setMessageInput("");
  };

  /*
  =========================================
  AI SUMMARY
  =========================================
  */

  const generateAiSummary =
    async () => {
      if (
        !meetingNotes.trim()
      ) {
        alert(
          "Please enter meeting notes first."
        );

        return;
      }

      try {
        setAiLoading(true);
        setAiResult("");

        const token =
          localStorage.getItem(
            "token"
          );

        const response =
          await axios.post(
            `${BACKEND_URL}/api/ai/summarize`,
            {
              meetingNotes
            },
            {
              headers: {
                Authorization:
                  token
                    ? `Bearer ${token}`
                    : ""
              }
            }
          );

        setAiResult(
          response.data.result ||
            "AI summary generated."
        );
      } catch (error: any) {
        console.error(
          "AI summary error:",
          error
        );

        setAiResult(
          error.response?.data
            ?.message ||
            "AI service is currently unavailable. Your meeting system is still working normally."
        );
      } finally {
        setAiLoading(false);
      }
    };

  /*
  =========================================
  LEAVE
  =========================================
  */

  const leaveMeeting = () => {
    socketRef.current?.emit(
      "leaveMeeting",
      meetingId
    );

    Object.values(
      peerConnectionsRef.current
    ).forEach((peer) =>
      peer.close()
    );

    localStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    screenStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    socketRef.current?.disconnect();

    if (onLeave) {
      onLeave();
    }
  };

  const participantCount =
    participants.length + 1;

  /*
  =========================================
  UI
  =========================================
  */

  return (
    <div className="meeting-room">

      <div className="meeting-header">

        <div>
          <h2>{meetingId}</h2>

          <span>
            ● {connectionStatus}
          </span>
        </div>

        <div>
          👥 {participantCount} participants
        </div>

        <button
          onClick={leaveMeeting}
        >
          Leave Meeting
        </button>

      </div>

      <div className="meeting-content">

        <div className="video-section">

          <div className="video-grid">

            <div className="local-video-card">

              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
              />

              <div className="local-video-name">
                {userName}{" "}
                <span>You</span>
              </div>

            </div>

            {Object.entries(
              remoteStreams
            ).map(
              ([
                socketId,
                remote
              ]) => (
                <RemoteVideo
                  key={socketId}
                  stream={remote.stream}
                  name={remote.name}
                />
              )
            )}

          </div>

          <div className="meeting-controls">

            <button
              onClick={toggleMute}
            >
              {isMuted
                ? "🔇 Unmute"
                : "🎤 Mute"}
            </button>

            <button
              onClick={toggleCamera}
            >
              {isCameraOff
                ? "📹 Camera On"
                : "📹 Camera Off"}
            </button>

            <button
              onClick={
                toggleScreenShare
              }
            >
              🖥️{" "}
              {isScreenSharing
                ? "Stop Sharing"
                : "Share Screen"}
            </button>

          </div>

        </div>

        <div className="meeting-sidebar">

          <div className="participants-panel">

            <h3>
              Meeting Participants
            </h3>

            <div className="participant-list">

              <div className="participant-item">
                <strong>
                  {userName}
                </strong>

                <span>
                  You • Host
                </span>
              </div>

              {participants.map(
  (participant) => (
    <div
      className="participant-item"
      key={
        participant.socketId
      }
    >
      <strong>
        {participant.name}
      </strong>

      <span>
        Connected
      </span>
    </div>
  )
)}

            </div>

          </div>

          <div className="chat-panel">

            <h3>
              Meeting Chat
            </h3>

            <div className="chat-messages">

              {messages.length === 0 ? (
                <div
                  style={{
                    color:
                      "#94a3b8",
                    fontSize:
                      "13px",
                    padding:
                      "10px"
                  }}
                >
                  No messages yet.
                  Say hello!
                </div>
              ) : (
                messages.map(
                  (
                    message,
                    index
                  ) => (
                    <div
                      key={index}
                      className="chat-message"
                    >
                      <strong>
                        {message.sender}:
                      </strong>{" "}
                      {message.message}
                    </div>
                  )
                )
              )}

            </div>

            <div className="chat-input">

              <input
                type="text"
                value={messageInput}
                onChange={(e) =>
                  setMessageInput(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
              />

              <button
                onClick={sendMessage}
              >
                Send
              </button>

            </div>

          </div>

          <div className="ai-panel">

            <h3>
              🤖 AI Meeting Assistant
            </h3>

            <p>
              Add your meeting notes
              and generate a summary
              with action items.
            </p>

            <textarea
              value={meetingNotes}
              onChange={(e) =>
                setMeetingNotes(
                  e.target.value
                )
              }
              placeholder="Enter meeting notes..."
              rows={7}
            />

            <button
              onClick={
                generateAiSummary
              }
              disabled={aiLoading}
            >
              {aiLoading
                ? "Generating..."
                : "✨ Generate AI Summary"}
            </button>

            {aiResult && (
              <div className="ai-result">
                <h4>AI Result</h4>

                <pre>
                  {aiResult}
                </pre>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default MeetingRoom;