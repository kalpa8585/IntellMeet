const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    date: {
      type: String,
      required: true
    },

    time: {
      type: String,
      required: true
    },

    duration: {
      type: Number,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    meetingId: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

module.exports = Meeting;