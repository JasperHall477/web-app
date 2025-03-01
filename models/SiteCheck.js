// /models/SiteCheck.js
const mongoose = require('mongoose');

// Define the schema for site checks
const siteCheckSchema = new mongoose.Schema({
  url: { type: String, required: true },
  checkResult: {
    phishing: { type: String, required: true },
    ssl: { type: String, required: true },
  },
  validUntil: { type: Date, required: false },  // Optional field
  date: { type: Date, default: Date.now },
});

// Create the model based on the schema
const SiteCheck = mongoose.model('SiteCheck', siteCheckSchema);

module.exports = { SiteCheck };
