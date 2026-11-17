const express = require("express");
const router = express.Router();

const { getStatus } = require("../services/startupService");

// GET /api/health
router.get("/health", (req, res) => {
  res.json({
    status: getStatus(),
  });
});

// GET /api/versi
router.get("/versi", (req, res) => {
  res.json({
    versi_kontrak: "1.2",
  });
});

module.exports = router;
