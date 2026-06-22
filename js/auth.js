document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');
    const toggleAdminCodeBtn = document.getElementById('toggleAdminCode');
    const adminCodeWrapper = document.getElementById('adminCodeWrapper');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

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

    function showAlert(message, type = 'danger') {
        authAlert.className = `alert alert-${type} animate-fade-up`;
        authAlert.textContent = message;
        authAlert.classList.remove('d-none');
    }

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginId').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', identifier, password })
            });
            const data = await res.json();
            
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi.');
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('regId').value;
        const password = document.getElementById('regPassword').value;
        const adminCode = document.getElementById('regAdminCode').value;

        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register', identifier, password, adminCode })
            });
            const data = await res.json();
            
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi.');
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
                credentials: 'include',
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
