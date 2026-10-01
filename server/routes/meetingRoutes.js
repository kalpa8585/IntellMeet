const express = require("express");
const Meeting = require("../models/Meeting");

const router = express.Router();


// CREATE MEETING
router.post("/create", async (req, res) => {
  try {
    console.log("CREATE MEETING REQUEST");
    console.log(req.body);

    const {
      title,
      date,
      time,
      duration,
      description,
      meetingId
    } = req.body;

    if (!title || !date || !time || !duration || !meetingId) {
      return res.status(400).json({
        message: "Missing required fields",
        receivedData: req.body
      });
    }

    const meeting = new Meeting({
      title: title,
      date: date,
      time: time,
      duration: Number(duration),
      description: description || "",
      meetingId: meetingId
    });

    const savedMeeting = await meeting.save();

    console.log("MEETING SAVED:", savedMeeting);

    res.status(201).json({
      message: "Meeting created successfully",
      meeting: savedMeeting
    });

  } catch (error) {
    console.error("CREATE MEETING ERROR:", error);

    res.status(500).json({
      message: "Meeting creation failed",
      error: error.message,
      name: error.name
    });
  }
});


// GET ALL MEETINGS
router.get("/all", async (req, res) => {
  try {
    console.log("GETTING ALL MEETINGS");

    const meetings = await Meeting.find()
      .sort({ createdAt: -1 });

    res.json({
      message: "Meetings retrieved successfully",
      meetings: meetings
    });

  } catch (error) {
    console.error("GET ALL MEETINGS ERROR:", error);

    res.status(500).json({
      message: "Unable to retrieve meetings",
      error: error.message
    });
  }
});


// GET MEETING BY MEETING ID
router.get("/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;

    console.log("SEARCHING FOR MEETING:", meetingId);

    const meeting = await Meeting.findOne({
      meetingId: meetingId
    });

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found"
      });
    }

    res.json({
      message: "Meeting found successfully",
      meeting: meeting
    });

  } catch (error) {
    console.error("FIND MEETING ERROR:", error);

    res.status(500).json({
      message: "Unable to find meeting",
      error: error.message
    });
  }
});


module.exports = router;