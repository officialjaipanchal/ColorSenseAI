const mongoose = require("mongoose");

const colorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    hex: {
      type: String,
      required: true,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    },
    family: {
      type: String,
      required: true,
      enum: [
        "White",
        "Neutral",
        "Gray",
        "Yellow",
        "Orange",
        "Red",
        "Purple",
        "Blue",
        "Green",
      ],
    },
    collection: {
      type: String,
      required: true,
      enum: ["Classic", "Modern", "Contemporary", "Traditional"],
    },
    undertone: {
      type: String,
      required: true,
      enum: ["Warm", "Cool", "Neutral"],
    },
    lrv: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    description: {
      type: String,
      required: true,
    },
    suggestedRooms: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one suggested room is required",
      },
    },
    style: {
      type: String,
      required: true,
      enum: [
        "Modern",
        "Traditional",
        "Casual Coastal",
        "Contemporary",
        "Art Deco",
        "Boho",
        "Cottage",
        "Craftsman",
        "French Country",
        "Midcentury Modern",
        "Minimalist",
        "Modern Farmhouse",
      ],
    },
    lighting: {
      type: String,
      required: true,
      enum: [
        "All",
        "Natural",
        "North-Facing",
        "South-Facing",
        "East-Facing",
        "West-Facing",
      ],
    },
    isTrending: {
      type: Boolean,
      required: true,
    },
    yearIntroduced: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
    complementaryColors: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one complementary color is required",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Update the updatedAt timestamp before saving
colorSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add text index for search functionality
colorSchema.index({ name: "text", code: "text" });

module.exports = mongoose.model("Color", colorSchema);
