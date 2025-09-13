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
    
    // Auto-dismiss success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 3000);
    }
}

// Password validation
function validatePassword(password) {
    if (password.length < 6) {
        return 'Password must be at least 6 characters long';
    }
    return null;
}

// Username validation
function validateUsername(username) {
    if (username.length < 3) {
        return 'Username must be at least 3 characters long';
    }
    return null;
}

// Handle form submission with loading state
function setFormLoading(form, isLoading) {
    const button = form.querySelector('button[type="submit"]');
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = button.textContent.includes('Login') ? 'Login' : 'Register';
    }
}

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
    };

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
        showAlert(passwordError);
        return;
    }

    setFormLoading(loginForm, true);

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token to localStorage and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            if (data.errors && Array.isArray(data.errors)) {
                showAlert('Login failed: ' + data.errors.join(', '));
            } else {
                showAlert(data.message || 'Invalid email or password');
            }
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('A network error occurred. Please try again.');
    } finally {
        setFormLoading(loginForm, false);
    }
});

// Handle Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('registerUsername').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value
    };

    // Validate inputs
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
        showAlert(usernameError);
        return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
        showAlert(passwordError);
        return;
    }

    setFormLoading(registerForm, true);

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            // Save token to localStorage and redirect
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showAlert('Registration successful! Redirecting...', 'success');
            setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
        } else {
            // Show detailed error messages
            if (data.errors && Array.isArray(data.errors)) {
                showAlert('Registration failed: ' + data.errors.join(', '));
            } else {
                showAlert(data.message || 'Registration failed. Please try again.');
            }
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('A network error occurred. Please try again.');
    } finally {
        setFormLoading(registerForm, false);
    }
});

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        fetch(`${API_BASE}/auth/user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                // User is already logged in, redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                // Token is invalid, clear it
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        });
    }
});