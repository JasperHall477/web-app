// const express = require('express');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const mongoose = require('mongoose');

// // MongoDB connection setup
// // mongoose.connect('mongodb://localhost:27017/webapp', { useNewUrlParser: true, useUnifiedTopology: true })
// //   .then(() => console.log('Connected to MongoDB'))
// //   .catch(err => console.error('Failed to connect to MongoDB:', err));

// mongoose.connect('mongodb+srv://SecuroUserLogin:bEqmNId6xb1f7P4G@securoproject.wwiq1.mongodb.net/?retryWrites=true&w=majority&appName=SecuroProject', { useNewUrlParser: true, useUnifiedTopology: true })
// .then(() => console.log('Connected to MongoDB'))
// .catch(err => console.error('Failed to connect to MongoDB:', err));


// const app = express();
// const port = 3000;

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // MongoDB user schema
// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true }
// });

// const User = mongoose.model('User', userSchema);

// // Secret key for JWT
// const JWT_SECRET = 'your-secret-key';

// // Register Route
// app.post('/register', async (req, res) => {
//   const { username, password } = req.body;

//   // Check if the user already exists
//   const existingUser = await User.findOne({ username });
//   if (existingUser) {
//     return res.status(400).json({ message: 'Username already taken' });
//   }

//   // Hash the password
//   const hashedPassword = await bcrypt.hash(password, 10);

//   // Create a new user and save to the database
//   const newUser = new User({ username, password: hashedPassword });
//   await newUser.save();

//   res.status(201).json({ message: 'User registered successfully' });
// });

// // Login Route
// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;

//   // Find the user in the database
//   const user = await User.findOne({ username });
//   if (!user) {
//     return res.status(400).json({ message: 'Invalid username or password' });
//   }

//   // Compare the provided password with the hashed password
//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) {
//     return res.status(400).json({ message: 'Invalid username or password' });
//   }

//   // Create and send a JWT token
//   const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });
//   res.status(200).json({ message: 'Login successful', token });
// });

// // Protected Route (Dashboard)
// app.get('/dashboard', (req, res) => {
//   const token = req.headers['authorization'];

//   if (!token) {
//     return res.status(403).json({ message: 'No token provided' });
//   }

//   jwt.verify(token, JWT_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(403).json({ message: 'Invalid token' });
//     }

//     res.status(200).json({ message: `Welcome, ${decoded.username}!` });
//   });
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });
