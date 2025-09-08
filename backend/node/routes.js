const express = require("express");
const axios = require("axios");
const router = express.Router();

// Example: proxy call to Python backend
router.get("/path", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:8000/path");
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
