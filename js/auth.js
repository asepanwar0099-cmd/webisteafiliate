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

    function normalizeIdentifier(identifier) {
        return String(identifier || '').trim().toLowerCase();
    }

    function loadStaticUsers() {
        const raw = localStorage.getItem('webAuthUsers');
        try {
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveStaticUsers(users) {
        localStorage.setItem('webAuthUsers', JSON.stringify(users));
    }

    function getStaticCurrentUser() {
        const raw = localStorage.getItem('webAuthCurrent');
        try {
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function setStaticCurrentUser(user) {
        if (user) {
            localStorage.setItem('webAuthCurrent', JSON.stringify(user));
        } else {
            localStorage.removeItem('webAuthCurrent');
        }
    }

    function isStaticFallback() {
        return window.location.hostname.endsWith('.github.io') || window.location.hostname.includes('github.dev') || window.location.protocol === 'file:';
    }

    function staticRegister(identifier, password, adminCode) {
        identifier = normalizeIdentifier(identifier);
        const users = loadStaticUsers();
        if (users.some(user => user.identifier === identifier)) {
            return { success: false, error: 'Email / No HP sudah terdaftar.' };
        }

        let role = 'customer';
        if (adminCode === 'ADMINPINK2026') {
            role = 'admin';
        } else if (adminCode.trim() !== '') {
            return { success: false, error: 'Kode Admin salah. Kosongkan jika mendaftar sebagai pelanggan.' };
        }

        const newUser = {
            id: 'local_' + Date.now(),
            identifier,
            password,
            role
        };
        users.push(newUser);
        saveStaticUsers(users);
        setStaticCurrentUser({ id: newUser.id, identifier: newUser.identifier, role: newUser.role });

        return { success: true, role };
    }

    function staticLogin(identifier, password) {
        identifier = normalizeIdentifier(identifier);
        const users = loadStaticUsers();
        const user = users.find(u => u.identifier === identifier && u.password === password);
        if (!user) {
            return { success: false, error: 'Kredensial tidak valid.' };
        }

        setStaticCurrentUser({ id: user.id, identifier: user.identifier, role: user.role });
        return { success: true, role: user.role };
    }

    function staticForgotPassword(identifier, newPassword) {
        identifier = normalizeIdentifier(identifier);
        const users = loadStaticUsers();
        const user = users.find(u => u.identifier === identifier);
        if (!user) {
            return { success: false, error: 'Email / No HP tidak ditemukan.' };
        }

        user.password = newPassword;
        saveStaticUsers(users);
        return { success: true, message: 'Password berhasil di-reset. Silakan login.' };
    }

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = normalizeIdentifier(document.getElementById('loginId').value);
        const password = document.getElementById('loginPassword').value;

        if (isStaticFallback()) {
            const data = staticLogin(identifier, password);
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
            return;
        }

        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', identifier, password })
            });

            if (!res.ok) throw new Error('Backend tidak tersedia');
            const data = await res.json();

            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi. Backend PHP tidak ditemukan.');
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = normalizeIdentifier(document.getElementById('regId').value);
        const password = document.getElementById('regPassword').value;
        const adminCode = document.getElementById('regAdminCode').value.trim();

        if (isStaticFallback()) {
            const data = staticRegister(identifier, password, adminCode);
            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
            return;
        }

        try {
            const res = await fetch('api/auth.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'register', identifier, password, adminCode })
            });

            if (!res.ok) throw new Error('Backend tidak tersedia');
            const data = await res.json();

            if (data.success) {
                window.location.href = data.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            showAlert('Terjadi kesalahan koneksi. Backend PHP tidak ditemukan.');
        }
    });

    // Forgot Password Simulation
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const identifier = normalizeIdentifier(prompt("Masukkan Email / No. HP Anda untuk reset password:"));
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

            if (!res.ok) throw new Error('Backend tidak tersedia');
            const data = await res.json();

            if (data.success) {
                showAlert(data.message, 'success');
            } else {
                showAlert(data.error);
            }
        } catch (err) {
            if (isStaticFallback()) {
                const data = staticForgotPassword(identifier, newPassword);
                if (data.success) {
                    showAlert(data.message, 'success');
                } else {
                    showAlert(data.error);
                }
            } else {
                showAlert('Terjadi kesalahan koneksi. Backend PHP tidak ditemukan.');
            }
        }
    });

});
