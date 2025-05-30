import React, { useState, useRef, useEffect, useCallback } from "react";
import "./ColorConsultant.css";
import {
  FaHome,
  FaBed,
  FaChartLine,
  FaMicrophone,
  FaMicrophoneSlash,
} from "react-icons/fa";

const ColorConsultant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL;
  const BENJAMIN_MOORE_BASE_URL = process.env.REACT_APP_BENJAMIN_MOORE_URL;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback(
    async (e, voiceInput = null) => {
      e.preventDefault();
      const userMessage = voiceInput || input.trim();
      if (!userMessage) return;

      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setIsLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/colorsense`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to get response");
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.textOutput },
        ]);
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I'm sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, API_URL]
  );

  useEffect(() => {
    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSubmit(new Event("submit"), transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handleSubmit]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
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

  const renderMessageContent = (content) => {
    // Split content by color blocks
    const parts = content.split(/(━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━)/);

    return parts.map((part, index) => {
      // Check if this part contains a hex code
      const hexMatch = part.match(/#[0-9A-Fa-f]{6}/);
      if (hexMatch) {
        const hexColor = hexMatch[0];
        // Extract color name and code
        const nameMatch = part.match(/🎨\s*([^(]+)\s*\(([^)]+)\)/);
        const colorName = nameMatch ? nameMatch[1].trim() : "";
        const colorCode = nameMatch ? nameMatch[2].trim() : "";

        // Construct Benjamin Moore URL
        const bmUrl = `${BENJAMIN_MOORE_BASE_URL}/${colorCode}`;

        return (
          <div key={index} className="color-block">
            <div className="color-left">
              <div
                className="color-preview"
                style={{ backgroundColor: hexColor }}
                onClick={() => handleColorClick(hexColor)}
              />
            </div>
            <div className="color-right">
              <div className="color-info">
                <div className="color-name">{colorName}</div>
                <div className="color-code">{colorCode}</div>
                <a
                  href={bmUrl}
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
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        );
      }
      // Only render non-empty text that's not just decorative lines
      if (part.trim() && !part.includes("━━")) {
        return (
          <div key={index} className="message-text">
            {part.trim()}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="consultant-container" style={{ backgroundColor }}>
      <div className="chat-header">
        <div className="header-content">
          <div className="header-text">
            <h2>Chat with Betty</h2>
            <p>Your AI Color Consultant</p>
          </div>
          <div className="voice-controls">
            <button
              type="button"
              className={`voice-button ${isListening ? "listening" : ""}`}
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>
          </div>
        </div>
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
          <div key={index} className={`message ${message.role}`}>
            <div className="message-content">
              {renderMessageContent(message.content)}
            </div>
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
