document.getElementById('registerForm').addEventListener('submit', function (event) {
  event.preventDefault();  // Prevent default form submission

  const username = document.getElementById('username').value.trim();
  const confirmUsername = document.getElementById('confirmUsername').value.trim();
  const password = document.getElementById('password').value;

  const errorElement = document.getElementById('usernameError');

  if (username !== confirmUsername) {
    errorElement.style.display = 'block';
    return;
  } else {
    errorElement.style.display = 'none';
  }

  // Proceed with sending registration data
  fetch('https://web-app-j994.onrender.com/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
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
