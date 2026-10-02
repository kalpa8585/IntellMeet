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


// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.CLIENT_URL
].filter(Boolean);


// Express CORS
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());


// ==========================================
// SOCKET.IO
// ==========================================

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {

      // Allow requests without an origin
      // such as Postman or server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked Socket.IO origin:", origin);

      return callback(
        new Error("Not allowed by Socket.IO CORS")
      );
    },

    methods: ["GET", "POST"],
    credentials: true
  }
});


// ==========================================
// DATABASE
// ==========================================

connectDB();


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "IntellMeet API is running successfully"
  });
});


// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

app.use("/api/meetings", meetingRoutes);

app.use("/api/ai", aiRoutes);


// ==========================================
// SOCKET.IO CONNECTION
// ==========================================

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);


  // ========================================
  // JOIN MEETING
  // ========================================

  socket.on("joinMeeting", (meetingId) => {

    if (!meetingId) {
      return;
    }

    // Get participants already inside
    // the meeting BEFORE adding the new user.
    const existingRoom = io.sockets.adapter.rooms.get(meetingId);

    const existingParticipants = existingRoom
      ? [...existingRoom]
      : [];


    // Join the meeting room
    socket.join(meetingId);

    console.log(
      `User ${socket.id} joined meeting ${meetingId}`
    );


    // Send existing participants
    // ONLY to the new participant.
    socket.emit("existingParticipants", {
      participants: existingParticipants
    });


    // Inform existing participants
    // that a new user has joined.
    socket.to(meetingId).emit("participantJoined", {
      socketId: socket.id
    });


    // Chat/system notification
    socket.to(meetingId).emit("userJoined", {
      message: "A new participant joined the meeting.",
      socketId: socket.id
    });

  });


  // ========================================
  // CHAT MESSAGE
  // ========================================

  socket.on("sendMessage", (data) => {

    if (!data || !data.meetingId || !data.message) {
      return;
    }

    console.log(
      `Chat message in ${data.meetingId}:`,
      data.message
    );


    io.to(data.meetingId).emit("receiveMessage", {
      message: data.message,
      sender: data.sender || "Participant",
      socketId: socket.id
    });

  });


  // ========================================
  // WEBRTC OFFER
  // ========================================

  socket.on("webrtcOffer", (data) => {

    if (!data || !data.target || !data.offer) {
      return;
    }

    console.log(
      `WebRTC offer from ${socket.id} to ${data.target}`
    );


    io.to(data.target).emit("webrtcOffer", {
      offer: data.offer,
      sender: socket.id
    });

  });


  // ========================================
  // WEBRTC ANSWER
  // ========================================

  socket.on("webrtcAnswer", (data) => {

    if (!data || !data.target || !data.answer) {
      return;
    }

    console.log(
      `WebRTC answer from ${socket.id} to ${data.target}`
    );


    io.to(data.target).emit("webrtcAnswer", {
      answer: data.answer,
      sender: socket.id
    });

  });


  // ========================================
  // WEBRTC ICE CANDIDATE
  // ========================================

  socket.on("webrtcIceCandidate", (data) => {

    if (!data || !data.target || !data.candidate) {
      return;
    }

    console.log(
      `WebRTC ICE candidate from ${socket.id} to ${data.target}`
    );


    io.to(data.target).emit("webrtcIceCandidate", {
      candidate: data.candidate,
      sender: socket.id
    });

  });


  // ========================================
  // LEAVE MEETING
  // ========================================

  socket.on("leaveMeeting", (meetingId) => {

    if (!meetingId) {
      return;
    }


    socket.to(meetingId).emit("participantLeft", {
      socketId: socket.id
    });


    socket.leave(meetingId);


    console.log(
      `User ${socket.id} left meeting ${meetingId}`
    );

  });


  // ========================================
  // DISCONNECT
  // ========================================

  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});