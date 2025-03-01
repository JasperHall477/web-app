// dashboard.js

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';  // Use dynamic API URL

const token = localStorage.getItem('token');  // Get the JWT token from localStorage

function logout() {
  // Remove the token and userId from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('userId');  // Optional, if you store userId

  // Redirect the user to the login page
  window.location.href = 'login.html';
}


if (!token) {
  window.location.href = 'login.html';  // Redirect to login page if not authenticated
}

fetch(`${apiUrl}/api/getUserSiteChecks`, {  // Use dynamic API URL for the GET request
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
})
  .then(response => response.json())
  .then(data => {
    const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];

    data.forEach(item => {
      const row = table.insertRow();
      row.insertCell().textContent = item.url;

      const phishingStatusCell = row.insertCell();
      phishingStatusCell.textContent = item.checkResult.phishing;
      phishingStatusCell.style.color = item.checkResult.phishing === "Unsafe" ? "red" : "green";

      const sslStatusCell = row.insertCell();
      sslStatusCell.textContent = item.checkResult.ssl;
      sslStatusCell.style.color = item.checkResult.ssl.startsWith('Valid') ? "green" : "red";
    });
  })
  .catch(error => {
    console.error('Error fetching site checks:', error);
  });
