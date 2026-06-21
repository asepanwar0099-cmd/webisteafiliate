document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');
    const toggleAdminCodeBtn = document.getElementById('toggleAdminCode');
    const adminCodeWrapper = document.getElementById('adminCodeWrapper');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

    function showAlert(message, type = 'danger') {
        if (!authAlert) return;
        authAlert.className = `alert alert-${type} animate-fade-up`;
        authAlert.textContent = message;
        authAlert.classList.remove('d-none');
    }

    // Firebase Auth instance injected by auth.html (window.__FIREBASE_AUTH__)
    const auth = window.__FIREBASE_AUTH__;
    if (!auth) {
        showAlert('Firebase Auth belum ter-inisialisasi. Pastikan auth.html memuat Firebase SDK dan config benar.', 'danger');
        return;
    }

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function () {
            const input = this.previousElementSibling;
            const faIcon = this.querySelector('i');
            if (!input || !faIcon) return;

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
    if (toggleAdminCodeBtn && adminCodeWrapper) {
        toggleAdminCodeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            adminCodeWrapper.classList.toggle('d-none');
        });
    }

    // Import Firebase functions from global window modules loaded in auth.html
    // We use dynamic import so js/auth.js can stay plain <script> (not module) if needed.
    async function getFirebaseFns() {
        const [{ signInWithEmailAndPassword }, { createUserWithEmailAndPassword }, { sendPasswordResetEmail }] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js')
        ]);

        return { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail };
    }

    // Login Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginId')?.value?.trim() || '';
            const password = document.getElementById('loginPassword')?.value || '';

            if (!email || !password) {
                showAlert('Email dan password wajib diisi.');
                return;
            }

            try {
                const { signInWithEmailAndPassword } = await getFirebaseFns();
                await signInWithEmailAndPassword(auth, email, password);

                // Firebase Auth tidak otomatis memberi role.
                // Keputusan admin/pelanggan hanya berdasarkan "kode admin" di form register,
                // jadi pada login kita arahkan ke index.html.
                window.location.href = 'index.html';
            } catch (err) {
                showAlert(err?.message || 'Login gagal.', 'danger');
            }
        });
    }

    // Register Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regId')?.value?.trim() || '';
            const password = document.getElementById('regPassword')?.value || '';
            const adminCode = document.getElementById('regAdminCode')?.value?.trim() || '';

            if (!email || !password) {
                showAlert('Email dan password wajib diisi.');
                return;
            }

            // Role handling: simpan flag role sederhana di localStorage
            // (lebih aman untuk produksi via backend/Firestore, tapi ini agar tidak putus fitur)
            const role = adminCode === 'ADMINPINK2026' ? 'admin' : 'customer';
            if (adminCode !== '' && role !== 'admin') {
                showAlert('Kode Admin salah.', 'danger');
                return;
            }

            try {
                const { createUserWithEmailAndPassword } = await getFirebaseFns();
                await createUserWithEmailAndPassword(auth, email, password);

                localStorage.setItem('role', role);
                window.location.href = role === 'admin' ? 'admin.html' : 'index.html';
            } catch (err) {
                showAlert(err?.message || 'Pendaftaran gagal.', 'danger');
            }
        });
    }

    // Forgot Password (Firebase flow: email reset link)
    // Catatan: Firebase tidak bisa langsung set password baru dari UI tanpa reset link.
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = prompt("Masukkan email Anda untuk reset password:");
            if (!email) return;

            try {
                const { sendPasswordResetEmail } = await getFirebaseFns();
                await sendPasswordResetEmail(auth, email);
                showAlert('Link reset password sudah dikirim ke email Anda.', 'success');
            } catch (err) {
                showAlert(err?.message || 'Reset password gagal.', 'danger');
            }
        });
    }
});
