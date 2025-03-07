const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const app = express();

const allowedOrigins = [
  'https://web-app-lemon-chi.vercel.app', // Your Vercel frontend
  'chrome-extension://fplldpkhjnlgmdogiijgoplgbbbjhfmh', // Your Chrome extension
  // Add 'http://localhost:3000' for local testing if needed
];


app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true // Optional, for cookies or auth headers
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb+srv://SecuroUserLogin:bEqmNId6xb1f7P4G@securoproject.wwiq1.mongodb.net/?retryWrites=true&w=majority&appName=SecuroProject', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB:', err));


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
  userId: { type: String, required: true }
});


const SiteCheck = mongoose.model('SiteCheck', siteCheckSchema);



// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Expect "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded; // Decoded payload (e.g., { username })
    next();
  });
};

// Apply middleware to the endpoint
app.post('/api/addSiteCheck', verifyToken, async (req, res) => {
  const { url, checkResult, validUntil } = req.body;
  const userId = req.user.username; // Use token's username, ignore body userId

  try {
    const newCheck = new SiteCheck({
      url,
      checkResult,
      validUntil: validUntil ? new Date(validUntil) : null,
      date: new Date(),
      userId,
    });

    await newCheck.save();
    res.status(201).json({ message: 'Site check saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error saving site check' });
  }
});





// API to get all site checks for the dashboard
app.get('/api/getAllSiteChecks', verifyToken, async (req, res) => {
  const userId = req.user.username; // Extracted from the token

  try {
    const checks = await SiteCheck.find({ userId }).sort({ date: -1 }); // Filter by userId

    // Combine SSL status and validUntil date
    checks.forEach(check => {
      if (check.checkResult.ssl === "Valid") {
        check.checkResult.ssl = `Valid until ${new Date(check.validUntil).toLocaleDateString()}`;
      } else {
        check.checkResult.ssl = "Invalid";
      }
    });

    res.status(200).json(checks); // Send user-specific site checks
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving site checks' });
  }
});



// Register Route
// app.post('/register', async (req, res) => {
//   const { username, password } = req.body;
//   const existingUser = await User.findOne({ username });

//   if (existingUser) {
//     return res.status(400).json({ message: 'Username already taken' });
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);
//   const newUser = new User({ username, password: hashedPassword });
//   await newUser.save();
//   res.status(201).json({ message: 'User registered successfully' });
// });
// CORS FIX 
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});


// Login Route
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;
//   const user = await User.findOne({ username });

//   if (!user) {
//     return res.status(400).json({ message: 'Invalid username or password' });
//   }

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) {
//     return res.status(400).json({ message: 'Invalid username or password' });
//   }

//   const token = jwt.sign({ username: user.username }, 'your-secret-key', { expiresIn: '1h' });
//   //res.status(200).json({ message: 'Login successful', token });
//   res.status(200).json({ 
//     message: 'Login successful',
//     token: token,
//     userId: user.username // Send the username as userId
//   });
// });
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ username: user.username }, 'your-secret-key', { expiresIn: '1h' });
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});



// Serve the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Server is alive' });
});

app.get('download', verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// Start the server on port 3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
