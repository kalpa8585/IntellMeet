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

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

connectDB();

app.use(cors());
app.use(express.json());


// HOME
app.get("/", (req, res) => {
  res.json({
    message: "IntellMeet API is running successfully"
  });
});


// AUTH ROUTES
app.use("/api/auth", authRoutes);


// MEETING ROUTES
app.use("/api/meetings", meetingRoutes);


// AI ROUTES
app.use("/api/ai", aiRoutes);


// SOCKET.IO
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);


  // JOIN MEETING ROOM
  socket.on("joinMeeting", (meetingId) => {

    socket.join(meetingId);

    console.log(
      `User ${socket.id} joined meeting ${meetingId}`
    );

    // Existing participants are informed
    // that a new participant has joined.
    socket.to(meetingId).emit("participantJoined", {
      socketId: socket.id
    });

    // Existing chat notification
    socket.to(meetingId).emit("userJoined", {
      message: "A new participant joined the meeting."
    });

  });


  // SEND CHAT MESSAGE
  socket.on("sendMessage", (data) => {

    console.log("Chat message:", data);

    io.to(data.meetingId).emit("receiveMessage", {
      message: data.message,
      sender: data.sender
    });

  });


  // WEBRTC OFFER
  socket.on("webrtcOffer", (data) => {

    console.log(
      `WebRTC offer from ${socket.id} to ${data.target}`
    );

    io.to(data.target).emit("webrtcOffer", {
      offer: data.offer,
      sender: socket.id
    });

  });


  // WEBRTC ANSWER
  socket.on("webrtcAnswer", (data) => {

    console.log(
      `WebRTC answer from ${socket.id} to ${data.target}`
    );

    io.to(data.target).emit("webrtcAnswer", {
      answer: data.answer,
      sender: socket.id
    });

  });


  // WEBRTC ICE CANDIDATE
  socket.on("webrtcIceCandidate", (data) => {

    console.log(
      `WebRTC ICE candidate from ${socket.id} to ${data.target}`
    );

    io.to(data.target).emit("webrtcIceCandidate", {
      candidate: data.candidate,
      sender: socket.id
    });

  });


  // LEAVE MEETING
  socket.on("leaveMeeting", (meetingId) => {

    socket.to(meetingId).emit("participantLeft", {
      socketId: socket.id
    });

    socket.leave(meetingId);

    console.log(
      `User ${socket.id} left meeting ${meetingId}`
    );

  });


  // DISCONNECT
  socket.on("disconnect", () => {

    console.log(
      "User disconnected:",
      socket.id
    );

  });

});


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});