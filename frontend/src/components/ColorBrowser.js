import React, { useState, useEffect, useCallback, useRef } from "react";
import "./ColorBrowser.css";
import axios from "axios";
import {
  FaExchangeAlt,
  FaSearch,
  FaInfoCircle,
  FaTrash,
  FaCopy,
  FaCheck,
} from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL;
const BENJAMIN_MOORE_BASE_URL = process.env.REACT_APP_BENJAMIN_MOORE_URL;

const ColorBrowser = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState(null);
  const [compareColors, setCompareColors] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [copiedColor, setCopiedColor] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const [displayedColors, setDisplayedColors] = useState([]);
  const [colorTips, setColorTips] = useState({});
  const [loadingTips, setLoadingTips] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const observer = useRef();
  const lastColorElementRef = useCallback(
    (node) => {
      if (isLoadingMore || isTransitioning) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, isTransitioning]
  );

  const toggleCompare = (color) => {
    setCompareColors((prev) => {
      const isComparing = prev.some((comp) => comp.code === color.code);
      if (isComparing) {
        return prev.filter((comp) => comp.code !== color.code);
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 colors at a time");
          return prev;
        }
        return [...prev, color];
      }
    });
  };

  const handleColorClick = async (color) => {
    if (selectedColor === color.code) {
      setSelectedColor(null);
    } else {
      setSelectedColor(color.code);
      if (!colorTips[color.code]) {
        setLoadingTips((prev) => ({ ...prev, [color.code]: true }));
        try {
          const response = await axios.post(`${API_URL}/api/colorsense`, {
            message: `Generate 3 specific tips for using ${color.name} (${color.code}) in interior design. For each tip, include:
1. A specific room or space where this color works well
2. Complementary colors that pair with this color
3. Practical application advice
Make the tips Shorter, and more concise.
Format each tip as a simple sentence without any special characters, bullet points, or markdown formatting.`,
          });

          if (!response.data.success) {
            throw new Error("Failed to fetch color tips");
          }

          setColorTips((prev) => ({
            ...prev,
            [color.code]: response.data.textOutput
              .split("\n")
              .filter((tip) => tip.trim())
              .slice(0, 3),
          }));
        } catch (error) {
          console.error(`Error loading tips for ${color.code}:`, error);
          setColorTips((prev) => ({
            ...prev,
            [color.code]: ["Failed to load tips. Please try again."],
          }));
        } finally {
          setLoadingTips((prev) => ({ ...prev, [color.code]: false }));
        }
      }
    }
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setError(null);
      setLoading(true);
      setPage(1);
      setHasMore(true);
      fetchColors(1, false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setError(null);
        const response = await axios.get(`${API_URL}/api/colors`, {
          params: { query: value },
        });

        if (response.data.success) {
          const colors = response.data.colors || [];
          setDisplayedColors(colors);
        } else {
          throw new Error(response.data.message || "Failed to search colors");
        }
      } catch (err) {
        console.error("Search error:", err);
        let errorMessage = "Failed to search colors";

        if (err.response) {
          errorMessage =
            err.response.data.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage =
            "No response from server. Please check your connection.";
        } else {
          errorMessage = `Error: ${err.message}`;
        }

        setError(errorMessage);
        setDisplayedColors([]);
      } finally {
        setIsSearching(false);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    }, 500);
  };

  const fetchColors = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
          setIsTransitioning(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const response = await axios.get(`${API_URL}/api/colors`, {
          params: {
            query: searchQuery,
            page: pageNum,
            per_page: 12,
          },
        });

        if (response.data?.success) {
          const newColors = response.data.colors || [];
          setHasMore(newColors.length === 12);
          setDisplayedColors((prev) =>
            append ? [...prev, ...newColors] : newColors
          );
        } else {
          setError(response.data?.message || "Failed to fetch colors");
          if (pageNum === 1) {
            setDisplayedColors([]);
          }
        }
      } catch (error) {
        console.error("Error fetching colors:", error);
        let errorMessage = "Failed to fetch colors";

        if (error.response) {
          errorMessage =
            error.response.data.message ||
            `Server error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage =
            "No response from server. Please check if the backend server is running.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }

        setError(errorMessage);
        if (pageNum === 1) {
          setDisplayedColors([]);
        }
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        if (pageNum === 1) {
          setTimeout(() => {
            setIsTransitioning(false);
          }, 300);
        }
      }
    },
    [searchQuery]
  );

  // Reset page and fetch new colors when search changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchColors(1, false);
  }, [searchQuery, fetchColors]);

  // Load more colors when page changes
  useEffect(() => {
    if (page > 1) {
      fetchColors(page, true);
    }
  }, [page, fetchColors]);

  const copyColorCode = (color) => {
    navigator.clipboard.writeText(color.code);
    setCopiedColor(color.code);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  if (loading && !isSearching && !searchQuery) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading colors...</p>
      </div>
    );
  }

  if (error && !searchQuery) {
    return (
      <div className="error-container">
        <h3>Error Loading Colors</h3>
        <p>{error}</p>
        <button
          onClick={() => {
            setError(null);
            setSearchQuery("");
            fetchColors();
          }}
          className="go-back-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="color-browser">
      <div className="color-browser-header">
        <div className="search-section">
          <div className="search-form">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Search colors..."
                className={isSearching ? "searching" : ""}
                autoFocus
              />
              {isSearching && searchQuery.trim() && (
                <div className="search-loading">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            {error && <div className="search-error">{error}</div>}
          </div>
        </div>

        <div className="action-buttons">
          <button
            className={`action-button ${showComparison ? "active" : ""}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            <FaExchangeAlt /> Compare Colors ({compareColors.length}/3)
          </button>
        </div>
      </div>

      {showComparison && compareColors.length > 0 && (
        <div className="comparison-panel">
          <h3>Color Comparison</h3>
          <div className="comparison-grid">
            {compareColors.map((color) => (
              <div key={color.code} className="comparison-card">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="color-info">
                  <h4>{color.name}</h4>
                  <div className="color-code-section">
                    <span className="color-code">
                      <a
                        href={`${BENJAMIN_MOORE_BASE_URL}/${color.code.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="color-code"
                        title="View on Benjamin Moore website"
                        style={{
                          color:
                            selectedColor === color.code
                              ? getTextColor(color.hex)
                              : "#666",
                        }}
                      >
                        {color.code}
                      </a>
                    </span>
                    <button
                      className="copy-button"
                      onClick={() => copyColorCode(color)}
                    >
                      {copiedColor === color.code ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                  <div className="comparison-actions">
                    <button
                      className="remove-compare"
                      onClick={() => toggleCompare(color)}
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedColors.length > 0 && (
        <div className={`color-grid ${isTransitioning ? "transitioning" : ""}`}>
          {displayedColors.map((color, index) => (
            <div
              key={color.code}
              ref={
                index === displayedColors.length - 1
                  ? lastColorElementRef
                  : null
              }
              className={`color-card ${
                selectedColor === color.code ? "expanded" : ""
              }`}
              style={{
                backgroundColor:
                  selectedColor === color.code ? color.hex : "white",
                color:
                  selectedColor === color.code
                    ? getTextColor(color.hex)
                    : "inherit",
              }}
            >
              <div className="color-actions">
                <button
                  className={`compare-button ${
                    compareColors.some((comp) => comp.code === color.code)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => toggleCompare(color)}
                  title="Compare colors"
                  style={{
                    color: compareColors.some(
                      (comp) => comp.code === color.code
                    )
                      ? "#dc3545"
                      : selectedColor === color.code
                      ? getTextColor(color.hex)
                      : "#666",
                  }}
                >
                  <FaExchangeAlt />
                </button>
                <button
                  className="info-button"
                  onClick={() => handleColorClick(color)}
                  title="View color details"
                  style={{
                    color:
                      selectedColor === color.code
                        ? getTextColor(color.hex)
                        : "#666",
                  }}
                >
                  <FaInfoCircle />
                </button>
              </div>
              <div
                className="color-swatch"
                style={{ backgroundColor: color.hex }}
                onClick={() => handleColorClick(color)}
              />
              <div className="color-info">
                <h3
                  style={{
                    color:
                      selectedColor === color.code
                        ? getTextColor(color.hex)
                        : "inherit",
                  }}
                >
                  {color.name}
                </h3>
                <div className="color-code-section">
                  <a
                    href={`${BENJAMIN_MOORE_BASE_URL}/${color.code.toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="color-code"
                    title="View on Benjamin Moore website"
                    style={{
                      color:
                        selectedColor === color.code
                          ? getTextColor(color.hex)
                          : "#666",
                    }}
                  >
                    {color.code}
                  </a>
                  <button
                    className="copy-button"
                    onClick={() => copyColorCode(color)}
                    title="Copy color code"
                    style={{
                      color:
                        selectedColor === color.code
                          ? getTextColor(color.hex)
                          : "#666",
                    }}
                  >
                    {copiedColor === color.code ? <FaCheck /> : <FaCopy />}
                  </button>
                </div>

                {selectedColor === color.code && (
                  <div
                    className="color-tips"
                    style={{
                      color: getTextColor(color.hex),
                    }}
                  >
                    {loadingTips[color.code] ? (
                      <div
                        className="tips-loading"
                        style={{
                          color: getTextColor(color.hex),
                        }}
                      >
                        <div className="loading-spinner"></div>
                        <p>Loading tips...</p>
                      </div>
                    ) : colorTips[color.code] ? (
                      colorTips[color.code].map((tip, index) => (
                        <p
                          key={index}
                          className="tip"
                          style={{
                            color: getTextColor(color.hex),
                          }}
                        >
                          {tip}
                        </p>
                      ))
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoadingMore && (
        <div className="loading-more">
          <div className="loading-spinner"></div>
          <p>Loading more colors...</p>
        </div>
      )}

      {displayedColors.length === 0 && !loading && searchQuery && (
        <div className="no-results">
          <p>No colors found matching "{searchQuery}".</p>
          <div className="search-suggestion">
            <p>
              Try removing some words or using different terms. For example:
            </p>
            <ul>
              <li>Instead of "deep ocean blue", try "ocean" or "blue"</li>
              <li>Instead of "warm kitchen yellow", try "warm" or "yellow"</li>
              <li>
                Instead of "modern living room gray", try "gray" or "modern"
              </li>
            </ul>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              fetchColors();
            }}
            className="go-back-button"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
};

const getTextColor = (hexColor) => {
  // Remove the # if present
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance using the formula from WCAG 2.0
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Using a more conservative threshold of 0.6 for better contrast
  // This will make more colors use white text, ensuring better readability
  return luminance > 0.6 ? "#000000" : "#FFFFFF";
};

export default ColorBrowser;
