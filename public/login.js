// public/login.js

// Use environment variable for the API URL (with fallback for local development)
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Fallback to localhost if not in production

document.getElementById('loginForm').addEventListener('submit', function (event) {
  event.preventDefault();  // Prevent form from submitting the default way

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Send login data to the server using the dynamic API URL
  fetch(`${apiUrl}/api/login`, {  // Use dynamic apiUrl
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        alert('Login Successful!');
        localStorage.setItem('token', data.token);  // Store the JWT token in localStorage
        window.location.href = 'dashboard.html';  // Redirect to dashboard
      } else {
        alert(data.message);  // Display error message if login fails
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
