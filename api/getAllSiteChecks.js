// /api/getAllSiteChecks.js
const mongoose = require('mongoose');
const { SiteCheck } = require('../models/SiteCheck');  // Import the SiteCheck model

// MongoDB URI from environment variable
const mongoURI = process.env.MONGODB_URI;  // Access the MONGODB_URI environment variable

// Function to connect to MongoDB (ensuring single connection per serverless execution)
const connectToDatabase = async () => {
  // If already connected, no need to reconnect
  if (mongoose.connections[0].readyState) return;

  // Otherwise, establish a new connection
  await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
};

module.exports = async (req, res) => {
  try {
    // Ensure connection to MongoDB
    await connectToDatabase();

    // Retrieve all site checks from the database, sorted by date in descending order
    const checks = await SiteCheck.find().sort({ date: -1 });

    // Send the site checks as a response
    res.status(200).json(checks);
  } catch (error) {
    console.error('Error fetching site checks:', error);
    res.status(500).json({ message: 'Error retrieving site checks' });
  }
};
