// api/register.js

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User } = require('../models/User');  // Import the User model

const mongoURI = process.env.MONGODB_URI;  // MongoDB URI from environment variable
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user and save to the database
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};
