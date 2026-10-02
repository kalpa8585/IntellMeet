
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const server = http.createServer(app);

/* =========================
   ALLOWED FRONTEND ORIGINS
========================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.CLIENT_URL
].filter(Boolean);

/* =========================
   MIDDLEWARE
========================= */

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());

/* =========================
   SOCKET.IO
========================= */

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log(
        "Blocked Socket.IO origin:",
        origin
      );

      return callback(
        new Error(
          "Not allowed by Socket.IO CORS"
        )
      );
    },

    methods: ["GET", "POST"],
    credentials: true
  }
});

/* =========================
   DATABASE
========================= */

connectDB();

/* =========================
   BASIC API
========================= */

app.get("/", (req, res) => {
  res.json({
    message:
      "IntellMeet API is running successfully"
  });
});

/* =========================
   API ROUTES
========================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/meetings",
  meetingRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

/* =========================
   SOCKET.IO MEETING SYSTEM
========================= */

io.on("connection", (socket) => {
  console.log(
    "================================="
  );

  console.log(
    "User connected:",
    socket.id
  );

  /* =========================
     JOIN MEETING
  ========================= */

  socket.on(
    "joinMeeting",
    (data) => {
      if (
        !data ||
        !data.meetingId
      ) {
        console.log(
          "Invalid joinMeeting data:",
          data
        );

        return;
      }

      const meetingId =
        String(
          data.meetingId
        ).trim();

      const userName =
        data.userName ||
        "Participant";

      /*
      Get participants BEFORE
      adding the current socket.
      */

      const existingRoom =
        io.sockets.adapter.rooms.get(
          meetingId
        );

      const existingParticipants =
        existingRoom
          ? [...existingRoom]
              .filter(
                (socketId) =>
                  socketId !==
                  socket.id
              )
              .map(
                (socketId) => {
                  const participantSocket =
                    io.sockets.sockets.get(
                      socketId
                    );

                  return {
                    socketId:
                      socketId,

                    userName:
                      participantSocket
                        ?.data
                        ?.userName ||
                      "Participant"
                  };
                }
              )
          : [];

      /*
      Save participant information
      on the socket.
      */

      socket.data.meetingId =
        meetingId;

      socket.data.userName =
        userName;

      /*
      Join Socket.IO room.
      */

      socket.join(
        meetingId
      );

      console.log(
        `User ${socket.id} (${userName}) joined meeting ${meetingId}`
      );

      console.log(
        "Existing participants:",
        existingParticipants
      );

      /*
      Send existing participants
      to the new participant.
      */

      socket.emit(
        "existingParticipants",
        {
          participants:
            existingParticipants
        }
      );

      /*
      Tell existing participants
      that a new participant joined.
      */

      socket
        .to(meetingId)
        .emit(
          "participantJoined",
          {
            socketId:
              socket.id,

            userName:
              userName
          }
        );

      /*
      Meeting notification.
      */

      socket
        .to(meetingId)
        .emit(
          "userJoined",
          {
            message:
              `${userName} joined the meeting.`,

            socketId:
              socket.id,

            userName:
              userName
          }
        );

      /*
      Log current room members
      AFTER joining.
      */

      const currentRoom =
        io.sockets.adapter.rooms.get(
          meetingId
        );

      console.log(
        "Current room members:",
        currentRoom
          ? [...currentRoom]
          : []
      );
    }
  );

  /* =========================
     CHAT
  ========================= */

  socket.on(
    "sendMessage",
    (data) => {
      if (
        !data ||
        !data.meetingId ||
        !data.message
      ) {
        console.log(
          "Invalid chat data:",
          data
        );

        return;
      }

      const meetingId =
        String(
          data.meetingId
        ).trim();

      const message =
        String(
          data.message
        ).trim();

      const sender =
        socket.data.userName ||
        data.sender ||
        "Participant";

      console.log(
        `Chat message in ${meetingId} from ${sender}:`,
        message
      );

      /*
      Make sure sender is actually
      inside the meeting room.
      */

      const room =
        io.sockets.adapter.rooms.get(
          meetingId
        );

      if (
        !room ||
        !room.has(socket.id)
      ) {
        console.log(
          "Chat rejected: socket is not inside meeting room.",
          socket.id,
          meetingId
        );

        return;
      }

      io.to(
        meetingId
      ).emit(
        "receiveMessage",
        {
          message:
            message,

          sender:
            sender,

          socketId:
            socket.id
        }
      );

      console.log(
        "Chat broadcast completed."
      );
    }
  );

  /* =========================
     WEBRTC OFFER
  ========================= */

  socket.on(
    "webrtcOffer",
    (data) => {
      if (
        !data ||
        !data.target ||
        !data.offer
      ) {
        return;
      }

      console.log(
        `WebRTC offer from ${socket.id} to ${data.target}`
      );

      io.to(
        data.target
      ).emit(
        "webrtcOffer",
        {
          offer:
            data.offer,

          sender:
            socket.id
        }
      );
    }
  );

  /* =========================
     WEBRTC ANSWER
  ========================= */

  socket.on(
    "webrtcAnswer",
    (data) => {
      if (
        !data ||
        !data.target ||
        !data.answer
      ) {
        return;
      }

      console.log(
        `WebRTC answer from ${socket.id} to ${data.target}`
      );

      io.to(
        data.target
      ).emit(
        "webrtcAnswer",
        {
          answer:
            data.answer,

          sender:
            socket.id
        }
      );
    }
  );

  /* =========================
     ICE CANDIDATE
  ========================= */

  socket.on(
    "webrtcIceCandidate",
    (data) => {
      if (
        !data ||
        !data.target ||
        !data.candidate
      ) {
        return;
      }

      console.log(
        `WebRTC ICE candidate from ${socket.id} to ${data.target}`
      );

      io.to(
        data.target
      ).emit(
        "webrtcIceCandidate",
        {
          candidate:
            data.candidate,

          sender:
            socket.id
        }
      );
    }
  );

  /* =========================
     LEAVE MEETING
  ========================= */

  socket.on(
    "leaveMeeting",
    (meetingId) => {
      if (!meetingId) {
        return;
      }

      const userName =
        socket.data.userName ||
        "Participant";

      console.log(
        `User ${socket.id} (${userName}) left meeting ${meetingId}`
      );

      socket
        .to(meetingId)
        .emit(
          "participantLeft",
          {
            socketId:
              socket.id,

            userName:
              userName
          }
        );

      socket.leave(
        meetingId
      );

      socket.data.meetingId =
        null;
    }
  );

  /* =========================
     DISCONNECT
  ========================= */

  socket.on(
    "disconnect",
    (reason) => {
      const meetingId =
        socket.data.meetingId;

      const userName =
        socket.data.userName ||
        "Participant";

      console.log(
        `User disconnected: ${socket.id} (${userName})`
      );

      console.log(
        "Disconnect reason:",
        reason
      );

      if (meetingId) {
        socket
          .to(meetingId)
          .emit(
            "participantLeft",
            {
              socketId:
                socket.id,

              userName:
                userName
            }
          );
      }
    }
  );
});

/* =========================
   START SERVER
========================= */

const PORT =
  process.env.PORT ||
  5000;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
