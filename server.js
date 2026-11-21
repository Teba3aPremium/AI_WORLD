
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing from .env file"
      });
    }

    const messages = req.body.messages || [];
    const latestMessage = req.body.message;

    let contents = [];

    if (messages.length > 0) {
      contents = messages.map((msg) => ({
        role: msg.role === "assistant" || msg.role === "model"
          ? "model"
          : "user",
        parts: [{ text: String(msg.content || msg.text || "") }]
      })).filter(msg => msg.parts[0].text.trim() !== "");
    } else if (latestMessage) {
      contents = [{
        role: "user",
        parts: [{ text: String(latestMessage) }]
      }];
    }

    if (contents.length === 0) {
      return res.status(400).json({
        error: "Please send a message"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are AI WORLD assistant. Help users understand artificial intelligence. Answer clearly and helpfully in the same language the user uses."
            }]
          },
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API request failed"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "I couldn't generate a response.";

    res.json({
      reply: reply,
      message: reply
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI WORLD is running at http://localhost:${PORT}`);
});
