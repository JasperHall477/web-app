// document.getElementById('registerForm').addEventListener('submit', function (event) {
//     event.preventDefault();  // Prevent form from submitting the default way
  
//     const username = document.getElementById('username').value;
//     const password = document.getElementById('password').value;
  
//     // Send registration data to the server
//     fetch('http://localhost:3000/register', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ username, password }),
//     })
//       .then(response => response.json())
//       .then(data => {
//         if (data.message === 'User registered successfully') {
//           document.getElementById('successMessage').style.display = 'block'; // Show success message
//           document.getElementById('errorMessage').style.display = 'none';  // Hide error message
//         } else {
//           document.getElementById('errorMessage').textContent = data.message; // Show error message
//           document.getElementById('errorMessage').style.display = 'block';
//           document.getElementById('successMessage').style.display = 'none';  // Hide success message
//         }
//       })
//       .catch(error => {
//         console.error('Error:', error);
//         document.getElementById('errorMessage').textContent = 'Something went wrong. Please try again.';
//         document.getElementById('errorMessage').style.display = 'block';
//       });
//   });

/*
-=-=-=-=-=-=-=-=-=-=-=-=-=-=
-=-=-=-=-=-=-=-=-=-=-=-=-=-=
-=-=-=-=-=-=-=-=-=-=-=-=-=-=
-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*/
  

document.getElementById('registerForm').addEventListener('submit', function (event) {
    event.preventDefault();  // Prevent form from submitting the default way
  
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    // Send registration data to the server
    fetch('http://localhost:3000/register', {
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
  