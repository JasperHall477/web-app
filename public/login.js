document.getElementById('loginForm').addEventListener('submit', function (event) {
  event.preventDefault();  // Prevent form from submitting the default way

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Send login data to the server
  fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.token) {
        alert('Login Successful!');
        
        // Store the token in both localStorage and chrome.storage
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);  // Store userId
        // chrome.storage.local.set({ token: data.token, userId: data.userId }, function () {
        //   console.log("User logged in and data saved in chrome.storage.");
        // });

        window.location.href = 'dashboard.html';  // Redirect to dashboard
      } else {
        alert(data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});
