import React, { useState, useRef, useEffect } from "react";
import "./ColorConsultant.css";
import { FaHome, FaBed, FaChartLine } from "react-icons/fa";
// import {
//   getColorDetails,
//   searchColors,
//   initializeColorCache,
// } from "../utils/colorScraper";

const ColorConsultant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const messagesEndRef = useRef(null);
  const [colors, setColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeColors = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all colors from the API
        const response = await fetch("http://localhost:5001/api/colors");
        if (!response.ok) {
          throw new Error("Failed to fetch colors");
        }

        const data = await response.json();
        console.log("Fetched colors data:", data); // Debug log

        if (data.success && Array.isArray(data.data)) {
          if (data.data.length === 0) {
            setError(
              "No colors found in the database. Please try again later."
            );
            setLoading(false);
            return;
          }

          // Convert array of colors to object with color codes as keys
          const colorsMap = data.data.reduce((acc, color) => {
            if (color.code && color.hex) {
              // Ensure hex code starts with #
              const hexCode = color.hex.startsWith("#")
                ? color.hex
                : `#${color.hex}`;
              acc[color.code] = hexCode;
              console.log(`Mapped color ${color.code} to ${hexCode}`); // Debug log
            }
            return acc;
          }, {});

          console.log("Final colors map:", colorsMap); // Debug log
          setColors(colorsMap);
        } else {
          setError("Invalid color data received from database.");
        }

        setLoading(false);
        setRetryCount(0);
      } catch (err) {
        console.error("Error initializing colors:", err);
        setError(
          "Failed to load colors from database. Please try again later."
        );
        setLoading(false);
        setRetryCount(0);
      }
    };

    initializeColors();
  }, [retryCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // First try to search for colors
      const searchResults = await searchColorByName(userMessage);
      console.log("Search results:", searchResults);

      if (
        searchResults &&
        Array.isArray(searchResults) &&
        searchResults.length > 0
      ) {
        // Create a more detailed and creative message with color details
        const colorMessage = {
          role: "assistant",
          content: `I've curated some beautiful colors for you:\n\n${searchResults
            .map((color) => {
              const roomSuggestions =
                color.suggestedRooms?.join(", ") || "Living Room";
              const styleTips = getStyleTips(color);
              const lightingTips = getLightingTips(color);

              return `🎨 ${color.name} (${color.code})
• Hex: ${color.hex}
• Description: ${color.description}
• Perfect for: ${roomSuggestions}
• Style Tips: ${styleTips}
• Lighting Tips: ${lightingTips}
• Mood: ${getMoodDescription(color)}
• Pairing Suggestions: ${getColorPairings(color)}`;
            })
            .join("\n\n")}`,
          allColors: searchResults,
          suggestions: [
            "Try these colors in different lighting conditions - morning, afternoon, and evening",
            "Consider creating a mood board with fabric and furniture samples",
            "Test the colors in small patches before committing to the full room",
            "Think about how the colors will complement your existing furniture and decor",
            "Consider the room's orientation and natural light when making your final choice",
          ],
        };
        setMessages((prev) => [...prev, colorMessage]);
      } else {
        // If no colors found, try the normal query with enhanced prompt
        const response = await fetch("http://localhost:5001/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `As a creative color consultant, provide detailed and practical color recommendations for: ${userMessage}. 
            Consider the following aspects:
            - Room's purpose and mood
            - Natural and artificial lighting
            - Furniture and decor compatibility
            - Color psychology and emotional impact
            - Current design trends
            - Practical maintenance considerations
            Include specific Benjamin Moore color codes and detailed explanations for each recommendation.`,
            conversationHistory: messages,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        // Parse Betty's response for color and suggestions
        const parsed = await parseBettyResponse(data.response);
        setMessages((prev) => [...prev, { role: "assistant", ...parsed }]);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  // Parse Betty's response for color and suggestions
  const parseBettyResponse = async (message) => {
    const lines = message.split("\n");
    const colorMatches = message.match(/Color: ([^(]+)\(([^)]+)\) - ([^\n]+)/g);
    const parsedColors = [];
    let suggestions = [];

    if (colorMatches) {
      for (const colorLine of colorMatches) {
        const match = colorLine.match(/Color: ([^(]+)\(([^)]+)\) - ([^\n]+)/);
        if (match) {
          const colorName = match[1].trim();
          const colorCode = match[2].trim();
          const colorDesc = match[3].trim();

          // Get color hex from the colors state or fetch it
          let colorHex = colors[colorCode];
          if (!colorHex) {
            colorHex = await getColorHex(colorCode);
          }

          console.log(`Processing color ${colorCode}:`, {
            colorName,
            colorHex,
          });

          parsedColors.push({
            name: colorName,
            code: colorCode,
            hex: colorHex,
            description: colorDesc,
            family: "Unknown",
            collection: "Classic",
            undertone: "Neutral",
            lrv: "50",
            suggestedRooms: ["Living Room"],
            style: "Classic",
          });
        }
      }
    }

    // Find suggestions
    const suggestionsIdx = lines.findIndex((l) =>
      l.trim().startsWith("Suggestions:")
    );
    if (suggestionsIdx !== -1) {
      suggestions = lines
        .slice(suggestionsIdx + 1)
        .map((l) => l.replace(/^[-•]\s*/, "").trim())
        .filter(Boolean);
    }

    // If we have colors, return them with all details
    if (parsedColors.length > 0) {
      return {
        content: message,
        colorName: parsedColors[0].name,
        colorHex: parsedColors[0].hex,
        colorDesc: parsedColors[0].description,
        colorCode: parsedColors[0].code,
        suggestions,
        allColors: parsedColors,
      };
    }

    // Fallback to raw message if no colors found
    return {
      content: message,
      suggestions,
    };
  };

  const getBenjaminMooreUrl = (colorCode) => {
    // Convert color code to URL format (e.g., "2121-70" -> "2121-70")
    const formattedCode = colorCode.replace(/\s+/g, "");
    return `https://www.benjaminmoore.com/en-us/paint-colors/color/${formattedCode}`;
  };

  const getTextColor = (hexColor) => {
    // Return default text color if hexColor is invalid
    if (
      !hexColor ||
      typeof hexColor !== "string" ||
      !hexColor.startsWith("#")
    ) {
      return "#2D3142"; // Default dark text color
    }

    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? "#2D3142" : "#FFFFFF";
  };

  const handleColorClick = (hexColor) => {
    setBackgroundColor(hexColor);
  };

  const handleResetBackground = () => {
    setBackgroundColor("#FFFFFF");
  };

  const handleWelcomeSuggestion = (suggestion) => {
    setInput(suggestion);
    handleSubmit({ preventDefault: () => {} });
  };

  // Update extractColorCodes to use dynamic color data
  const extractColorCodes = (message) => {
    const colorMatches = message.match(/Color: ([^(]+)\(([^)]+)\) - ([^\n]+)/g);
    if (!colorMatches) return [];

    return colorMatches
      .map((colorLine) => {
        const match = colorLine.match(/Color: ([^(]+)\(([^)]+)\) - ([^\n]+)/);
        if (match) {
          const colorName = match[1].trim();
          const colorCode = match[2].trim();
          const colorDesc = match[3].trim();
          const colorHex = colors[colorCode] || "#FFFFFF";

          return {
            name: colorName,
            code: colorCode,
            hex: colorHex,
            description: colorDesc,
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  // Update the renderColorSwatches function to show hex codes
  const renderColorSwatches = (message) => {
    const colors = extractColorCodes(message);
    if (colors.length === 0) return null;

    return (
      <div className="color-swatches-container">
        {colors.map(
          (color, index) =>
            color.hex && (
              <div key={index} className="color-swatch-preview">
                <div
                  className="color-block"
                  style={{ backgroundColor: color.hex }}
                  onClick={() => handleColorClick(color.hex)}
                />
                <div className="color-info">
                  <span className="color-name">{color.name}</span>
                  <div className="color-codes">
                    <span className="color-code">{color.code}</span>
                    <span className="hex-code">{color.hex}</span>
                  </div>
                </div>
                <a
                  href={getBenjaminMooreUrl(color.code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-color-link"
                >
                  View on Benjamin Moore
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )
        )}
      </div>
    );
  };

  const renderColorLinks = (message) => {
    const colorLinks = message.content.match(
      /https:\/\/www\.benjaminmoore\.com\/en-us\/paint-colors\/color\/[A-Z0-9-]+/g
    );
    if (!colorLinks) return null;

    // Extract color names and descriptions
    const colorMatches = message.content.match(
      /Color: ([^(]+)\(([A-Z0-9-]+)\) - ([^\n]+)/g
    );
    const colorDetails = colorMatches
      ? colorMatches.map((match) => {
          const [_, name, code, desc] = match.match(
            /Color: ([^(]+)\(([A-Z0-9-]+)\) - ([^\n]+)/
          );
          return { name: name.trim(), code, desc: desc.trim() };
        })
      : [];

    return (
      <div className="color-links-section">
        <h4>Direct Links to Colors</h4>
        <div className="color-links-list">
          {colorLinks.map((link, index) => {
            const code = link.split("/").pop();
            const hex = colors[code] || "#FFFFFF";
            const textColor = getTextColor(hex);
            const colorDetail = colorDetails[index] || {
              name: "Color",
              desc: "",
            };

            return (
              <div
                key={link}
                className="color-link-item"
                style={{
                  backgroundColor: hex,
                  color: textColor,
                }}
              >
                <div className="color-link-content">
                  <span
                    className="color-link-name"
                    style={{ color: textColor }}
                  >
                    {colorDetail.name}
                  </span>
                  <span
                    className="color-link-code"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      color: "#2D3142",
                    }}
                  >
                    {code}
                  </span>
                </div>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="color-link-button"
                >
                  View on Benjamin Moore
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add this function to clean the message content
  const cleanMessageContent = (content) => {
    if (!content) return "";

    // Remove the "Direct Links to Colors" section and URLs
    return content
      .replace(/To view these colors on Benjamin Moore's website:[\s\S]*$/, "")
      .replace(
        /https:\/\/www\.benjaminmoore\.com\/en-us\/paint-colors\/color\/[A-Z0-9-]+/g,
        ""
      )
      .trim();
  };

  const searchColorByName = async (name) => {
    try {
      if (!name || typeof name !== "string" || name.trim() === "") {
        console.log("Invalid search query");
        return [];
      }

      console.log("Searching for colors with query:", name);

      // Fetch directly from Benjamin Moore API
      const response = await fetch("http://localhost:5001/api/search-colors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.message || "Failed to fetch colors from API");
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (!data.colors || !Array.isArray(data.colors)) {
        console.error("Invalid API response format:", data);
        return [];
      }

      const mappedColors = await Promise.all(
        data.colors
          .filter((color) => color && typeof color === "object")
          .map(async (color) => {
            console.log("Processing color:", color);
            const colorCode = color.color_number || color.code || "";
            let hex = color.color_hex
              ? `#${color.color_hex}`
              : color.hex || "#FFFFFF";

            // If we don't have a hex value, try to get it from our database
            if (hex === "#FFFFFF" && colorCode) {
              hex = await getColorHex(colorCode);
            }

            return {
              name: color.color_name || color.name || "",
              code: colorCode,
              hex: hex,
              description: color.description || "",
              family: color.family || "Unknown",
              collection: color.collection || "Classic",
              undertone: color.undertone || "Neutral",
              lrv: color.lrv || "50",
              suggestedRooms: Array.isArray(color.suggestedRooms)
                ? color.suggestedRooms
                : ["Living Room"],
              style: color.style || "Classic",
            };
          })
      );

      console.log("Mapped colors:", mappedColors);
      return mappedColors.filter((color) => color.name && color.code);
    } catch (err) {
      console.error("Error in searchColorByName:", err);
      return [];
    }
  };

  // Update the getColorHex function to properly handle color codes
  const getColorHex = async (colorCode) => {
    try {
      if (!colorCode || typeof colorCode !== "string") {
        console.log("Invalid color code:", colorCode);
        return "#FFFFFF";
      }

      // First check if we have it in our local state
      if (colors[colorCode]) {
        console.log(`Found ${colorCode} in state:`, colors[colorCode]);
        return colors[colorCode];
      }

      console.log(`Fetching ${colorCode} from database...`);

      // If not in state, try to get from our database
      const response = await fetch(
        `http://localhost:5001/api/colors/${colorCode}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch color ${colorCode} from database`);
      }

      const data = await response.json();
      console.log(`Received data for ${colorCode}:`, data);

      if (data.success && data.data && data.data.hex) {
        // Ensure hex code starts with #
        const hexCode = data.data.hex.startsWith("#")
          ? data.data.hex
          : `#${data.data.hex}`;

        // Update our local state with the new color
        setColors((prev) => ({
          ...prev,
          [colorCode]: hexCode,
        }));

        console.log(`Updated state with ${colorCode}:`, hexCode);
        return hexCode;
      }

      console.log(`No hex code found for ${colorCode}`);
      return "#FFFFFF";
    } catch (err) {
      console.error(`Error getting color ${colorCode}:`, err);
      return "#FFFFFF";
    }
  };

  // Helper functions for enhanced color descriptions
  const getStyleTips = (color) => {
    const styles = {
      Modern:
        "Perfect for contemporary spaces with clean lines and minimal decor",
      Traditional:
        "Ideal for classic interiors with rich textures and detailed furnishings",
      Transitional:
        "Works well in spaces that blend traditional and modern elements",
      Coastal: "Great for creating a light, airy beach-inspired atmosphere",
      Farmhouse: "Perfect for rustic, warm, and inviting spaces",
      Industrial:
        "Ideal for urban lofts and spaces with exposed architectural elements",
    };
    return styles[color.style] || "Versatile enough for various design styles";
  };

  const getLightingTips = (color) => {
    const tips = {
      Warm: "Best in north-facing rooms, creates cozy atmosphere in evening light",
      Cool: "Ideal for south-facing rooms, maintains freshness in bright light",
      Neutral: "Adapts well to any lighting condition, very versatile",
    };
    return (
      tips[color.undertone] ||
      "Consider testing in your specific lighting conditions"
    );
  };

  const getMoodDescription = (color) => {
    const moods = {
      Warm: "Inviting and cozy, promotes conversation and relaxation",
      Cool: "Calming and serene, creates a peaceful atmosphere",
      Neutral: "Balanced and harmonious, provides a perfect backdrop",
    };
    return (
      moods[color.undertone] || "Creates a balanced and harmonious atmosphere"
    );
  };

  const getColorPairings = (color) => {
    const pairings = {
      Warm: "Try pairing with soft grays, warm whites, or deep navy for contrast",
      Cool: "Complements warm woods, creamy whites, and soft beiges beautifully",
      Neutral: "Works well with both warm and cool tones, very versatile",
    };
    return pairings[color.undertone] || "Pairs well with a variety of colors";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading color database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>No Colors Available</h3>
        <p>{error}</p>
        <button
          onClick={() => {
            setRetryCount(0);
            setError(null);
          }}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="consultant-container" style={{ backgroundColor }}>
      <div className="chat-header">
        <h2>Chat with AI</h2>
        <p>Your AI Color Consultant</p>
        {backgroundColor !== "#FFFFFF" && (
          <button className="reset-background" onClick={handleResetBackground}>
            Reset Background
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to ColorSense AI!</h2>
            <p>
              I'm AI, your personal color consultant. How can I help you today?
            </p>
            <div className="suggestion-buttons">
              <button
                onClick={() =>
                  handleWelcomeSuggestion(
                    "What are some good colors for a living room?"
                  )
                }
                className="suggestion-button"
              >
                <FaHome className="button-icon" />
                Living Room Colors
              </button>
              <button
                onClick={() =>
                  handleWelcomeSuggestion(
                    "What are some good colors for a bedroom?"
                  )
                }
                className="suggestion-button"
              >
                <FaBed className="button-icon" />
                Bedroom Colors
              </button>
              <button
                onClick={() =>
                  handleWelcomeSuggestion(
                    "What are the trending colors this year?"
                  )
                }
                className="suggestion-button"
              >
                <FaChartLine className="button-icon" />
                Trending Colors
              </button>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${
              message.role === "user" ? "user" : "assistant"
            }`}
          >
            {message.role === "assistant" &&
            message.allColors &&
            Array.isArray(message.allColors) ? (
              <div className="betty-recommendations">
                {message.allColors.map((color, colorIndex) => {
                  if (!color || typeof color !== "object") return null;

                  const colorName = color.name || "";
                  const colorCode = color.code || "";
                  const colorHex = color.hex || "#FFFFFF";
                  const colorDesc = color.description || "";

                  console.log("Rendering color:", {
                    colorName,
                    colorCode,
                    colorHex,
                  });

                  return (
                    <div key={colorIndex} className="betty-recommendation">
                      <div
                        className="color-swatch"
                        style={{
                          backgroundColor: colorHex,
                          border: "1px solid #ccc",
                        }}
                        onClick={() => handleColorClick(colorHex)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleColorClick(colorHex);
                          }
                        }}
                      />
                      <div className="color-info">
                        <div className="color-header">
                          <strong>{colorName}</strong>
                          {colorCode && (
                            <a
                              href={getBenjaminMooreUrl(colorCode)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bm-link"
                            >
                              View on Benjamin Moore
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </div>
                        {colorCode && (
                          <div className="color-codes">
                            <span
                              className="color-code"
                              style={{
                                backgroundColor: colorHex,
                                color: getTextColor(colorHex),
                                padding: "4px 8px",
                                borderRadius: "4px",
                                display: "inline-block",
                                marginTop: "4px",
                                marginRight: "8px",
                              }}
                              onClick={() => handleColorClick(colorHex)}
                              role="button"
                              tabIndex={0}
                              onKeyPress={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleColorClick(colorHex);
                                }
                              }}
                            >
                              {colorCode}
                            </span>
                            <span
                              className="hex-code"
                              style={{
                                backgroundColor: colorHex,
                                color: getTextColor(colorHex),
                                padding: "4px 8px",
                                borderRadius: "4px",
                                display: "inline-block",
                                marginTop: "4px",
                                fontFamily: "monospace",
                              }}
                              onClick={() => handleColorClick(colorHex)}
                              role="button"
                              tabIndex={0}
                              onKeyPress={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  handleColorClick(colorHex);
                                }
                              }}
                            >
                              {colorHex}
                            </span>
                          </div>
                        )}
                        <div className="color-desc">{colorDesc}</div>
                      </div>
                    </div>
                  );
                })}
                {message.suggestions &&
                  Array.isArray(message.suggestions) &&
                  message.suggestions.length > 0 && (
                    <div className="suggestions">
                      <h4>Suggestions:</h4>
                      <ul>
                        {message.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            ) : (
              <div className="message-content">
                {cleanMessageContent(message.content)}
                {message.role === "assistant" && renderColorLinks(message)}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about colors..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ColorConsultant;
