const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/summarize", async (req, res) => {
  try {
    const { meetingNotes } = req.body;

    if (!meetingNotes || !meetingNotes.trim()) {
      return res.status(400).json({
        message: "Please provide meeting notes."
      });
    }

    const prompt = `
You are an AI meeting assistant.

Analyze the following meeting notes.

Meeting Notes:
${meetingNotes}

Please provide:

SUMMARY:
Write a clear and concise summary of the meeting.

ACTION ITEMS:
1. List the first important action.
2. List the second important action.
3. List the third important action.

Keep the response professional and easy to understand.
`;

    const response = await axios.post(
      "http://127.0.0.1:11434/api/generate",
      {
        model: "qwen2.5:3b",
        prompt: prompt,
        stream: false
      }
    );

    res.json({
      message: "AI summary generated successfully",
      result: response.data.response
    });

  } catch (error) {
    console.error("LOCAL AI ERROR:", error.message);

    res.status(500).json({
      message: "AI summary generation failed",
      error: error.message
    });
  }
});

module.exports = router;