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
  'Safe (Safe Browsing)': true,
  'Unsafe (Safe Browsing)': true,
  'Valid (SSL)': true,
  'Invalid (SSL)': true,
  'Safe (ML)': true,
  'Unsafe (ML)': true
};
let selectedSegments = new Set();
let justReset = false;
const baseColors = [
  '#66BB6A', '#EF5350', '#4CAF50', '#F44336', '#81C784', '#D32F2F'
];

// Send GET request to fetch all site check records for the logged in user
fetch('https://web-app-j994.onrender.com/api/getAllSiteChecks', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`, // Use JWT for secure access
    'Content-Type': 'application/json',
  },
})
  .then(response => {
    // If unautherodised or session expired request a relog
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
    // Store scan data and render into ui components
    allScans = data;
    renderTable(allScans);
    renderChart(allScans);
    initColumnResize();
    initColumnSort();
    initStickyHeaders();
  })
  .catch(error => {
    // Fallback protocol to show error message in the table if fetch fails
    console.error('Error fetching site checks:', error);
    const table = document.getElementById('siteCheckTable').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    row.insertCell().textContent = 'Error loading scans.';
    row.cells[0].colSpan = 5;
  });

function filterScans() {
  if (selectedSegments.size === 0) {
    return allScans.filter(scan => {
      const phishingMatch = (visibleSegments['Safe (Safe Browsing)'] && scan.checkResult.phishing === 'Safe') ||
                           (visibleSegments['Unsafe (Safe Browsing)'] && scan.checkResult.phishing === 'Unsafe');
      const sslMatch = (visibleSegments['Valid (SSL)'] && scan.checkResult.ssl.startsWith('Valid')) ||
                       (visibleSegments['Invalid (SSL)'] && !scan.checkResult.ssl.startsWith('Valid'));
      const mlMatch = (visibleSegments['Safe (ML)'] && scan.checkResult.mlPrediction === 'Safe') ||
                      (visibleSegments['Unsafe (ML)'] && scan.checkResult.mlPrediction === 'Unsafe');
      return phishingMatch && sslMatch && mlMatch;
    });
  } else {
    return allScans.filter(scan => {
      return (
        (selectedSegments.has('Safe (Safe Browsing)') && scan.checkResult.phishing === 'Safe') ||
        (selectedSegments.has('Unsafe (Safe Browsing)') && scan.checkResult.phishing === 'Unsafe') ||
        (selectedSegments.has('Valid (SSL)') && scan.checkResult.ssl.startsWith('Valid')) ||
        (selectedSegments.has('Invalid (SSL)') && !scan.checkResult.ssl.startsWith('Valid')) ||
        (selectedSegments.has('Safe (ML)') && scan.checkResult.mlPrediction === 'Safe') ||
        (selectedSegments.has('Unsafe (ML)') && scan.checkResult.mlPrediction === 'Unsafe')
      );
    });
  }
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
    
    // Insert a new cell to current table row for VirusTotal result
    const vtCell = row.insertCell();

    // Get the number of posative detections and total scans from data retrieved from DB
    const positives = item.virusTotalStats?.positives ?? 0;
    const total = item.virusTotalStats?.total ?? 0;

    // Default values if no scan was performed using VirusTotal for this URL
    let vtText = 'Not Scanned';
    let vtColor = 'gray';
    let tooltip = 'No scan was performed using VirusTotal.';

    // If a scan result exists, determin the verdict from number of detections
    if (item.checkResult.virusTotal && item.checkResult.virusTotal !== 'Not Scanned') {
      // 0 detections means it is safe
      if (positives === 0) {
        vtText = `Safe (0/${total})`;
        vtColor = 'green';
        tooltip = '0 engines flagged this site as malicious.';
      // If there are between 1 and 5 detections it is a suspicious URL (according to VirusTotal)
      } else if (positives > 0 && positives < 5) {
        vtText = `Suspicious (${positives}/${total})`;
        vtColor = 'orange';
        tooltip = `${positives} out of ${total} engines flagged this site as suspicious.`;
        // More than 5 detections is likely unsafe.
      } else {
        vtText = `Unsafe (${positives}/${total})`;
        vtColor = 'red';
        // Add tooltip to explain to user on mouse hover
        tooltip = `${positives} out of ${total} engines flagged this site as unsafe.`;
      }
    }

    // Create a tooltip container to display text as VirusTotal details are more complex
    vtCell.innerHTML = `
    <span class="tooltip-container" style="color: ${vtColor};">
      ${vtText}
      <span class="tooltip-text">${tooltip}</span>
    </span>
  `;

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
    Safe Browsing: ${item.checkResult.phishing}
    SSL: ${item.checkResult.ssl}
    ML Prediction: ${item.checkResult.mlPrediction || 'N/A'}
    VirusTotal: ${item.checkResult.virusTotal || 'Unknown'}
    ${item.virusTotalStats ? `Detections: ${item.virusTotalStats.positives}/${item.virusTotalStats.total}` : ''}
    Scanned On: ${new Date(item.date).toLocaleString()}
    ${item.validUntil ? `SSL Valid Until: ${new Date(item.validUntil).toLocaleString()}` : ''}
  `;
  alert(details);
}

// function sortTable(column, asc = true) {
//   const filtered = filterScans();
//   const sorted = filtered.sort((a, b) => {
//     const valuesA = [a.url, a.checkResult.phishing, a.checkResult.ssl, a.checkResult.mlPrediction || 'N/A'];
//     const valueA = valuesA[column];
//     const valueB = column === 0 ? b.url : 
//                    column === 1 ? b.checkResult.phishing : 
//                    column === 2 ? b.checkResult.ssl : 
//                    b.checkResult.mlPrediction || 'N/A';
//     return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
//   });
//   renderTable(sorted);
//   renderChart(sorted);
// }

function sortTable(column, asc = true) {
  const filtered = filterScans();
  const sorted = filtered.sort((a, b) => {
    let valueA, valueB;

    switch (column) {
      case 0:
        valueA = a.url;
        valueB = b.url;
        break;
      case 1:
        valueA = a.checkResult.phishing;
        valueB = b.checkResult.phishing;
        break;
      case 2:
        valueA = a.checkResult.ssl;
        valueB = b.checkResult.ssl;
        break;
      case 3:
        valueA = a.checkResult.mlPrediction || 'N/A';
        valueB = b.checkResult.mlPrediction || 'N/A';
        break;
      case 4:
        const posA = a.virusTotalStats?.positives ?? 0;
        const posB = b.virusTotalStats?.positives ?? 0;
        valueA = posA;
        valueB = posB;
        break;
      default:
        valueA = '';
        valueB = '';
    }

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return asc ? valueA - valueB : valueB - valueA;
    } else {
      return asc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    }
  });

  renderTable(sorted);
  renderChart(sorted);
}

function initColumnSort() {
  document.getElementById('siteCheckTable').querySelectorAll('th .sort-text').forEach((text, index) => {
    text.addEventListener('click', (e) => {
      e.stopPropagation();
      const header = text.parentElement;
      const isAscending = header.classList.toggle('asc');
      sortTable(index, isAscending);
    });
  });
}

document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = filterScans().filter(scan => scan.url.toLowerCase().includes(searchTerm));
  renderTable(filtered);
  renderChart(filtered);
});

function resetFilters(e) {
  e.preventDefault();
  selectedSegments.clear();
  chartInstance.data.labels.forEach(label => selectedSegments.add(label));
  justReset = true;
  chartInstance.data.datasets[0].backgroundColor = baseColors;
  chartInstance.data.datasets[0].data.forEach((_, i) => {
    chartInstance.setDatasetVisibility(0, true);
  });
  chartInstance.update();
  document.getElementById('resetLink').style.display = 'none';
  const filtered = filterScans();
  renderTable(filtered);
}

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
      labels: ['Safe (Safe Browsing)', 'Unsafe (Safe Browsing)', 'Valid (SSL)', 'Invalid (SSL)', 'Safe (ML)', 'Unsafe (ML)'],
      datasets: [{
        label: 'Site Check Results',
        data: [safePhishing, unsafePhishing, validSSL, invalidSSL, safeML, unsafeML],
        backgroundColor: baseColors.map((color, i) => 
          selectedSegments.has(chartInstance?.data.labels[i]) || selectedSegments.size === 0 ? color : `${color}4D`
        ),
        borderColor: baseColors,
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
            selectedSegments.clear();
            justReset = false;
            chartInstance.data.datasets[0].backgroundColor = baseColors;
            chartInstance.update();
            document.getElementById('resetLink').style.display = 'none';
            const filtered = filterScans();
            renderTable(filtered);
          }
        },
        title: { display: true, text: 'Site Check Overview' }
      },
      onClick: (e, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const clickedLabel = chartInstance.data.labels[index];
          
          if (justReset && selectedSegments.size === chartInstance.data.labels.length) {
            selectedSegments.clear();
            selectedSegments.add(clickedLabel);
            justReset = false;
          } else {
            if (selectedSegments.has(clickedLabel)) {
              selectedSegments.delete(clickedLabel);
            } else {
              selectedSegments.add(clickedLabel);
            }
          }

          chartInstance.data.datasets[0].backgroundColor = baseColors.map((color, i) => 
            selectedSegments.has(chartInstance.data.labels[i]) || selectedSegments.size === 0 ? color : `${color}4D`
          );
          chartInstance.data.datasets[0].data.forEach((_, i) => {
            chartInstance.setDatasetVisibility(0, true);
          });
          chartInstance.update();
          document.getElementById('resetLink').style.display = selectedSegments.size < chartInstance.data.labels.length ? 'block' : 'none';
          const filtered = filterScans();
          renderTable(filtered);
        }
      }
    }
  });

  document.getElementById('resetLink').addEventListener('click', resetFilters);
}

function initColumnResize() {
  const table = document.getElementById('siteCheckTable');
  const headers = Array.from(table.querySelectorAll('th'));
  let thBeingResized = null;
  let nextTh = null;
  let startX = 0;
  let startWidthLeft = 0;
  let startWidthRight = 0;

  headers.slice(0, 5).forEach((th, index) => { 
    const handle = th.querySelector('.resize-handle');
    if (!handle) return;
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      thBeingResized = th;
      nextTh = index < 4 ? headers[index + 1] : null; // Only resize up to 4th column's right edge
      if (!nextTh) return;
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

    if (newWidthLeft >= 100 && newWidthRight >= 100) {
      thBeingResized.style.width = `${newWidthLeft}px`;
      nextTh.style.width = `${newWidthRight}px`;
      syncFixedHeaderWidths();
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

function initStickyHeaders() {
  const table = document.getElementById('siteCheckTable');
  const originalThead = table.querySelector('thead');
  const clonedThead = originalThead.cloneNode(true);
  clonedThead.classList.add('fixed-thead');
  
  clonedThead.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
  
  document.body.appendChild(clonedThead);
  syncFixedHeaderWidths();

  window.addEventListener('scroll', () => {
    const tableRect = table.getBoundingClientRect();
    const theadRect = originalThead.getBoundingClientRect();
    
    if (theadRect.top <= 0 && tableRect.bottom > 0) {
      clonedThead.style.display = 'table-header-group';
      clonedThead.style.left = `${tableRect.left}px`;
      clonedThead.style.width = `${tableRect.width}px`;
    } else {
      clonedThead.style.display = 'none';
    }
  });

  window.addEventListener('resize', syncFixedHeaderWidths);
}

function syncFixedHeaderWidths() {
  const table = document.getElementById('siteCheckTable');
  const tableRect = table.getBoundingClientRect();
  const originalThs = table.querySelectorAll('thead th');
  const fixedThs = document.querySelectorAll('.fixed-thead th');
  
  originalThs.forEach((th, index) => {
    const width = th.offsetWidth;
    fixedThs[index].style.width = `${width}px`;
  });
  const fixedThead = document.querySelector('.fixed-thead');
  fixedThead.style.left = `${tableRect.left}px`;
  fixedThead.style.width = `${tableRect.width}px`;
}