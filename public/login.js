document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    //const response = await fetch('/login', {
    const response = await fetch('https://web-app-j994.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Save to localStorage for the web app
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);

      console.log('Token and userId saved in localStorage:', data.token, data.userId);

      //alert(data.message); // "Login successful"
      window.location.href = '/dashboard.html'; // Redirect to dashboard
    } else {
      alert(data.message); // "Invalid username or password"
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('An error occurred during login');
  }
});