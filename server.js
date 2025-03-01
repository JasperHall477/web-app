const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// MongoDB connection
mongoose.connect('mongodb+srv://SecuroUserLogin:bEqmNId6xb1f7P4G@securoproject.wwiq1.mongodb.net/?retryWrites=true&w=majority&appName=SecuroProject', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  });

  // Create the model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User;

// MongoDB Schema for Site Checks
const siteCheckSchema = new mongoose.Schema({
  url: { type: String, required: true },
  checkResult: {
    phishing: { type: String, required: true },
    ssl: { type: String, required: true },
  },
  validUntil: { type: Date, required: false },  // New field for SSL valid until date
  date: { type: Date, default: Date.now },  // Automatically set the current date
});


const SiteCheck = mongoose.model('SiteCheck', siteCheckSchema);

// API to add site check result
app.post('/api/addSiteCheck', async (req, res) => {
  const { url, checkResult, validUntil } = req.body;

  try {
    const newCheck = new SiteCheck({
      url,
      checkResult,
      validUntil: validUntil ? new Date(validUntil) : null, // Convert validUntil to Date
      date: new Date(),
      userId: userId
    });

    await newCheck.save();  // Save the site check to MongoDB
    res.status(201).json({ message: 'Site check saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving site check' });
  }
});

// API to get all site checks for the dashboard
app.get('/api/getAllSiteChecks', async (req, res) => {

  const userId = req.query.userId;

  try {
    const checks = await SiteCheck.find().sort({ date: -1 });  // Sort by date in descending order
    
    // Combine SSL status and validUntil date
    checks.forEach(check => {
      if (check.checkResult.ssl === "Valid") {
        check.checkResult.ssl = `Valid until ${new Date(check.validUntil).toLocaleDateString()}`;
      } else {
        check.checkResult.ssl = "Invalid";
      }
    });
    
    res.status(200).json(checks);  // Send all site check data to the frontend
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving site checks' });
  }
});


app.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  try {
    // Verify the refresh token (this is where the backend checks if the refresh token is valid)
    const decoded = jwt.verify(refreshToken, 'your-refresh-token-secret');

    // Create a new JWT token
    const newToken = jwt.sign({ userId: decoded.userId }, 'your-secret-key', { expiresIn: '1h' });

    res.status(200).json({ token: newToken });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(403).json({ message: 'Invalid refresh token' });
  }
});


// Register Route
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.status(400).json({ message: 'Username already taken' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  await newUser.save();
  res.status(201).json({ message: 'User registered successfully' });
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  const token = jwt.sign({ username: user.username }, 'your-secret-key', { expiresIn: '1h' });
  res.status(200).json({ message: 'Login successful', token });
});

// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server on port 3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
