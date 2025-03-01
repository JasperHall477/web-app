// /models/SiteCheck.js
const mongoose = require('mongoose');

const siteCheckSchema = new mongoose.Schema({
  url: { type: String, required: true },
  checkResult: {
    phishing: { type: String, required: true },
    ssl: { type: String, required: true }
  },
  validUntil: { type: Date, required: false },
  date: { type: Date, default: Date.now }
});

const SiteCheck = mongoose.model('SiteCheck', siteCheckSchema);
module.exports = { SiteCheck };
