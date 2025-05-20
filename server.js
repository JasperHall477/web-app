const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();

const allowedOrigins = [
  // Main Render Site URL
  'https://web-app-j994.onrender.com',
  // AI model server URL
  'https://url-safety-server.onrender.com',
  // Local for local development testing
  'http://localhost:3000',
];


app.use(cors({
  origin: (origin, callback) => {
    console.log('Request origin:', origin);
    // Allow web app origin or any chrome-extension:// origin
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      console.log('Origin allowed:', origin);
      callback(null, origin || '*');
    } else {
      console.log('Origin rejected:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

//app.use(express.json());
app.use(express.json({ type: 'application/json' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path} - Body:`, req.body);
  next();
});

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
    mlPrediction: { type: String, required: true },
    virusTotal: { type: String, required: false }
  },
  virusTotalStats: {
    positives: { type: Number, required: false },
    total: { type: Number, required: false }
  },
  validUntil: { type: Date, required: false },  
  date: { type: Date, default: Date.now },  
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

app.post('/api/check-url', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Clean URL: remove trailing backslashes or escape characters
  url = url.replace(/\\/g, '').trim();
  console.log(`Cleaned URL for prediction: ${url}`);

  try {
    const response = await axios.post('https://url-safety-server.onrender.com/api/check-url', { url }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Prediction response:', response.data);
    res.json(response.data); // { isSafe: true/false }
  } catch (error) {
    console.error('URL check error:', {
      message: error.message,
      response: error.response ? error.response.data : null,
      status: error.response ? error.response.status : null,
      code: error.code
    });
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
});

// Serve checkURL page
app.get('/checkURL', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkURL.html'));
});

// POST endpoint to save results of a site scan to the database
app.post('/api/addSiteCheck', verifyToken, async (req, res) => {
  // Extract required fields from the request body
  const { url, checkResult, validUntil, virusTotal  } = req.body;
  const userId = req.user.username; // Use token's username, ignore body userId

  try {
    // Create a new document for the site check using the provided data
    const newCheck = new SiteCheck({
      url,
      checkResult: {
        phishing: checkResult.phishing,
        ssl: checkResult.ssl,
        mlPrediction: checkResult.mlPrediction, 
        virusTotal: virusTotal?.verdict || 'Unknown'
      },
      virusTotalStats: {
        positives: virusTotal?.positives || 0,
        total: virusTotal?.total || 0
      },
      validUntil: validUntil ? new Date(validUntil) : null,
      date: new Date(),
      userId,
    });

    // Send a success response
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



app.post('/api/virustotal-check', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Step 1: Encode the URL for submission
    const encodedUrl = Buffer.from(url).toString('base64').replace(/=+$/, ''); // Base64-URL encoding

    // Step 2: Submit the URL for scanning 
    await axios.post(
      'https://www.virustotal.com/api/v3/urls',
      `url=${encodeURIComponent(url)}`,
      {
        headers: {
          'x-apikey': '7918452bd93717b2fe3b663ba924bb9a94fb20ee089a5ab6a655f750a8833a8c',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Step 3: Retrieve scan result
    const result = await axios.get(
      `https://www.virustotal.com/api/v3/urls/${encodedUrl}`,
      {
        headers: { 'x-apikey': '7918452bd93717b2fe3b663ba924bb9a94fb20ee089a5ab6a655f750a8833a8c' },
      }
    );

    const stats = result.data.data.attributes.last_analysis_stats;
    const positives = stats.malicious;
    const total = stats.harmless + stats.malicious + stats.suspicious;

    // Adjusted verdict logic
    let verdict = 'Safe';
    if (positives >= 5) {
      verdict = 'Unsafe';
    } else if (positives > 0 && positives < 5) {
      verdict = 'Suspicious';
    }

    res.json({ verdict, positives, total });
  } catch (error) {
    console.error('VirusTotal error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve VirusTotal scan results' });
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
//TRY 2
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;

//   try {
//     const user = await User.findOne({ username });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid username or password' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid username or password' });
//     }

//     const token = jwt.sign({ username: user.username }, 'your-secret-key', { expiresIn: '1h' });
//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       userId: user.username
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Error logging in', error: error.message });
//   }
// });

app.post('/login', async (req, res) => {
  console.log('Entering /login route');
  const { username, password } = req.body;
  if (!req.body || typeof req.body !== 'object') {
    console.log('No valid JSON body received');
    return res.status(400).json({ message: 'Invalid request body - JSON required' });
  }
  if (!username || !password) {
    console.log('Missing username or password:', req.body);
    return res.status(400).json({ message: 'Username and password are required' });
  }
  try {
    console.log('Querying user:', username);
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    console.log('Comparing password for:', username);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', username);
      return res.status(400).json({ message: 'Invalid username or password' });
    }
    console.log('Generating token for:', username);
    const token = jwt.sign({ username: user.username }, 'your-secret-key', { expiresIn: '1h' });
    console.log('Login successful for:', username);
    res.status(200).json({
      message: 'Login successful',
      token,
      userId: user.username
    });
  } catch (error) {
    console.error('Login error:', error.stack);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
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

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start the server on port 3000
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
