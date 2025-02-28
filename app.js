document.getElementById('loadDataButton').addEventListener('click', () => {
    fetch('http://localhost:3000/')
      .then(response => response.text())
      .then(data => {
        document.getElementById('dataDisplay').innerText = data;
      })
      .catch(error => console.error('Error fetching data:', error));
  });
  