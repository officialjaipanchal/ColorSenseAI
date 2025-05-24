// const express = require("express");
// const router = express.Router();
// const OpenAI = require("openai");
// const Color = require("../models/Color");
// const logger = require("../utils/logger");

// // Ensure OpenAI API key is present
// if (!process.env.OPENAI_API_KEY) {
//   logger.error("Missing OpenAI API key. Set OPENAI_API_KEY in your .env file.");
// }

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// const systemMessage = `You are Betty, Benjamin Moore's virtual color consultant. You help users choose paint colors based on room type, lighting, furniture, and mood.

// Instructions:
// - Always recommend 2–3 Benjamin Moore colors in the format: Color: <name> (<code>) - <short description>
// - Include a 'Suggestions:' section with practical tips (1 per line)
// - For general color requests, suggest a mix of popular and versatile colors
// - Keep responses focused and specific
// - No promotional content unless user asks for it
// - When asked for more colors or clarification, provide new color recommendations
// - When asked to show colors, provide the color codes and explain how to view them on Benjamin Moore's website

// Sample Response:
// Color: Chantilly Lace (2121-70) - A crisp, clean white perfect for modern spaces.
// Color: Hale Navy (HC-154) - A sophisticated navy that adds depth and drama.
// Color: Edgecomb Gray (HC-173) - A warm, versatile gray that creates a cozy atmosphere.
// Suggestions:
// - These colors work well together in any room
// - Perfect for creating a balanced, harmonious space
// - Great for both traditional and contemporary settings

// For color visualization requests:
// You can view these colors on Benjamin Moore's website by visiting:
// - Chantilly Lace: https://www.benjaminmoore.com/en-us/paint-colors/color/2121-70
// - Hale Navy: https://www.benjaminmoore.com/en-us/paint-colors/color/HC-154
// - Edgecomb Gray: https://www.benjaminmoore.com/en-us/paint-colors/color/HC-173

// Always select colors only from the provided dataset.`;

// router.post("/", async (req, res) => {
//   const startTime = Date.now();

//   const { message, conversationHistory = [] } = req.body;

//   // Validate message input
//   if (!message || typeof message !== "string" || message.trim() === "") {
//     return res
//       .status(400)
//       .json({ error: "Invalid or missing message content." });
//   }

//   logger.info("Received consultation", {
//     message,
//     historyLength: Array.isArray(conversationHistory)
//       ? conversationHistory.length
//       : 0,
//   });

//   try {
//     if (!process.env.OPENAI_API_KEY) {
//       return res.status(500).json({
//         error: "OpenAI not configured. Contact support.",
//       });
//     }

//     // Check if this is a request for more colors or clarification
//     const isMoreRequest =
//       message.toLowerCase().includes("more") ||
//       message.toLowerCase().includes("another") ||
//       message.toLowerCase().includes("suggest") ||
//       message.toLowerCase().includes("why") ||
//       message.toLowerCase().includes("again");

//     // Check if this is a request to show colors
//     const isShowColorsRequest =
//       message.toLowerCase().includes("show") ||
//       message.toLowerCase().includes("see") ||
//       message.toLowerCase().includes("view") ||
//       message.toLowerCase().includes("look");

//     // Process the message based on the request type
//     let processedMessage = message;
//     if (isMoreRequest && conversationHistory.length > 0) {
//       processedMessage =
//         "Please suggest additional colors that would work well with the previous recommendations. Make sure to include both colors and suggestions.";
//     } else if (isShowColorsRequest) {
//       processedMessage =
//         "Please provide the color codes and explain how to view these colors on Benjamin Moore's website.";
//     }

//     const messages = [
//       { role: "system", content: systemMessage },
//       ...(Array.isArray(conversationHistory) ? conversationHistory : [])
//         .filter(
//           (msg) => msg && typeof msg === "object" && msg.role && msg.content
//         )
//         .map((msg) => ({
//           role: msg.role,
//           content: msg.content || "",
//         })),
//       { role: "user", content: processedMessage },
//     ];

//     const colors = await Color.find({});
//     const colorContext = colors.map((c) => ({
//       name: c.name,
//       code: c.code,
//       family: c.family,
//       collection: c.collection,
//       undertone: c.undertone,
//       lrv: c.lrv,
//       description: c.description,
//       suggestedRooms: c.suggestedRooms,
//       style: c.style,
//     }));

//     messages[0].content += `\n\nAvailable Benjamin Moore colors:\n${JSON.stringify(
//       colorContext,
//       null,
//       2
//     )}`;

//     logger.debug("Sending to OpenAI", {
//       model: "gpt-4",
//       count: messages.length,
//       environment: process.env.NODE_ENV || "development",
//       service: "colorsense-api",
//       timestamp: new Date().toISOString(),
//     });

//     const completion = await openai.chat.completions.create({
//       model: "gpt-4",
//       messages,
//       temperature: 0.7,
//       max_tokens: 600,
//     });

//     let response = completion.choices[0]?.message?.content;

//     if (!response) {
//       throw new Error("No response from OpenAI");
//     }

//     logger.info("Consultation completed", {
//       duration: Date.now() - startTime,
//       length: response.length,
//     });

//     res.json({ message: response });
//   } catch (error) {
//     logger.error("Error during consultation", {
//       error: error.message,
//       code: error.code,
//       duration: Date.now() - startTime,
//       stack: error.stack,
//       environment: process.env.NODE_ENV || "development",
//       service: "colorsense-api",
//       timestamp: new Date().toISOString(),
//     });

//     const errorMessages = {
//       invalid_api_key: "OpenAI not configured. Contact support.",
//       rate_limit_exceeded: "Consultant is busy. Try again soon.",
//     };

//     res.status(error.code === "rate_limit_exceeded" ? 429 : 500).json({
//       error:
//         errorMessages[error.code] ||
//         "Unexpected issue. Please try again later.",
//     });
//   }
// });

// module.exports = router;
