import React, { useState, useEffect, useCallback, useRef } from "react";
import "./ColorBrowser.css";
import axios from "axios";
import {
  FaHeart,
  FaRegHeart,
  FaPalette,
  FaExchangeAlt,
  FaSearch,
  FaFilter,
  FaDownload,
  FaShare,
  FaInfoCircle,
  FaLightbulb,
  FaHome,
  FaBed,
  FaUtensils,
  FaBath,
  FaTrash,
  FaCopy,
  FaCheck,
  FaSync,
} from "react-icons/fa";

const API_URL = "http://localhost:5001/api";

const ColorBrowser = () => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    family: "all",
    collection: "all",
    undertone: "",
    style: "",
    lighting: "",
    room: "",
  });
  const [selectedColor, setSelectedColor] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [compareColors, setCompareColors] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [currentPalette, setCurrentPalette] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [copiedColor, setCopiedColor] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [searchSource, setSearchSource] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [displayedColors, setDisplayedColors] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_LOAD = 120;
  const observerTarget = useRef(null);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem("colorFavorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem("colorFavorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (color) => {
    setFavorites((prev) => {
      const isFavorite = prev.some((fav) => fav.code === color.code);
      if (isFavorite) {
        return prev.filter((fav) => fav.code !== color.code);
      } else {
        return [...prev, color];
      }
    });
  };

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

  const handleColorClick = (color) => {
    console.log("Color clicked:", color);
    setSelectedColor(selectedColor === color.code ? null : color.code);
  };

  const generatePalette = async (color) => {
    console.log("generatePalette called with:", color);
    try {
      setLoading(true);
      setError(null);
      console.log("Making API request for palette...");

      const url = `http://localhost:5001/api/colors/${color.code}/palette`;
      console.log("Request URL:", url);

      const response = await axios.get(url);
      console.log("API Response:", response);

      if (response.data.success) {
        console.log("Setting palette data:", response.data.data);
        setCurrentPalette(response.data.data);
        setShowPalette(true);
        console.log("Palette state updated:", {
          currentPalette: response.data.data,
          showPalette: true,
        });
      } else {
        throw new Error(response.data.message || "Failed to generate palette");
      }
    } catch (err) {
      console.error("Error generating palette:", err);
      setError("Failed to generate color palette. Please try again later.");
      setShowPalette(false);
    } finally {
      setLoading(false);
    }
  };

  const getBenjaminMooreUrl = (colorCode) => {
    // Handle undefined or null color code
    if (!colorCode || typeof colorCode !== "string") {
      return "https://www.benjaminmoore.com/en-us/paint-colors";
    }

    // Convert color code to URL format (e.g., "2121-70" -> "2121-70")
    const formattedCode = colorCode.replace(/\s+/g, "");
    return `https://www.benjaminmoore.com/en-us/paint-colors/color/${formattedCode}`;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getFilteredColors = () => {
    if (!displayedColors || displayedColors.length === 0) return [];

    return displayedColors.filter((color) => {
      if (!color || typeof color !== "object") return false;

      const searchTerm = (filters.search || "").toLowerCase();

      // Basic search matching
      const matchesSearch =
        !searchTerm ||
        (color.name && color.name.toLowerCase().includes(searchTerm)) ||
        (color.code && color.code.toLowerCase().includes(searchTerm)) ||
        (color.family && color.family.toLowerCase().includes(searchTerm)) ||
        (color.collection &&
          color.collection.toLowerCase().includes(searchTerm)) ||
        (color.undertone &&
          color.undertone.toLowerCase().includes(searchTerm)) ||
        (color.description &&
          color.description.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(color.suggestedRooms) &&
          color.suggestedRooms.some(
            (room) => room && room.toLowerCase().includes(searchTerm)
          ));

      // Filter matching
      const matchesFamily =
        filters.family === "all" ||
        !filters.family ||
        (color.family && color.family === filters.family);
      const matchesCollection =
        filters.collection === "all" ||
        !filters.collection ||
        (color.collection && color.collection === filters.collection);
      const matchesUndertone =
        !filters.undertone ||
        (color.undertone && color.undertone === filters.undertone);
      const matchesStyle =
        !filters.style || (color.style && color.style === filters.style);
      const matchesRoom =
        !filters.room ||
        (Array.isArray(color.suggestedRooms) &&
          color.suggestedRooms.includes(filters.room));

      return (
        matchesSearch &&
        matchesFamily &&
        matchesCollection &&
        matchesUndertone &&
        matchesStyle &&
        matchesRoom
      );
    });
  };

  const fetchColors = useCallback(
    async (isLoadMore = false) => {
      try {
        if (!isLoadMore && !searchQuery) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        // Calculate the correct page number for loading more
        const page = isLoadMore ? currentPage + 1 : 1;
        console.log(
          "Fetching colors from:",
          `${API_URL}/colors`,
          "Page:",
          page,
          "Limit:",
          ITEMS_PER_LOAD
        );

        const response = await axios.get(`${API_URL}/colors`, {
          params: {
            limit: ITEMS_PER_LOAD,
            page: page,
            ...(searchQuery && { search: searchQuery }),
          },
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (response.data?.success) {
          console.log("Colors fetched successfully:", response.data);
          const newColors = response.data.data || [];

          if (isLoadMore) {
            // Append new colors to existing ones
            setDisplayedColors((prev) => [...prev, ...newColors]);
            // Update the current page
            setCurrentPage(page);
            console.log(
              "Loaded more colors. New page:",
              page,
              "Total colors:",
              displayedColors.length + newColors.length
            );
          } else {
            // Reset to first page
            setDisplayedColors(newColors);
            setCurrentPage(1);
            console.log("Reset to first page. Total colors:", newColors.length);
          }

          // Check if we have more colors to load
          const hasMoreColors = newColors.length === ITEMS_PER_LOAD;
          setHasMore(hasMoreColors);
          console.log("Has more colors to load:", hasMoreColors);
        } else {
          console.error("Failed to fetch colors:", response.data?.message);
          setError(response.data?.message || "Failed to fetch colors");
          if (!isLoadMore) {
            setDisplayedColors([]);
          }
        }
      } catch (error) {
        console.error("Error fetching colors:", error);
        let errorMessage = "Failed to fetch colors";

        if (error.response) {
          console.error("Server response error:", error.response.data);
          errorMessage =
            error.response.data.message ||
            `Server error: ${error.response.status}`;
        } else if (error.request) {
          console.error("No response received:", error.request);
          errorMessage =
            "No response from server. Please check if the backend server is running.";
        } else {
          console.error("Request setup error:", error.message);
          errorMessage = `Error: ${error.message}`;
        }

        setError(errorMessage);
        if (!isLoadMore) {
          setDisplayedColors([]);
        }
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [currentPage, displayedColors.length, searchQuery]
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    };

    const handleIntersect = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        console.log(
          "Intersection detected. Current page:",
          currentPage,
          "Loading more..."
        );
        fetchColors(true);
      }
    };

    const observer = new IntersectionObserver(handleIntersect, options);

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, fetchColors, currentPage]);

  // Reset displayed colors when filters or search changes
  useEffect(() => {
    console.log("Filters or search changed. Resetting pagination...");
    setDisplayedColors([]);
    setHasMore(true);
    setCurrentPage(1);
    fetchColors();
  }, [filters, searchQuery]);

  // Get filtered colors
  const filteredColors = getFilteredColors();

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setFilters((prev) => ({
      ...prev,
      search: value,
    }));

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't show loading state for empty search
    if (!value.trim()) {
      fetchColors();
      setSearchSource(null);
      return;
    }

    // Set a new timeout to debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        setError(null);
        console.log("Searching for:", value);

        // Use the main colors endpoint with search query
        const response = await axios.get(`${API_URL}/colors`, {
          params: {
            search: value,
            limit: ITEMS_PER_LOAD,
            page: 1,
          },
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (response.data.success) {
          setDisplayedColors(response.data.data || []);
          setCurrentPage(1);
          setHasMore(response.data.data.length === ITEMS_PER_LOAD);
          setSearchSource("database");
        } else {
          throw new Error(response.data.message || "Failed to search colors");
        }
      } catch (err) {
        console.error("Search error:", err);
        let errorMessage = "Failed to search colors";

        if (err.response) {
          console.error("Server response error:", err.response.data);
          errorMessage =
            err.response.data.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          console.error("No response received:", err.request);
          errorMessage =
            "No response from server. Please check your connection.";
        } else {
          console.error("Request setup error:", err.message);
          errorMessage = `Error: ${err.message}`;
        }

        setError(errorMessage);
        // Reset to initial state on error
        setDisplayedColors([]);
        setHasMore(false);
      } finally {
        setIsSearching(false);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const copyColorCode = (color) => {
    navigator.clipboard.writeText(color.code);
    setCopiedColor(color.code);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const exportFavorites = () => {
    const dataStr = JSON.stringify(favorites, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
      dataStr
    )}`;
    const exportFileDefaultName = "color-favorites.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const shareColor = async (color) => {
    if (isSharing) {
      console.log("Share already in progress, please wait...");
      return;
    }

    try {
      setIsSharing(true);
      const shareData = {
        title: `${color.name} - Benjamin Moore Color`,
        text: `Check out this beautiful color: ${color.name} (${color.code})`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        const textArea = document.createElement("textarea");
        textArea.value = `${color.name} (${color.code}) - ${window.location.href}`;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("Color information copied to clipboard!");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Share was cancelled");
      } else {
        console.error("Error sharing color:", error);
        alert("Failed to share color. Please try again.");
      }
    } finally {
      // Add a small delay before allowing another share
      setTimeout(() => {
        setIsSharing(false);
      }, 1000);
    }
  };

  if (loading && !isSearching) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading color database...</p>
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
            setFilters({
              search: "",
              family: "all",
              collection: "all",
              undertone: "",
              style: "",
              lighting: "",
              room: "",
            });
            fetchColors();
          }}
          className="go-back-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show a message when no colors are found in the database
  if (displayedColors.length === 0 && !loading && !error && !searchQuery) {
    return (
      <div className="error-container">
        <h3>No Colors Available</h3>
        <p>No colors found in the database. Please try again later.</p>
        <button
          onClick={() => {
            setError(null);
            setSearchQuery("");
            setFilters({
              search: "",
              family: "all",
              collection: "all",
              undertone: "",
              style: "",
              lighting: "",
              room: "",
            });
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
            {searchSource && !error && (
              <div className="search-source">
                Results from:{" "}
                {searchSource === "cache"
                  ? "Recent Search"
                  : searchSource === "database"
                  ? "Local Database"
                  : "Benjamin Moore Website"}
              </div>
            )}
            {error && <div className="search-error">{error}</div>}
          </div>
          <button
            className={`filter-toggle ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="filters-section">
            <select
              name="undertone"
              value={filters.undertone}
              onChange={handleFilterChange}
            >
              <option value="">All Undertones</option>
              <option value="Warm">Warm</option>
              <option value="Cool">Cool</option>
              <option value="Neutral">Neutral</option>
            </select>

            <select
              name="room"
              value={filters.room}
              onChange={handleFilterChange}
            >
              <option value="">All Rooms</option>
              <option value="Living Room">Living Room</option>
              <option value="Bedroom">Bedroom</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Bathroom">Bathroom</option>
              <option value="Dining Room">Dining Room</option>
              <option value="Home Office">Home Office</option>
            </select>
          </div>
        )}

        <div className="action-buttons">
          <button
            className={`action-button ${showComparison ? "active" : ""}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            <FaExchangeAlt /> Compare Colors ({compareColors.length}/3)
          </button>
          <button
            className={`action-button ${showPalette ? "active" : ""}`}
            onClick={() => setShowPalette(!showPalette)}
          >
            <FaPalette /> Color Palettes
          </button>
          <button
            className="action-button"
            onClick={() => setShowTips(!showTips)}
          >
            <FaLightbulb /> Tips
          </button>
          {favorites.length > 0 && (
            <button className="action-button" onClick={exportFavorites}>
              <FaDownload /> Export Favorites
            </button>
          )}
        </div>
      </div>

      {showTips && (
        <div className="tips-panel">
          <h3>
            <FaLightbulb /> Color Selection Tips
          </h3>
          <div className="tips-grid">
            <div className="tip-card">
              <FaHome />
              <h4>Living Room</h4>
              <p>
                Choose warm, inviting colors that create a comfortable
                atmosphere.
              </p>
            </div>
            <div className="tip-card">
              <FaBed />
              <h4>Bedroom</h4>
              <p>Opt for calming, soothing colors that promote relaxation.</p>
            </div>
            <div className="tip-card">
              <FaUtensils />
              <h4>Kitchen</h4>
              <p>Select bright, energizing colors that stimulate appetite.</p>
            </div>
            <div className="tip-card">
              <FaBath />
              <h4>Bathroom</h4>
              <p>Use clean, fresh colors that create a spa-like atmosphere.</p>
            </div>
          </div>
        </div>
      )}

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
                    <p className="color-code">{color.code}</p>
                    <span className="color-hex">{color.hex}</span>
                    <button
                      className="copy-button"
                      onClick={() => copyColorCode(color)}
                    >
                      {copiedColor === color.code ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                  <p className="color-family">{color.family}</p>
                  <p className="color-undertone">
                    Undertone: {color.undertone}
                  </p>
                  <p className="color-lrv">LRV: {color.lrv}</p>
                  <div className="comparison-actions">
                    <button
                      className="share-button"
                      onClick={() => shareColor(color)}
                    >
                      <FaShare /> Share
                    </button>
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

      {showPalette && currentPalette && currentPalette.length > 0 && (
        <div className="palette-panel">
          <h3>
            <FaPalette /> Color Palette
            <span className="palette-source">
              {currentPalette[0]?.source === "website"
                ? "from Benjamin Moore"
                : "generated locally"}
            </span>
          </h3>
          <div className="palette-grid">
            {currentPalette.map((color) => (
              <div key={color.code} className="palette-card">
                <div
                  className="color-swatch"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="color-info">
                  <h4>{color.name}</h4>
                  <p className="color-code">{color.code}</p>
                  <p className="color-type">{color.type}</p>
                  <div className="color-actions">
                    <button
                      className="copy-button"
                      onClick={() => copyColorCode(color)}
                      title="Copy color code"
                    >
                      {copiedColor === color.code ? <FaCheck /> : <FaCopy />}
                    </button>
                    <button
                      className="share-button"
                      onClick={() => shareColor(color)}
                      title="Share color"
                    >
                      <FaShare />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading palette...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Show a message when no search results are found, but keep the interface visible */}
      {getFilteredColors().length === 0 && !loading && searchQuery && (
        <div className="no-results">
          <p>No colors found matching "{searchQuery}".</p>
          <p className="search-suggestion">
            Try removing some words or using different terms. For example:
            <ul>
              <li>Instead of "deep ocean blue", try "ocean" or "blue"</li>
              <li>Instead of "warm kitchen yellow", try "warm" or "yellow"</li>
              <li>
                Instead of "modern living room gray", try "gray" or "modern"
              </li>
            </ul>
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilters({
                search: "",
                family: "all",
                collection: "all",
                undertone: "",
                style: "",
                lighting: "",
                room: "",
              });
              fetchColors();
            }}
            className="go-back-button"
          >
            Go Back
          </button>
        </div>
      )}

      {/* Show the color grid if we have colors */}
      {filteredColors.length > 0 && (
        <>
          <div className="color-grid">
            {filteredColors.map((color) => (
              <div
                key={color.code}
                className="color-card"
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
                    className={`favorite-button ${
                      favorites.some((fav) => fav.code === color.code)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => toggleFavorite(color)}
                    title="Add to favorites"
                  >
                    {favorites.some((fav) => fav.code === color.code) ? (
                      <FaHeart />
                    ) : (
                      <FaRegHeart />
                    )}
                  </button>
                  <button
                    className={`compare-button ${
                      compareColors.some((comp) => comp.code === color.code)
                        ? "active"
                        : ""
                    }`}
                    onClick={() => toggleCompare(color)}
                    title="Compare colors"
                  >
                    <FaExchangeAlt />
                  </button>
                  <button
                    className="palette-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log("Palette button clicked for color:", color);
                      generatePalette(color);
                    }}
                    title="View color palette"
                  >
                    <FaPalette />
                  </button>
                  <button
                    className="info-button"
                    onClick={() => handleColorClick(color)}
                    title="View color details"
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
                  <h3>{color.name}</h3>
                  <div className="color-code-section">
                    <a
                      href={getBenjaminMooreUrl(color.code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="color-code"
                    >
                      {color.code}
                    </a>
                    <span className="color-hex">{color.hex}</span>
                    <button
                      className="copy-button"
                      onClick={() => copyColorCode(color)}
                      title="Copy color code"
                    >
                      {copiedColor === color.code ? <FaCheck /> : <FaCopy />}
                    </button>
                  </div>
                  <p className="color-family">{color.family}</p>
                  <p className="color-description">{color.description}</p>
                  {selectedColor === color.code && (
                    <div className="color-details">
                      <div className="color-details-header">
                        <div
                          className="color-swatch-large"
                          style={{ backgroundColor: color.hex }}
                        ></div>
                        <div className="color-details-info">
                          <p className="color-undertone">
                            Undertone: {color.undertone}
                          </p>
                          <p className="color-lrv">LRV: {color.lrv}</p>
                        </div>
                      </div>
                      <p className="color-description">{color.description}</p>
                      {color.suggestedRooms &&
                        color.suggestedRooms.length > 0 && (
                          <div className="suggested-rooms">
                            <h4>Suggested Rooms:</h4>
                            <ul>
                              {color.suggestedRooms.map((room, index) => (
                                <li key={index}>{room}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      <div className="color-tips">
                        <h4>Tips:</h4>
                        <ul>
                          <li>
                            Consider your furniture and flooring when selecting
                            a color.
                          </li>
                          <li>
                            Test paint samples on your walls in different
                            lighting conditions.
                          </li>
                          <li>
                            Don't be afraid to experiment with different
                            undertones.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div ref={observerTarget} className="infinite-scroll-trigger">
              {isLoadingMore && (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Show a message when no colors are found */}
      {filteredColors.length === 0 && !loading && !searchQuery && (
        <div className="no-results">
          <p>No colors found matching your criteria.</p>
          <p className="search-suggestion">
            Try adjusting your filters or search terms. For example:
            <ul>
              <li>Try a different color family</li>
              <li>Use simpler search terms</li>
              <li>Clear some filters</li>
            </ul>
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilters({
                search: "",
                family: "all",
                collection: "all",
                undertone: "",
                style: "",
                lighting: "",
                room: "",
              });
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

// Helper function to determine text color based on background color
const getTextColor = (hexColor) => {
  // Remove the # if present
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
};

export default ColorBrowser;
