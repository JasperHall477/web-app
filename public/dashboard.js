const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

console.log("Token: ", token);
console.log("UserID: ", userId);

if (!token) {
  window.location.href = 'login.html';
} else if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.sync.set({ token, userId }, () => {
    console.log('Synced token and userId to chrome.storage from dashboard');
  });
}

//document.getElementById('usernameDisplay').textContent = userId || 'User';
document.getElementById('usernameDisplay').textContent = (userId || 'User').replace(/^\w/, c => c.toUpperCase());

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  window.location.href = 'login.html';
}

let allScans = [];
let chartInstance = null; // Store chart instance to update it

//fetch('http://localhost:3000/api/getAllSiteChecks', {
fetch('https://web-app-j994.onrender.com/api/getAllSiteChecks', {
  
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})
  .then(response => {
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        alert('Session expired or invalid. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
      }
      throw new Error('Failed to fetch site checks');
    }
    return response.json();
  })
  .then(data => {
    allScans = data;
    renderTable(allScans);
    renderChart(allScans); // Render chart after fetch
  })
  .catch(error => {
    console.error('Error fetching site checks:', error);
    const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    row.insertCell().textContent = 'Error loading scans.';
    row.cells[0].colSpan = 4;
  });

function renderTable(data) {
  const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';

  if (data.length === 0) {
    const row = table.insertRow();
    row.insertCell().textContent = 'No scans yet.';
    row.cells[0].colSpan = 4;
    return;
  }

  data.forEach(item => {
    const row = table.insertRow();
    row.insertCell().textContent = item.url;
    const phishingCell = row.insertCell();
    phishingCell.textContent = item.checkResult.phishing;
    phishingCell.style.color = item.checkResult.phishing === 'Unsafe' ? 'red' : 'green';
    const sslCell = row.insertCell();
    sslCell.textContent = item.checkResult.ssl;
    sslCell.style.color = item.checkResult.ssl.startsWith('Valid') ? 'green' : 'red';
    const detailsCell = row.insertCell();
    const detailsBtn = document.createElement('button');
    detailsBtn.textContent = 'Details';
    detailsBtn.onclick = () => showDetails(item);
    detailsCell.appendChild(detailsBtn);
  });
}

function showDetails(item) {
  const details = `
    URL: ${item.url}
    Phishing: ${item.checkResult.phishing}
    SSL: ${item.checkResult.ssl}
    Scanned On: ${new Date(item.date).toLocaleString()}
    ${item.validUntil ? `SSL Valid Until: ${new Date(item.validUntil).toLocaleString()}` : ''}
  `;
  alert(details);
}

document.getElementById('siteCheckTable').querySelectorAll('th').forEach((header, index) => {
  header.addEventListener('click', () => {
    const isAscending = header.classList.toggle('asc');
    sortTable(index, isAscending);
  });
});

function sortTable(column, asc = true) {
  const sorted = [...allScans].sort((a, b) => {
    const valuesA = [a.url, a.checkResult.phishing, a.checkResult.ssl];
    const valueA = valuesA[column];
    const valueB = column === 0 ? b.url : column === 1 ? b.checkResult.phishing : b.checkResult.ssl;
    return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });
  renderTable(sorted);
  renderChart(sorted); // Update chart with sorted/filtered data
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allScans.filter(scan => scan.url.toLowerCase().includes(searchTerm));
  renderTable(filtered);
  renderChart(filtered); // Update chart with filtered data
});

function renderChart(data) {
  const ctx = document.getElementById('phishingChart').getContext('2d');
  const totalSites = data.length;
  const safeSites = data.filter(scan => scan.checkResult.phishing === 'Safe').length;
  const unsafeSites = data.filter(scan => scan.checkResult.phishing === 'Unsafe').length;

  // Destroy previous chart instance if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'pie', // Can switch to 'pie' or 'doughnut' if preferred
    data: {
      labels: ['Safe', 'Unsafe'],
      datasets: [{
        label: 'Phishing Status',
        data: [safeSites, unsafeSites],
        backgroundColor: ['#4CAF50', '#FF6384'], // Green for Safe, Red for Unsafe
        borderColor: ['#4CAF50', '#FF6384'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allows custom size
      plugins: {
        legend: { display: true, position: 'top' }, // Show legend
        title: { display: true, text: 'Safe vs Unsafe Sites' }
      }
    }
  });
}