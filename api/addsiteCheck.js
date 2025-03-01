// /api/addSiteCheck.js
const mongoose = require('mongoose');
const { SiteCheck } = require('../models/SiteCheck');

const mongoURI = process.env.MONGODB_URI;  // MongoDB URI from environment variable

// Function to connect to MongoDB
const connectToDatabase = async () => {
  if (mongoose.connections[0].readyState) return;  // Check if already connected
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
};

module.exports = async (req, res) => {
  await connectToDatabase();  // Ensure connection to MongoDB

  if (req.method === 'POST') {
    try {
      const { url, checkResult, validUntil } = req.body;

      const newCheck = new SiteCheck({
        url,
        checkResult,
        validUntil: validUntil ? new Date(validUntil) : null,
        date: new Date(),
      });

      await newCheck.save();
      res.status(200).json({ message: 'Site check saved successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error saving site check' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
};
