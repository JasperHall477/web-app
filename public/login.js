// login.js
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';  // Default to localhost for local development

document.getElementById('loginForm').addEventListener('submit', function (event) {
  event.preventDefault();  // Prevent form from submitting the default way

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Send login data to the server
  fetch(`${apiUrl}/login`, {  // Use dynamic apiUrl
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        alert('Login Successful!');
        localStorage.setItem('token', data.token);
        window.location.href = 'dashboard.html';  // Redirect to dashboard
      } else {
        alert(data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
