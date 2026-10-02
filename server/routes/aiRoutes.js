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

    // AI URL can be configured through Render environment variables.
    // For local development, it can remain:
    // http://127.0.0.1:11434/api/generate

    const aiUrl =
      process.env.AI_URL ||
      "http://127.0.0.1:11434/api/generate";

    const aiModel =
      process.env.AI_MODEL ||
      "qwen2.5:3b";

    const response = await axios.post(
      aiUrl,
      {
        model: aiModel,
        prompt: prompt,
        stream: false
      },
      {
        timeout: 60000
      }
    );

    res.json({
      message: "AI summary generated successfully",
      result: response.data.response
    });

  } catch (error) {

    console.error(
      "AI SERVICE ERROR:",
      error.response?.data || error.message
    );

    res.status(503).json({
      message:
        "AI service is currently unavailable. Your meeting system is still working normally.",
      aiAvailable: false
    });
  }
});

module.exports = router;