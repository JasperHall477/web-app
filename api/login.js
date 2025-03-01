// api/login.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { User } = require('../models/User');  // Import the User model

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';  // Secret for JWT (you should keep this in an environment variable)

const mongoURI = process.env.MONGODB_URI;  // MongoDB URI from environment variable
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { username, password } = req.body;

    // Find the user in the database
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // Generate a token and send it to the client
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
};
