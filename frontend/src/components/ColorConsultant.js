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
  const MAX_RETRIES = 3; // eslint-disable-line no-unused-vars

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
        // Create a message with the color details and interactive elements
        const colorMessage = {
          role: "assistant",
          content: `I found these colors that match your search:\n\n${searchResults
            .map(
              (color) =>
                `Color: ${color.name} (${color.code}) - ${color.description}`
            )
            .join("\n")}`,
          allColors: searchResults,
          suggestions: [
            "Would you like to see how these colors look in different rooms?",
            "Would you like to see complementary colors?",
            "Would you like to see these colors in different lighting conditions?",
            "Would you like to see application tips for these colors?",
          ],
        };
        setMessages((prev) => [...prev, colorMessage]);
      } else {
        // If no colors found, try the normal query
        const response = await fetch("http://localhost:5001/api/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            conversationHistory: messages,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get response");
        }

        // Parse Betty's response for color and suggestions
        const parsed = await parseBettyResponse(data.response);

        // Generate dynamic suggestions based on the color being discussed
        const generateSuggestions = (colorData) => {
          if (!colorData || !colorData.name) return [];

          // Get current season and time of day for contextual suggestions
          const getSeason = () => {
            const month = new Date().getMonth();
            if (month >= 2 && month <= 4) return "spring";
            if (month >= 5 && month <= 7) return "summer";
            if (month >= 8 && month <= 10) return "fall";
            return "winter";
          };

          const getTimeOfDay = () => {
            const hour = new Date().getHours();
            if (hour >= 5 && hour < 12) return "morning";
            if (hour >= 12 && hour < 17) return "afternoon";
            if (hour >= 17 && hour < 21) return "evening";
            return "night";
          };

          const currentSeason = getSeason();
          const timeOfDay = getTimeOfDay();
          const isDarkColor = colorData.lrv && parseInt(colorData.lrv) < 50;
          const isWarmUndertone = colorData.undertone
            ?.toLowerCase()
            .includes("warm");
          const isCoolUndertone = colorData.undertone
            ?.toLowerCase()
            .includes("cool");
          const isNeutralUndertone = colorData.undertone
            ?.toLowerCase()
            .includes("neutral");

          // Generate contextual suggestions based on time and season
          const getContextualSuggestions = () => {
            const suggestions = [];

            // Time of day specific suggestions
            if (timeOfDay === "morning") {
              suggestions.push(
                `What's the best way to use ${colorData.name} in morning light?`,
                `How can I make ${colorData.name} work well in a morning space?`
              );
            } else if (timeOfDay === "evening") {
              suggestions.push(
                `What's the best way to use ${colorData.name} in evening light?`,
                `How can I make ${colorData.name} work well in an evening space?`
              );
            }

            // Seasonal specific suggestions
            if (currentSeason === "summer") {
              suggestions.push(
                `What's the best way to use ${colorData.name} in summer?`,
                `How can I make ${colorData.name} work well in a summer space?`
              );
            } else if (currentSeason === "winter") {
              suggestions.push(
                `What's the best way to use ${colorData.name} in winter?`,
                `How can I make ${colorData.name} work well in a winter space?`
              );
            }

            return suggestions;
          };

          const baseSuggestions = [
            // Design-focused suggestions
            `What's the best way to use ${colorData.name} in a small space?`,
            `How can I create a focal point with ${colorData.name}?`,
            `What's the ideal lighting setup for ${colorData.name}?`,
            `How can I make ${colorData.name} feel more cozy?`,
            `What's the best way to make ${colorData.name} feel more spacious?`,

            // Color combination suggestions
            `What colors create a dramatic look with ${colorData.name}?`,
            `What colors create a calming atmosphere with ${colorData.name}?`,
            `What colors create an energetic space with ${colorData.name}?`,
            `What colors create a sophisticated look with ${colorData.name}?`,

            // Application suggestions
            `What's the best way to transition ${colorData.name} between rooms?`,
            `How can I use ${colorData.name} as an accent color?`,
            `What's the best way to use ${colorData.name} on different surfaces?`,
            `How can I create depth with ${colorData.name}?`,

            // Style-specific suggestions
            `How can I use ${colorData.name} in a minimalist design?`,
            `How can I use ${colorData.name} in a traditional setting?`,
            `How can I use ${colorData.name} in a contemporary space?`,
            `How can I use ${colorData.name} in a transitional design?`,

            // Mood-based suggestions
            `How can I create a relaxing atmosphere with ${colorData.name}?`,
            `How can I make ${colorData.name} feel more inviting?`,
            `How can I create a productive environment with ${colorData.name}?`,
            `How can I make ${colorData.name} feel more luxurious?`,

            // Texture and material suggestions
            `What textures work well with ${colorData.name}?`,
            `What materials complement ${colorData.name}?`,
            `How can I add dimension to ${colorData.name}?`,
            `What finishes work best with ${colorData.name}?`,
          ];

          // Add contextual suggestions
          baseSuggestions.push(...getContextualSuggestions());

          // Add room-specific suggestions with more context
          if (colorData.suggestedRooms && colorData.suggestedRooms.length > 0) {
            colorData.suggestedRooms.forEach((room) => {
              baseSuggestions.push(
                `What's the best way to use ${
                  colorData.name
                } in a ${room.toLowerCase()}?`,
                `How can I make ${
                  colorData.name
                } work in a small ${room.toLowerCase()}?`,
                `What colors complement ${
                  colorData.name
                } in a ${room.toLowerCase()}?`,
                `How can I create a focal point with ${
                  colorData.name
                } in a ${room.toLowerCase()}?`,
                `What's the best lighting for ${
                  colorData.name
                } in a ${room.toLowerCase()}?`,
                `How can I make ${
                  colorData.name
                } feel more spacious in a ${room.toLowerCase()}?`,
                `What furniture styles work best with ${
                  colorData.name
                } in a ${room.toLowerCase()}?`,
                `How can I accessorize with ${
                  colorData.name
                } in a ${room.toLowerCase()}?`
              );
            });
          }

          // Add undertone-specific suggestions
          if (colorData.undertone) {
            baseSuggestions.push(
              `How can I enhance the ${colorData.undertone.toLowerCase()} undertone of ${
                colorData.name
              }?`,
              `What colors bring out the ${colorData.undertone.toLowerCase()} in ${
                colorData.name
              }?`,
              `How can I balance the ${colorData.undertone.toLowerCase()} undertone of ${
                colorData.name
              }?`,
              isWarmUndertone
                ? `How can I make ${colorData.name} feel more inviting?`
                : isCoolUndertone
                ? `How can I make ${colorData.name} feel more refreshing?`
                : isNeutralUndertone
                ? `How can I make ${colorData.name} feel more balanced?`
                : `How can I make ${colorData.name} feel more harmonious?`
            );
          }

          // Add LRV-specific suggestions
          if (colorData.lrv) {
            if (isDarkColor) {
              baseSuggestions.push(
                `How can I make ${colorData.name} feel lighter?`,
                `What's the best way to use ${colorData.name} in a dark room?`,
                `How can I prevent ${colorData.name} from feeling too heavy?`,
                `What lighting works best with ${colorData.name}?`,
                `How can I create contrast with ${colorData.name}?`,
                `What light colors complement ${colorData.name}?`
              );
            } else {
              baseSuggestions.push(
                `How can I make ${colorData.name} feel more grounded?`,
                `What's the best way to use ${colorData.name} in a bright room?`,
                `How can I add depth to ${colorData.name}?`,
                `What colors create contrast with ${colorData.name}?`,
                `How can I make ${colorData.name} feel more substantial?`,
                `What dark colors complement ${colorData.name}?`
              );
            }
          }

          // Add collection-specific suggestions
          if (colorData.collection) {
            baseSuggestions.push(
              `How can I use ${colorData.name} with other colors from the ${colorData.collection} collection?`,
              `What's the best way to showcase ${colorData.name} from the ${colorData.collection} collection?`,
              `How can I create a cohesive look with ${colorData.name} and the ${colorData.collection} collection?`,
              `What's the inspiration behind ${colorData.name} in the ${colorData.collection} collection?`,
              `How can I build a color story around ${colorData.name} from the ${colorData.collection} collection?`,
              `What other colors from the ${colorData.collection} collection create a harmonious palette with ${colorData.name}?`
            );
          }

          // Add style-specific suggestions
          if (colorData.style) {
            baseSuggestions.push(
              `How can I use ${
                colorData.name
              } in a ${colorData.style.toLowerCase()} style?`,
              `What furniture styles complement ${
                colorData.name
              } in a ${colorData.style.toLowerCase()} design?`,
              `How can I accessorize with ${
                colorData.name
              } in a ${colorData.style.toLowerCase()} space?`,
              `What patterns work well with ${
                colorData.name
              } in a ${colorData.style.toLowerCase()} setting?`,
              `How can I create a ${colorData.style.toLowerCase()} mood with ${
                colorData.name
              }?`,
              `What architectural elements work best with ${
                colorData.name
              } in a ${colorData.style.toLowerCase()} design?`
            );
          }

          // Shuffle and return top 5 suggestions
          return baseSuggestions.sort(() => Math.random() - 0.5).slice(0, 5);
        };

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            ...parsed,
            suggestions: generateSuggestions(parsed.allColors?.[0]),
            interactive: true,
          },
        ]);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble processing your request. Please try again.",
          suggestions: [
            "Try rephrasing your question",
            "Try being more specific about your needs",
            "Try asking about a specific room or style",
          ],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse Betty's response for color and suggestions
  const parseBettyResponse = async (message) => {
    const lines = message.split("\n");
    const parsedColors = [];
    let suggestions = [];

    // Find all color sections (between the decorative lines)
    const colorSections = message.split(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );

    for (const section of colorSections) {
      if (!section.trim()) continue;

      // Extract color name and code
      const nameMatch = section.match(/🎨 ([^(]+)\(([^)]+)\)/);
      if (!nameMatch) continue;

      const colorName = nameMatch[1].trim();
      const colorCode = nameMatch[2].trim();

      console.log(`Processing color: ${colorName} (${colorCode})`);

      // Try to get hex code from multiple sources
      let hex = null;

      // 1. Try to get from the message
      const hexMatch = section.match(/Hex:\s*(#[A-Fa-f0-9]{6})/i);
      if (hexMatch) {
        hex = hexMatch[1].toUpperCase();
        console.log(`Found hex in message: ${hex}`);
      }

      // 2. Try to get from our local state
      if (!hex && colors[colorCode]) {
        hex = colors[colorCode];
        console.log(`Found hex in state: ${hex}`);
      }

      // 3. Try to get from database
      if (!hex) {
        try {
          console.log(`Fetching hex from database for ${colorCode}...`);
          const response = await fetch(
            `http://localhost:5001/api/colors/${colorCode}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.hex) {
              hex = data.data.hex.startsWith("#")
                ? data.data.hex
                : `#${data.data.hex}`;
              console.log(`Found hex in database: ${hex}`);

              // Update our local state
              setColors((prev) => ({
                ...prev,
                [colorCode]: hex,
              }));
            }
          }
        } catch (error) {
          console.error(`Error fetching hex for ${colorCode}:`, error);
        }
      }

      // If we still don't have a hex, use a default
      if (!hex || hex === "#FFFFFF") {
        console.warn(`No hex code found for ${colorCode}, using default`);
        hex = "#FFFFFF";
      }

      // Extract description
      const descMatch = section.match(/Description:\s*-\s*([^\n]+)/);
      const description = descMatch ? descMatch[1].trim() : "";

      // Extract family
      const familyMatch = section.match(/Family:\s*([^\n]+)/);
      const family = familyMatch ? familyMatch[1].trim() : "Unknown";

      // Extract collection
      const collectionMatch = section.match(/Collection:\s*([^\n]+)/);
      const collection = collectionMatch
        ? collectionMatch[1].trim()
        : "Classic";

      // Extract undertone
      const undertoneMatch = section.match(/Undertone:\s*([^\n]+)/);
      const undertone = undertoneMatch ? undertoneMatch[1].trim() : "Neutral";

      // Extract LRV
      const lrvMatch = section.match(/LRV:\s*([^\n]+)/);
      const lrv = lrvMatch ? lrvMatch[1].trim() : "50";

      // Extract suggested rooms
      const roomsMatch = section.match(/Perfect for:\s*((?:[^\n]+\n?)+)/);
      const suggestedRooms = roomsMatch
        ? roomsMatch[1]
            .split("\n")
            .map((line) => line.replace(/^-\s*/, "").trim())
            .filter(Boolean)
        : ["Living Room"];

      // Extract style
      const styleMatch = section.match(/Style:\s*([^\n]+)/);
      const style = styleMatch ? styleMatch[1].trim() : "Classic";

      const colorData = {
        name: colorName,
        code: colorCode,
        hex: hex,
        description: description,
        family: family,
        collection: collection,
        undertone: undertone,
        lrv: lrv,
        suggestedRooms: suggestedRooms,
        style: style,
      };

      console.log(`Final color data for ${colorCode}:`, colorData);
      parsedColors.push(colorData);
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
      const response = {
        content: message,
        colorName: parsedColors[0].name,
        colorHex: parsedColors[0].hex,
        colorDesc: parsedColors[0].description,
        colorCode: parsedColors[0].code,
        suggestions,
        allColors: parsedColors,
      };
      console.log("Final response:", response);
      return response;
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

  const renderColorSwatches = (message) => { // eslint-disable-line no-unused-vars
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
                  <div className="color-details">
                    <span className="color-family">{color.family}</span>
                    <span className="color-collection">{color.collection}</span>
                    <span className="color-undertone">{color.undertone}</span>
                    <span className="color-lrv">LRV: {color.lrv}</span>
                  </div>
                  <div className="color-actions">
                    <button
                      className="view-color-btn"
                      onClick={() => handleColorClick(color.hex)}
                    >
                      Preview Color
                    </button>
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
                </div>
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
          const [_, name, code, desc] = match.match( // eslint-disable-line no-unused-vars
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
        <h2>Chat with Betty</h2>
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
              I'm Betty, your personal color consultant. How can I help you
              today?
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
                            {/* <span
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
                            </span> */}
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
          placeholder="Ask Betty about colors..."
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
