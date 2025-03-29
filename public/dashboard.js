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

document.getElementById('usernameDisplay').textContent = (userId || 'User').replace(/^\w/, c => c.toUpperCase());

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  window.location.href = 'login.html';
}

let allScans = [];
let chartInstance = null;
let visibleSegments = {
  'Safe (Phishing)': true,
  'Unsafe (Phishing)': true,
  'Valid (SSL)': true,
  'Invalid (SSL)': true,
  'Safe (ML)': true,
  'Unsafe (ML)': true
};

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
    renderChart(allScans);
    initColumnResize();
  })
  .catch(error => {
    console.error('Error fetching site checks:', error);
    const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    row.insertCell().textContent = 'Error loading scans.';
    row.cells[0].colSpan = 5;
  });

function filterScans() {
  return allScans.filter(scan => {
    const phishingMatch = (visibleSegments['Safe (Phishing)'] && scan.checkResult.phishing === 'Safe') ||
                         (visibleSegments['Unsafe (Phishing)'] && scan.checkResult.phishing === 'Unsafe');
    const sslMatch = (visibleSegments['Valid (SSL)'] && scan.checkResult.ssl.startsWith('Valid')) ||
                     (visibleSegments['Invalid (SSL)'] && !scan.checkResult.ssl.startsWith('Valid'));
    const mlMatch = (visibleSegments['Safe (ML)'] && scan.checkResult.mlPrediction === 'Safe') ||
                    (visibleSegments['Unsafe (ML)'] && scan.checkResult.mlPrediction === 'Unsafe');
    return phishingMatch && sslMatch && mlMatch;
  });
}

function renderTable(data) {
  const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
  table.innerHTML = '';

  if (data.length === 0) {
    const row = table.insertRow();
    row.insertCell().textContent = 'No scans match the current filter.';
    row.cells[0].colSpan = 5;
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
    const mlCell = row.insertCell();
    mlCell.textContent = item.checkResult.mlPrediction || 'N/A';
    mlCell.style.color = item.checkResult.mlPrediction === 'Unsafe' ? 'red' : 'green';
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
    ML Prediction: ${item.checkResult.mlPrediction || 'N/A'}
    Scanned On: ${new Date(item.date).toLocaleString()}
    ${item.validUntil ? `SSL Valid Until: ${new Date(item.validUntil).toLocaleString()}` : ''}
  `;
  alert(details);
}

document.getElementById('siteCheckTable').querySelectorAll('th').forEach((header, index) => {
  header.addEventListener('click', (e) => {
    if (!e.target.classList.contains('resize-handle')) {
      const isAscending = header.classList.toggle('asc');
      sortTable(index, isAscending);
    }
  });
});

function sortTable(column, asc = true) {
  const filtered = filterScans();
  const sorted = filtered.sort((a, b) => {
    const valuesA = [a.url, a.checkResult.phishing, a.checkResult.ssl, a.checkResult.mlPrediction || 'N/A'];
    const valueA = valuesA[column];
    const valueB = column === 0 ? b.url : 
                   column === 1 ? b.checkResult.phishing : 
                   column === 2 ? b.checkResult.ssl : 
                   b.checkResult.mlPrediction || 'N/A';
    return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });
  renderTable(sorted);
  renderChart(sorted);
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = filterScans().filter(scan => scan.url.toLowerCase().includes(searchTerm));
  renderTable(filtered);
  renderChart(filtered);
});

function renderChart(data) {
  const ctx = document.getElementById('phishingChart').getContext('2d');
  const safePhishing = data.filter(scan => scan.checkResult.phishing === 'Safe').length;
  const unsafePhishing = data.filter(scan => scan.checkResult.phishing === 'Unsafe').length;
  const validSSL = data.filter(scan => scan.checkResult.ssl.startsWith('Valid')).length;
  const invalidSSL = data.filter(scan => !scan.checkResult.ssl.startsWith('Valid')).length;
  const safeML = data.filter(scan => scan.checkResult.mlPrediction === 'Safe').length;
  const unsafeML = data.filter(scan => scan.checkResult.mlPrediction === 'Unsafe').length;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Safe (Phishing)', 'Unsafe (Phishing)', 'Valid (SSL)', 'Invalid (SSL)', 'Safe (ML)', 'Unsafe (ML)'],
      datasets: [{
        label: 'Site Check Results',
        data: [safePhishing, unsafePhishing, validSSL, invalidSSL, safeML, unsafeML],
        backgroundColor: ['#4CAF50', '#FF6384', '#4CAF50', '#FF6384', '#4CAF50', '#FF6384'],
        borderColor: ['#4CAF50', '#FF6384', '#4CAF50', '#FF6384', '#4CAF50', '#FF6384'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          onClick: (e, legendItem) => {
            const index = legendItem.index;
            const label = chartInstance.data.labels[index];
            visibleSegments[label] = !visibleSegments[label];
            chartInstance.toggleDataVisibility(index);
            chartInstance.update();
            const filtered = filterScans();
            renderTable(filtered);
          }
        },
        title: { display: true, text: 'Site Check Overview' }
      }
    }
  });
}

function initColumnResize() {
  const table = document.getElementById('siteCheckTable');
  const headers = Array.from(table.querySelectorAll('th'));
  let thBeingResized = null;
  let nextTh = null;
  let startX = 0;
  let startWidthLeft = 0;
  let startWidthRight = 0;

  headers.forEach((th, index) => {
    const handle = th.querySelector('.resize-handle');
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      thBeingResized = th; // Left column
      nextTh = index < headers.length - 1 ? headers[index + 1] : null; // Right column, null for last handle
      if (!nextTh) return; // Skip if last column (no right neighbor)
      startX = e.pageX;
      startWidthLeft = thBeingResized.offsetWidth;
      startWidthRight = nextTh.offsetWidth;
      document.addEventListener('mousemove', resizeColumn);
      document.addEventListener('mouseup', stopResize);
    });
  });

  function resizeColumn(e) {
    if (!thBeingResized || !nextTh) return;
    const delta = e.pageX - startX;
    const newWidthLeft = startWidthLeft + delta;
    const newWidthRight = startWidthRight - delta;

    if (newWidthLeft >= 100 && newWidthRight >= 100) { // 100px minimum for both
      thBeingResized.style.width = `${newWidthLeft}px`;
      nextTh.style.width = `${newWidthRight}px`;
    }
  }

  function stopResize(e) {
    e.stopPropagation();
    thBeingResized = null;
    nextTh = null;
    document.removeEventListener('mousemove', resizeColumn);
    document.removeEventListener('mouseup', stopResize);
  }
}