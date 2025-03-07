
document.getElementById('registerForm').addEventListener('submit', function (event) {
  event.preventDefault();  // Prevent form from submitting the default way

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Send registration data to the server
  fetch('https://web-app-j994.onrender.com/register', {
  //fetch('http://localhost:3000/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);  // Log response from server
      if (data.message === 'User registered successfully') {
        alert('Registration Successful!');
        window.location.href = '/login.html';
      } else {
        alert(data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
