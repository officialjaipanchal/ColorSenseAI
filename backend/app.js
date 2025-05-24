const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const queryRouter = require("./routes/query");
const colorsRouter = require("./routes/colors");

// Mount routes
app.use("/api/query", queryRouter);
app.use("/api", colorsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
