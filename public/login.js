document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  console.log('Sending:', { username, password }); // Log what’s being sent

  try {
    const response = await fetch('https://web-app-j994.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    console.log('Response status:', response.status); // Log status
    const text = await response.text(); // Get raw response first
    console.log('Raw response:', text); // Log raw text

    const data = JSON.parse(text); // Parse as JSON

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      console.log('Token and userId saved in localStorage:', data.token, data.userId);
      window.location.href = '/dashboard.html';
    } else {
      alert(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    alert('An error occurred during login');
  }
});