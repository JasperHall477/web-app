
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; 


document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();  // Prevent form from submitting the default way
  
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    // Send registration data to the server
    fetch(`${apiUrl}/register`, {
      
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);  // Log response from server
        if (data.message === 'User registered successfully') {
          alert('Registration Successful!');
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  });
  