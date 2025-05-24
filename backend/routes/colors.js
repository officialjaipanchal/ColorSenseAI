const express = require("express");
const router = express.Router();
const Color = require("../models/Color");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

// Enable CORS for all routes
router.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Cache configuration
const colorCache = new Map();
const searchCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Initialize cache with colors from database
async function initializeColorCache() {
  try {
    const colors = await Color.find({});
    colors.forEach((color) => {
      colorCache.set(color.code, { data: color, timestamp: Date.now() });
    });
    console.log("Color cache initialized with", colorCache.size, "colors");
  } catch (error) {
    console.error("Error initializing color cache:", error);
  }
}

initializeColorCache();

// Helper Functions
async function getColorDetails(colorCode) {
  try {
    const cached = colorCache.get(colorCode);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const color = await Color.findOne({ code: colorCode });
    if (color) {
      colorCache.set(colorCode, { data: color, timestamp: Date.now() });
      return color;
    }

    return {
      name: `Color ${colorCode}`,
      code: colorCode,
      hex: "#FFFFFF",
      description: "Color details not available",
      family: "Unknown",
      collection: "Classic",
      undertone: "Neutral",
      lrv: "50",
      suggestedRooms: ["Living Room"],
      style: "Classic",
    };
  } catch (error) {
    console.error(`Error in getColorDetails for ${colorCode}:`, error);
    throw error;
  }
}

// async function fetchColorsFromWebsite(query = "") {
//   const url =
//     "https://api.benjaminmoore.io/service/advancedSearch?version=v1.0";
//   const headers = {
//     "Content-Type": "application/json;charset=UTF-8",
//     "Ocp-Apim-Subscription-Key": "48c3c3e75b424f97904f9659da65b4d0",
//     Origin: "https://www.benjaminmoore.com",
//     "User-Agent":
//       "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
//   };

//   try {
//     const response = await axios.post(url, { query, facets: [] }, { headers });
//     if (response.data.status !== "OK") {
//       throw new Error("API returned non-OK status");
//     }

//     const results = response.data.data.records.page || [];
//     for (const color of results) {
//       if (!color.color_number) continue;
//       const existingColor = await Color.findOne({ code: color.color_number });
//       if (!existingColor) {
//         await Color.create({
//           code: color.color_number,
//           name: color.color_name || "Unknown",
//           hex: color.color_hex ? `#${color.color_hex}` : "#000000",
//           description: "No description available",
//           family: "Unknown",
//           collection: "Classic",
//           undertone: "Neutral",
//           lrv: "50",
//           suggestedRooms: ["Living Room"],
//           style: "Classic",
//         });
//       }
//     }

//     return {
//       colors: results,
//       pagination: {
//         currentPage: response.data.data.info.page.current_page,
//         totalPages: response.data.data.info.page.num_pages,
//         totalResults: response.data.data.info.page.total_result_count,
//         perPage: response.data.data.info.page.per_page,
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching colors from BM API:", error.message);
//     throw error;
//   }
// }

function generatePalette(baseColor) {
  try {
    if (!baseColor?.hex) throw new Error("Invalid base color data");

    const hex = baseColor.hex.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const toHex = (rgb) =>
      "#" +
      [rgb.r, rgb.g, rgb.b]
        .map((x) => Math.round(x).toString(16).padStart(2, "0"))
        .join("");

    const complementary = { r: 255 - r, g: 255 - g, b: 255 - b };
    const analogous1 = {
      r: Math.min(255, r + 30),
      g: Math.min(255, g + 30),
      b: Math.min(255, b + 30),
    };
    const analogous2 = {
      r: Math.max(0, r - 30),
      g: Math.max(0, g - 30),
      b: Math.max(0, b - 30),
    };
    const triadic1 = { r: g, g: b, b: r };
    const triadic2 = { r: b, g: r, b: g };

    return [
      {
        name: baseColor.name,
        code: baseColor.code,
        hex: baseColor.hex,
        type: "Base Color",
        source: "local",
      },
      {
        name: `${baseColor.name} Complementary`,
        code: `CP-${baseColor.code}`,
        hex: toHex(complementary),
        type: "Complementary",
        source: "local",
      },
      {
        name: `${baseColor.name} Analogous 1`,
        code: `AN1-${baseColor.code}`,
        hex: toHex(analogous1),
        type: "Analogous",
        source: "local",
      },
      {
        name: `${baseColor.name} Analogous 2`,
        code: `AN2-${baseColor.code}`,
        hex: toHex(analogous2),
        type: "Analogous",
        source: "local",
      },
      {
        name: `${baseColor.name} Triadic 1`,
        code: `TR1-${baseColor.code}`,
        hex: toHex(triadic1),
        type: "Triadic",
        source: "local",
      },
      {
        name: `${baseColor.name} Triadic 2`,
        code: `TR2-${baseColor.code}`,
        hex: toHex(triadic2),
        type: "Triadic",
        source: "local",
      },
    ];
  } catch (error) {
    console.error("Error generating palette:", error);
    return [
      {
        name: baseColor.name,
        code: baseColor.code,
        hex: baseColor.hex,
        type: "Base Color",
        source: "local",
      },
    ];
  }
}

// Routes
router.get("/colors", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalResults = await Color.countDocuments({});

    // If limit is greater than total results, show all results
    const effectiveLimit = limit >= totalResults ? totalResults : limit;
    const totalPages = Math.ceil(totalResults / effectiveLimit);

    // Add console.log to debug pagination
    console.log("Pagination params:", {
      page,
      limit,
      skip,
      effectiveLimit,
      totalResults,
      totalPages,
    });

    const colors = await Color.find({})
      .select({
        code: 1,
        name: 1,
        hex: 1,
        description: 1,
        family: 1,
        undertone: 1,
        lrv: 1,
        suggestedRooms: 1,
        style: 1,
        _id: 0,
      })
      .skip(skip)
      .limit(effectiveLimit);

    // Add console.log to debug results
    console.log("Query results:", {
      colorsCount: colors.length,
      firstColor: colors[0]?.code,
      lastColor: colors[colors.length - 1]?.code,
    });

    if (!colors?.length) {
      return res.status(404).json({
        success: false,
        message: "No colors found in database",
      });
    }

    res.json({
      success: true,
      data: colors,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        perPage: effectiveLimit,
      },
    });
  } catch (error) {
    console.error("Error fetching colors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch colors",
      error: error.message,
    });
  }
});

router.get("/colors/search", async (req, res) => {
  try {
    const {
      query,
      family,
      collection,
      undertone,
      style,
      room,
      lrvMin,
      lrvMax,
      page = 1,
    } = req.query;

    // Try website first
    try {
      const websiteResults = await fetchColorsFromWebsite(query);
      if (websiteResults.colors.length > 0) {
        return res.json({
          success: true,
          data: websiteResults.colors,
          pagination: websiteResults.pagination,
          source: "website",
        });
      }
    } catch (websiteError) {
      console.log("Failed to fetch from website:", websiteError.message);
    }

    // Check cache
    const cacheKey = JSON.stringify(req.query);
    const cachedSearch = searchCache.get(cacheKey);
    if (
      cachedSearch &&
      Date.now() - cachedSearch.timestamp < SEARCH_CACHE_DURATION
    ) {
      return res.json({
        success: true,
        data: cachedSearch.data,
        source: "cache",
      });
    }

    // Build search query
    const searchQuery = {};
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
        { family: { $regex: query, $options: "i" } },
        { collection: { $regex: query, $options: "i" } },
        { undertone: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { style: { $regex: query, $options: "i" } },
      ];
    }
    if (family) searchQuery.family = { $regex: family, $options: "i" };
    if (collection)
      searchQuery.collection = { $regex: collection, $options: "i" };
    if (undertone) searchQuery.undertone = { $regex: undertone, $options: "i" };
    if (style) searchQuery.style = { $regex: style, $options: "i" };
    if (room) searchQuery.suggestedRooms = { $regex: room, $options: "i" };
    if (lrvMin || lrvMax) {
      searchQuery.lrv = {};
      if (lrvMin) searchQuery.lrv.$gte = parseFloat(lrvMin);
      if (lrvMax) searchQuery.lrv.$lte = parseFloat(lrvMax);
    }

    const results = await Color.find(searchQuery);
    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });

    res.json({
      success: true,
      data: results,
      source: "database",
      filters: {
        family: family || "all",
        collection: collection || "all",
        undertone: undertone || "all",
        style: style || "all",
        room: room || "all",
        lrvRange: lrvMin && lrvMax ? `${lrvMin}-${lrvMax}` : "all",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to search colors",
      error: error.message,
    });
  }
});

// Add search-colors route as an alias to /search
router.post("/search-colors", async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    // First try to fetch from Benjamin Moore API
    try {
      const websiteResults = await fetchColorsFromWebsite(query);
      if (websiteResults.colors && websiteResults.colors.length > 0) {
        // Calculate pagination for website results
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedColors = websiteResults.colors.slice(
          startIndex,
          endIndex
        );

        return res.json({
          success: true,
          colors: paginatedColors,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(websiteResults.colors.length / limit),
            totalResults: websiteResults.colors.length,
            perPage: limit,
          },
          source: "website",
        });
      }
    } catch (websiteError) {
      console.log("Failed to fetch from website:", websiteError.message);
    }

    // If website fetch fails, search in database
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
        { family: { $regex: query, $options: "i" } },
        { collection: { $regex: query, $options: "i" } },
        { undertone: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { style: { $regex: query, $options: "i" } },
      ],
    };

    // Get total count for pagination
    const totalResults = await Color.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalResults / limit);
    const skip = (page - 1) * limit;

    // Get paginated results
    const results = await Color.find(searchQuery).skip(skip).limit(limit);

    // Transform the results to match the expected format
    const transformedResults = results.map((color) => ({
      color_name: color.name,
      color_number: color.code,
      color_hex: color.hex.replace("#", ""),
      description: color.description,
      family: color.family,
      collection: color.collection,
      undertone: color.undertone,
      lrv: color.lrv,
      suggestedRooms: color.suggestedRooms,
      style: color.style,
    }));

    res.json({
      success: true,
      colors: transformedResults,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        perPage: limit,
      },
      source: "database",
    });
  } catch (error) {
    console.error("Error in search-colors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search colors",
      error: error.message,
    });
  }
});

// Also handle GET requests for search-colors
router.get("/search-colors", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Query parameter is required",
      });
    }

    // Use the same search logic
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
        { family: { $regex: query, $options: "i" } },
        { collection: { $regex: query, $options: "i" } },
        { undertone: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { style: { $regex: query, $options: "i" } },
      ],
    };

    const results = await Color.find(searchQuery);
    res.json({
      success: true,
      data: results,
      source: "database",
    });
  } catch (error) {
    console.error("Error in search-colors:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search colors",
      error: error.message,
    });
  }
});

router.get("/colors/:colorCode", async (req, res) => {
  try {
    const details = await getColorDetails(req.params.colorCode);
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch color details",
      error: error.message,
    });
  }
});

router.get("/colors/:colorCode/palette", async (req, res) => {
  try {
    const { colorCode } = req.params;
    const color =
      (await Color.findOne({ code: colorCode })) ||
      colorCache.get(colorCode)?.data;

    if (color) {
      const palette = generatePalette(color);
      return res.json({ success: true, data: palette, source: "database" });
    }

    res.status(404).json({ success: false, message: "Color not found" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate color palette",
      error: error.message,
    });
  }
});

router.get("/colors/room/:room", async (req, res) => {
  try {
    const colors = await Color.find({
      suggestedRooms: req.params.room.toLowerCase(),
    });
    res.json({ success: true, data: colors });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching colors for room",
      error: error.message,
    });
  }
});

router.get("/colors/undertone/:undertone", async (req, res) => {
  try {
    const colors = await Color.find({
      undertone: req.params.undertone.toLowerCase(),
    });
    res.json({ success: true, data: colors });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching colors by undertone",
      error: error.message,
    });
  }
});

module.exports = router;
