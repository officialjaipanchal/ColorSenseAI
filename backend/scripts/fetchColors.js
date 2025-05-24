const axios = require("axios");
const mongoose = require("mongoose");
const Color = require("../models/Color");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Function to determine color family based on hex color
const getColorFamily = (hex) => {
  // Remove # if present
  hex = hex.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return "Gray";
  }

  const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  const h =
    max === r
      ? (g - b) / (max - min)
      : max === g
      ? 2 + (b - r) / (max - min)
      : 4 + (r - g) / (max - min);

  // Convert hue to degrees
  const hue = h * 60;

  // Determine color family based on hue
  if (l > 0.9) return "White";
  if (l < 0.2) return "Gray";
  if (s < 0.1) return "Neutral";

  if (hue >= 0 && hue < 30) return "Red";
  if (hue >= 30 && hue < 60) return "Orange";
  if (hue >= 60 && hue < 90) return "Yellow";
  if (hue >= 90 && hue < 150) return "Green";
  if (hue >= 150 && hue < 210) return "Blue";
  if (hue >= 210 && hue < 270) return "Purple";
  if (hue >= 270 && hue < 330) return "Red";
  return "Red";
};

// Function to determine undertone based on color family and hex
const getUndertone = (family, hex) => {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate warmth
  const warmth = (r - b) / 255;

  if (family === "White" || family === "Gray" || family === "Neutral") {
    return warmth > 0.1 ? "Warm" : warmth < -0.1 ? "Cool" : "Neutral";
  }

  return warmth > 0 ? "Warm" : "Cool";
};

// Function to calculate LRV (Light Reflectance Value)
const calculateLRV = (hex) => {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Convert to relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  // Convert to LRV (0-100)
  return Math.round(luminance * 100);
};

// Function to get suggested rooms based on color family and LRV
const getSuggestedRooms = (family, lrv) => {
  const rooms = [];

  if (lrv > 70) {
    rooms.push("Living Room", "Kitchen", "Bathroom");
  } else if (lrv > 50) {
    rooms.push("Living Room", "Bedroom", "Dining Room");
  } else if (lrv > 30) {
    rooms.push("Bedroom", "Dining Room", "Home Office");
  } else {
    rooms.push("Bedroom", "Dining Room", "Accent Wall");
  }

  return rooms;
};

// Function to get complementary colors based on hex
const getComplementaryColors = (hex) => {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate complementary color
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;

  // Convert back to hex
  const compHex =
    "#" +
    compR.toString(16).padStart(2, "0") +
    compG.toString(16).padStart(2, "0") +
    compB.toString(16).padStart(2, "0");

  return [compHex];
};

// Function to get style based on color family and LRV
const getStyle = (family, lrv) => {
  if (lrv > 80) return "Minimalist";
  if (lrv > 60) return "Modern";
  if (lrv > 40) return "Contemporary";
  return "Traditional";
};

const fetchColors = async () => {
  try {
    // Define all color families to search for
    const colorFamilies = [
      "white",
      "neutral",
      "gray",
      "yellow",
      "orange",
      "red",
      "purple",
      "blue",
      "green",
      "beige",
      "cream",
      "tan",
      "brown",
      "black",
      "pink",
      "mint",
      "teal",
      "navy",
      "burgundy",
      "sage",
      "olive",
      "gold",
      "silver",
      "bronze",
      "copper",
      "ivory",
      "pearl",
      "coral",
      "lavender",
      "mauve",
      "maroon",
      "mustard",
      "khaki",
      "taupe",
      "charcoal",
      "slate",
      "indigo",
      "turquoise",
      "aqua",
      "crimson",
      "magenta",
      "fuchsia",
      "amber",
      "cobalt",
      "emerald",
      "ruby",
      "sapphire",
      "plum",
      "lilac",
      "periwinkle",
      "ochre",
      "putty",
      "storm",
      "linen",
      "smoke",
      "clay",
      "dove",
      "flax",
      "mulberry",
      "truffle",
      "espresso",
      "cinnamon",
      "mocha",
      "blush",
      "sky",
      "ash",
      "greige",
      "seashell",
      "stone",
      "cloud",
      "canvas",
      "wheat",
      "sand",
      "fog",
      "ink",
      "pine",
      "spruce",
      "willow",
      "cactus",
      "desert",
      "sunset",
      "twilight",
      "midnight",
      "alabaster",
      "arctic",
      "bay",
      "birch",
      "breeze",
      "brick",
      "canary",
      "carmine",
      "celery",
      "celeste",
      "champagne",
      "chestnut",
      "clover",
      "coal",
      "currant",
      "dandelion",
      "driftwood",
      "ebony",
      "eggshell",
      "fern",
      "flamingo",
      "garnet",
      "ginger",
      "glacier",
      "graphite",
      "harvest",
      "hazel",
      "honey",
      "ivory lace",
      "jade",
      "linen white",
      "lotus",
      "mallow",
      "maple",
      "marigold",
      "melon",
      "midnight blue",
      "mist",
      "mulch",
      "nectarine",
      "oatmeal",
      "opal",
      "orchid",
      "papaya",
      "peach",
      "pineapple",
      "raindrop",
      "raspberry",
      "rose",
      "seafoam",
      "sepia",
      "shell",
      "snow",
      "spring",
      "stone blue",
      "straw",
      "sunflower",
      "thistle",
      "toffee",
      "topaz",
      "truffle",
      "vanilla",
      "wisteria",
      "zinc",
    ];

    let allColors = [];
    console.log("🔍 Starting to fetch colors for all families...");

    // Fetch colors for each family
    for (const family of colorFamilies) {
      console.log(`\n📥 Fetching colors for family: ${family}`);
      const data = {
        query: family,
        facets: [],
      };

      try {
        const response = await axios.post(
          "https://api.benjaminmoore.io/service/advancedSearch?version=v1.0",
          data,
          {
            headers: {
              "Content-Type": "application/json;charset=UTF-8",
              "Ocp-Apim-Subscription-Key": "48c3c3e75b424f97904f9659da65b4d0",
              Origin: "https://www.benjaminmoore.com",
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
            },
          }
        );

        const colors =
          response.data?.data?.records?.page?.filter(
            (c) => c.color_name && c.color_hex
          ) || [];

        console.log(`✅ Found ${colors.length} colors for ${family}`);
        allColors = [...allColors, ...colors];

        // Add a small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error fetching colors for ${family}:`, error.message);
        // Continue with next family even if one fails
        continue;
      }
    }

    // Remove duplicates based on color code
    const uniqueColors = Array.from(
      new Map(allColors.map((color) => [color.color_number, color])).values()
    );

    console.log(`\n🎨 Total unique colors found: ${uniqueColors.length}`);

    // Process and save each unique color
    for (const [index, c] of uniqueColors.entries()) {
      console.log(`\n👉 Processing color #${index + 1}: ${c.color_name}`);

      const hex = `#${c.color_hex}`;
      const family = getColorFamily(hex);
      const undertone = getUndertone(family, hex);
      const lrv = calculateLRV(hex);
      const suggestedRooms = getSuggestedRooms(family, lrv);
      const complementaryColors = getComplementaryColors(hex);
      const style = getStyle(family, lrv);

      const color = new Color({
        name: c.color_name,
        code: c.color_number,
        hex: hex,
        family: family,
        collection: "Classic",
        undertone: undertone,
        lrv: lrv,
        description: `A beautiful ${undertone.toLowerCase()} ${family.toLowerCase()} color perfect for ${suggestedRooms[0].toLowerCase()} settings.`,
        suggestedRooms: suggestedRooms,
        style: style,
        lighting: "All",
        yearIntroduced: 2024,
        complementaryColors: complementaryColors,
        isTrending: false,
      });

      try {
        await color.save();
        console.log(`✅ Saved: ${color.name}`);
      } catch (err) {
        console.error(`❌ Failed to save ${c.color_name}:`, err.message);
      }
    }

    console.log("\n🎉 All valid colors saved to MongoDB!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error in main process:", error.message);
    mongoose.connection.close();
  }
};

fetchColors();
