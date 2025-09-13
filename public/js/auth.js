const API_BASE = '/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const alertBox = document.getElementById('alertBox');

// Helper function to show alerts
function showAlert(message, type = 'danger') {
    alertBox.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token to localStorage and redirect
            localStorage.setItem('token', data.token);
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            showAlert(data.message);
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('A network error occurred. Please try again.');
    }
});

// Handle Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
    };

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token to localStorage and redirect
            localStorage.setItem('token', data.token);
            showAlert('Registration successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            showAlert(data.message);
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('A network error occurred. Please try again.');
    }
});