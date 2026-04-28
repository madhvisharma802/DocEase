// API URL
const API_URL = 'http://localhost:8080/api';

// ============= PAGE NAVIGATION =============
function showLanding() {
    showPage('landingPage');
    loadDoctors();
}

function showLogin() {
    showPage('loginPage');
}

function showRegister() {
    showPage('registerPage');
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ============= LOAD DOCTORS =============
async function loadDoctors() {
    try {
        const response = await fetch(`${API_URL}/doctors`);
        const doctors = await response.json();
        
        const grid = document.getElementById('doctorsGrid');
        if (grid) {
            grid.innerHTML = doctors.map(doctor => `
                <div class="doctor-card">
                    <div class="doctor-icon">👨‍⚕️</div>
                    <h3>${doctor.name}</h3>
                    <p class="doctor-specialty">${doctor.specialization}</p>
                    <p class="doctor-fee">₹${doctor.fee}</p>
                    <p class="doctor-time">⏰ ${doctor.availableTime}</p>
                    <p class="doctor-rating">⭐ ${doctor.rating} (${doctor.reviews} reviews)</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
    }
}

// ============= LOGIN =============
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save user data
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('userName', data.name);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('patientId', data.patientId);
            
            showToast('Login successful!', 'success');
            
            // Redirect based on role
            setTimeout(() => {
                if (data.role === 'PATIENT') {
                    window.location.href = 'patient.html';
                } else if (data.role === 'DOCTOR') {
                    window.location.href = 'doctor.html';
                } else if (data.role === 'ADMIN') {
                    window.location.href = 'admin.html';
                }
            }, 500);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Cannot connect to server. Make sure backend is running!', 'error');
    }
}

// ============= REGISTER =============
async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            setTimeout(() => showLogin(), 1500);
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Cannot connect to server', 'error');
    }
}

// ============= LOGOUT =============
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// ============= TOAST NOTIFICATION =============
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============= CHECK AUTH =============
function checkAuth() {
    const token = localStorage.getItem('userId');
    if (!token) {
        window.location.href = 'index.html';
    }
}

// Load doctors on landing page
if (document.getElementById('doctorsGrid')) {
    loadDoctors();
}