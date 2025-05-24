const express = require("express");
const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

const Color = require("../models/Color");
const logger = require("../utils/logger");

// Ensure Gemini API key is present
if (!process.env.GEMINI_API_KEY) {
  logger.error("Missing Gemini API key. Set GEMINI_API_KEY in your .env file.");
}

const systemMessage = `You are AI, ColorSense's virtual color consultant. You help users choose paint colors based on room type, lighting, furniture, and mood.

Instructions:
- Recommend colors based on the user's specific needs and context:
  • For general room color requests: 2-4 colors
  • For specific style requests: 3-5 colors
  • For color scheme requests: 4-6 colors
  • For accent color requests: 1-2 colors
  • For whole house color requests: 5-8 colors

- Format each color recommendation as follows:
🎨 [Color Name] ([Color Code])
• Hex: [Hex Code]
• Description: [Detailed description]
• Perfect for: [Suggested rooms]
• Style Tips: [Style-specific advice]
• Lighting Tips: [Lighting considerations]
• Mood: [Emotional impact]
• Pairing Suggestions: [Complementary colors]

- Include a 'Suggestions:' section with 3-5 practical tips based on the context:
• Consider room orientation and natural light
• Test colors in different lighting conditions
• Create a mood board with samples
• Think about furniture compatibility
• Consider maintenance and durability
• Consider the flow between rooms
• Think about the overall color story

- For each color recommendation, consider:
- Room's purpose and mood
- Natural and artificial lighting
- Furniture and decor compatibility
- Color psychology and emotional impact
- Current design trends
- Practical maintenance considerations
- User's specific requirements and preferences

- Keep responses focused and specific
- No promotional content unless user asks for it
- When asked for more colors or clarification, provide new color recommendations
- Focus on practical advice and color characteristics
- Adapt the number of suggestions based on the complexity of the request

Sample Response for a Living Room Request:
🎨 Chantilly Lace (2121-70)
• Hex: #F2F1E6
• Description: A crisp, clean white perfect for modern spaces
• Perfect for: Living Room, Kitchen, Bedroom
• Style Tips: Ideal for contemporary spaces with clean lines and minimal decor
• Lighting Tips: Best in south-facing rooms, maintains brightness in natural light
• Mood: Fresh and airy, creates a sense of space and cleanliness
• Pairing Suggestions: Complements bold accent colors and natural wood tones

🎨 Hale Navy (HC-154)
• Hex: #2D3142
• Description: A sophisticated navy that adds depth and drama
• Perfect for: Living Room, Dining Room, Study
• Style Tips: Perfect for creating a dramatic, sophisticated atmosphere
• Lighting Tips: Works well in rooms with good natural light
• Mood: Elegant and grounding, creates a sense of stability
• Pairing Suggestions: Pairs beautifully with crisp whites and warm metallics

🎨 Edgecomb Gray (HC-173)
• Hex: #D8D5CC
• Description: A warm, versatile gray that creates a cozy atmosphere
• Perfect for: Living Room, Family Room, Hallway
• Style Tips: Works well in both traditional and modern settings
• Lighting Tips: Adapts beautifully to different lighting conditions
• Mood: Warm and inviting, creates a comfortable atmosphere
• Pairing Suggestions: Pairs well with both warm and cool tones

Suggestions:
• Test these colors in different lighting conditions throughout the day
• Create a mood board with fabric and furniture samples
• Consider how these colors will flow with adjacent rooms
• Think about how the colors will complement your existing decor
• Sample the colors in small patches before committing

Always select colors only from the provided dataset.`;

router.post("/", async (req, res) => {
  const startTime = Date.now();
  const { message, conversationHistory = [] } = req.body;

  // Validate message input
  if (!message || typeof message !== "string" || message.trim() === "") {
    return res
      .status(400)
      .json({ error: "Invalid or missing message content." });
  }

  logger.info("Received consultation", {
    message,
    historyLength: Array.isArray(conversationHistory)
      ? conversationHistory.length
      : 0,
  });

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Gemini not configured. Contact support.",
      });
    }

    // Check if this is a request for more colors or clarification
    const isMoreRequest =
      message.toLowerCase().includes("more") ||
      message.toLowerCase().includes("another") ||
      message.toLowerCase().includes("suggest") ||
      message.toLowerCase().includes("why") ||
      message.toLowerCase().includes("again");

    // Check if this is a request to show colors
    const isShowColorsRequest =
      message.toLowerCase().includes("show") ||
      message.toLowerCase().includes("see") ||
      message.toLowerCase().includes("view") ||
      message.toLowerCase().includes("look");

    // Process the message based on the request type
    let processedMessage = message;
    if (isMoreRequest && conversationHistory.length > 0) {
      processedMessage =
        "Please suggest additional colors that would work well with the previous recommendations. Make sure to include both colors and suggestions.";
    } else if (isShowColorsRequest) {
      processedMessage =
        "Please provide the color codes and explain how to view these colors on Benjamin Moore's website.";
    }

    const colors = await Color.find({});
    const colorContext = colors.map((c) => ({
      name: c.name,
      code: c.code,
      family: c.family,
      collection: c.collection,
      undertone: c.undertone,
      lrv: c.lrv,
      description: c.description,
      suggestedRooms: c.suggestedRooms,
      style: c.style,
    }));

    // Prepare the prompt for Gemini
    const prompt = `${systemMessage}\n\nAvailable Benjamin Moore colors:\n${JSON.stringify(
      colorContext,
      null,
      2
    )}\n\nConversation history:\n${conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n")}\n\nUser: ${processedMessage}`;

    logger.debug("Sending to Gemini", {
      model: "gemini-1.5-flash",
      environment: process.env.NODE_ENV || "development",
      service: "colorsense-api",
      timestamp: new Date().toISOString(),
    });

    // Add API key as a query parameter
    const url = `${GEMINI_URL}?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini API error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    let geminiResponse = data.candidates[0]?.content?.parts[0]?.text;

    if (!geminiResponse) {
      throw new Error("No response from Gemini");
    }

    logger.info("Consultation completed", {
      duration: Date.now() - startTime,
      length: geminiResponse.length,
    });

    // Return response in the format expected by the frontend
    res.json({ response: geminiResponse });
  } catch (error) {
    logger.error("Error during consultation", {
      error: error.message,
      code: error.code,
      duration: Date.now() - startTime,
      stack: error.stack,
      environment: process.env.NODE_ENV || "development",
      service: "colorsense-api",
      timestamp: new Date().toISOString(),
    });

    const errorMessages = {
      invalid_api_key: "Gemini not configured. Contact support.",
      rate_limit_exceeded: "Consultant is busy. Try again soon.",
    };

    res.status(error.code === "rate_limit_exceeded" ? 429 : 500).json({
      error:
        errorMessages[error.code] ||
        "Unexpected issue. Please try again later.",
    });
  }
});

module.exports = router;
