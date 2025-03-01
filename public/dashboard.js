const token = localStorage.getItem('token');  // Check if token exists


if (!token) {
  window.location.href = 'login.html';  // Redirect to login if not authenticated
}

function logout() {
    // Remove the token and userId from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');  // Optional, if you store userId
  
    // Redirect the user to the login page
    window.location.href = 'login.html';
  }
  

  fetch('https://web-app-j994.onrender.com/api/getAllSiteChecks', {
    method: 'GET',
  })
  .then(response => response.json())
  .then(data => {
    const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
  
    data.forEach(item => {
      const row = table.insertRow();
      row.insertCell().textContent = item.url;
      
      // Show phishing status and color it red/green
      const phishingStatusCell = row.insertCell();
      phishingStatusCell.textContent = item.checkResult.phishing;  // Show phishing status
      phishingStatusCell.style.color = item.checkResult.phishing === "Unsafe" ? "red" : "green";
      // Show the merged SSL status
      const sslStatusCell = row.insertCell();
      sslStatusCell.textContent = item.checkResult.ssl;  // Show "Valid until" or "Invalid"
      sslStatusCell.style.color = item.checkResult.ssl.startsWith('Valid') ? "green" : "red";  // Color the cell based on status
    });
  })
  .catch(error => {
    console.error('Error fetching site checks:', error);
  });