document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');
    const toggleAdminCodeBtn = document.getElementById('toggleAdminCode');
    const adminCodeWrapper = document.getElementById('adminCodeWrapper');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const API_AUTH_URL = new URL('api/auth.php', window.location.href).href;

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const faIcon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                faIcon.classList.remove('fa-eye');
                faIcon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                faIcon.classList.remove('fa-eye-slash');
                faIcon.classList.add('fa-eye');
            }
        });
    });

    // Toggle Admin Code Input
    if (toggleAdminCodeBtn) {
        toggleAdminCodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adminCodeWrapper.classList.toggle('d-none');
        });
    }

    const API_AUTH_URL = './api/auth.php';

    function showAlert(message, type = 'danger') {
        authAlert.className = `alert alert-${type} animate-fade-up`;
        authAlert.textContent = message;
        authAlert.classList.remove('d-none');
    }

    async function authPost(payload) {
        try {
            const res = await fetch(API_AUTH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error(`Respons server tidak valid: ${text || 'Kosong'}`);
            }

            if (!res.ok) {
                const serverError = data.error || data.message || res.statusText || 'Server error';
                throw new Error(`Server auth gagal: ${serverError}`);
            }

            return data;
        } catch (err) {
            if (err instanceof TypeError || err.message.toLowerCase().includes('failed to fetch') || err.message.toLowerCase().includes('networkerror')) {
                throw new Error('Terjadi kesalahan koneksi. Pastikan aplikasi dijalankan pada server PHP dan file api/auth.php tersedia.');
            }
            throw err;
        }
    }

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginId').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const data = await authPost({ action: 'login', identifier, password });
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error || 'Login gagal.');
            }
        } catch (err) {
            showAlert(err.message);
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('regId').value;
        const password = document.getElementById('regPassword').value;
        const adminCode = document.getElementById('regAdminCode').value;

        try {
            const data = await authPost({ action: 'register', identifier, password, adminCode });
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error || 'Pendaftaran gagal.');
            }
        } catch (err) {
            showAlert(err.message);
        }
    });

    // Forgot Password Simulation
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const identifier = prompt("Masukkan Email / No. HP Anda untuk reset password:");
        if (!identifier) return;

        const newPassword = prompt("Masukkan password baru Anda:");
        if (!newPassword) return;

        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'forgot_password', identifier, newPassword })
            });
            const data = await res.json();
            
            if (data.success) {
                showAlert(data.message, 'success');
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi.');
        }
    });

});
