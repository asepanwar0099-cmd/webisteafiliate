// State
let products = [];
let cart = [];
let currentUser = null;

// DOM Elements (initialized after DOMContentLoaded to avoid null refs)
let productGrid, categoryFilter, cartItemsContainer, cartCount, cartTotalPrice, btnCheckout, authBtnContainer, adminLinkContainer;

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

document.addEventListener('DOMContentLoaded', async () => {
    // initialize DOM refs
    productGrid = document.getElementById('productGrid');
    categoryFilter = document.getElementById('categoryFilter');
    cartItemsContainer = document.getElementById('cartItems');
    cartCount = document.getElementById('cartCount');
    cartTotalPrice = document.getElementById('cartTotalPrice');
    btnCheckout = document.getElementById('btnCheckout');
    authBtnContainer = document.getElementById('authBtnContainer');
    adminLinkContainer = document.getElementById('adminLinkContainer');

    await checkAuth();
    fetchProducts();
    loadCartFromStorage();
    setupCartListeners();
});

function isStaticFallback() {
    return window.location.hostname.endsWith('.github.io') || window.location.hostname.includes('github.dev') || window.location.protocol === 'file:';
}

function loadStaticUsers() {
    const raw = localStorage.getItem('webAuthUsers');
    try {
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
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

function staticLogout() {
    setStaticCurrentUser(null);
}

function renderAuthButtons(data) {
    if (!data || !data.loggedIn) return;

    currentUser = data;
    authBtnContainer.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-outline-pink btn-sm rounded-pill px-3 dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i class="fas fa-user-circle"></i> Hai, ${data.identifier.split('@')[0]}
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                <li><a class="dropdown-item" href="#" id="btnLogout"><i class="fas fa-sign-out-alt text-danger"></i> Keluar</a></li>
            </ul>
        </div>
    `;

    if (data.role === 'admin') {
        adminLinkContainer.style.display = 'block';
    }

    document.getElementById('btnLogout').addEventListener('click', async (e) => {
        e.preventDefault();
        if (isStaticFallback()) {
            staticLogout();
            window.location.reload();
            return;
        }

        await fetch('api/auth.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });
        window.location.reload();
    });
}

// Check Authentication State
async function checkAuth() {
    if (isStaticFallback()) {
        const user = getStaticCurrentUser();
        if (user) {
            renderAuthButtons({ loggedIn: true, identifier: user.identifier, role: user.role });
        }
        return;
    }

    try {
        const res = await fetch('api/auth.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check' })
        });
        const data = await res.json();
        
        if (data.loggedIn) {
            renderAuthButtons(data);
        }
    } catch (err) {
        console.error('Auth check failed', err);
        const user = getStaticCurrentUser();
        if (user) {
            renderAuthButtons({ loggedIn: true, identifier: user.identifier, role: user.role });
        }
    }
}

// Fetch Products
async function fetchProducts() {
    // Try server API first, then fallback to static products.json for hosting on GitHub Pages
    try {
        let response;
        try {
            response = await fetch('api/products.php');
            if (!response.ok) throw new Error('api/products.php returned ' + response.status);
            products = await response.json();
        } catch (err) {
            // fallback to static JSON
            console.warn('Falling back to products.json:', err.message || err);
            response = await fetch('products.json');
            if (!response.ok) throw new Error('products.json returned ' + response.status);
            products = await response.json();
        }

        // Ensure numeric price and tags array for rendering
        products = products.map(p => ({ ...p, price: Number(p.price) || 0, tags: Array.isArray(p.tags) ? p.tags : [] }));
        renderCategories();
        renderProducts('all');
    } catch (error) {
        console.error('Failed to fetch products:', error);
        const msg = `<div class="col-12 text-center text-danger">Gagal memuat produk: ${error.message || 'Unknown error'}</div>`;
        if (productGrid) productGrid.innerHTML = msg;
        else alert('Gagal memuat produk: ' + (error.message || error));
    }
}

function renderCategories() {
    const categories = new Set(products.map(p => p.category));
    let html = `<button class="btn btn-outline-pink active rounded-pill px-4" data-filter="all">Semua Koleksi</button>`;
    
    categories.forEach(cat => {
        html += `<button class="btn btn-outline-pink rounded-pill px-4" data-filter="${cat}">${cat}</button>`;
    });
    
    categoryFilter.innerHTML = html;
    
    const buttons = categoryFilter.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(e.target.dataset.filter);
        });
    });
}

function renderProducts(filter) {
    let filteredProducts = filter === 'all' ? products : products.filter(p => p.category === filter);
    filteredProducts.sort((a, b) => (b.isPinned === true) - (a.isPinned === true));

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<div class="col-12 text-center text-muted">Belum ada koleksi di kategori ini.</div>';
        return;
    }

    productGrid.innerHTML = filteredProducts.map(p => `
        <div class="col-12 col-sm-6 col-lg-4 col-xl-3 animate-fade-up">
            <div class="card product-card glass-panel h-100">
                ${p.isPinned ? '<div class="pin-badge"><i class="fas fa-heart text-danger"></i> Pilihan Utama</div>' : ''}
                <img src="${p.image}" class="card-img-top product-img-top" alt="${p.title}" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=Gambar+Tidak+Tersedia'">
                <div class="card-body d-flex flex-column">
                    <div class="mb-2">
                        ${p.tags.map(tag => `<span class="badge badge-tag me-1 mb-1">#${tag}</span>`).join('')}
                    </div>
                    <h5 class="card-title fw-bold text-dark">${p.title}</h5>
                    <p class="card-text text-muted small flex-grow-1">${p.description}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                        <span class="price-tag">${formatRupiah(p.price)}</span>
                        ${p.isAffiliate 
                            ? `<a href="${p.affiliateLink}" target="_blank" onclick="trackClick()" class="btn btn-shopee btn-sm px-3 fw-bold"><i class="fas fa-shopping-cart"></i> Beli di Shopee</a>`
                            : `<button class="btn btn-pink btn-sm px-3 fw-bold shadow-sm" onclick="addToCart('${p.id}')"><i class="fas fa-plus"></i> Keranjang</button>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Cart Logic
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    
    saveCart();
    updateCartUI();
    
    // Use Bootstrap offcanvas API to open drawer
    const cartOffcanvas = new bootstrap.Offcanvas(document.getElementById('cartDrawer'));
    cartOffcanvas.show();
}

function updateCartQty(productId, delta) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        cart[itemIndex].qty += delta;
        if (cart[itemIndex].qty <= 0) cart.splice(itemIndex, 1);
        saveCart();
        updateCartUI();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function saveCart() { localStorage.setItem('craftgift_cart', JSON.stringify(cart)); }

function loadCartFromStorage() {
    const stored = localStorage.getItem('craftgift_cart');
    if (stored) { cart = JSON.parse(stored); updateCartUI(); }
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-muted mt-5"><i class="fas fa-box-open fs-1 mb-3"></i><br>Keranjang Anda masih kosong.</p>';
        cartTotalPrice.textContent = 'Rp 0';
        return;
    }

    let html = '';
    let total = 0;
    
    cart.forEach(item => {
        total += item.price * item.qty;
        html += `
            <div class="d-flex gap-3 mb-3 pb-3 border-bottom align-items-center">
                <img src="${item.image}" alt="${item.title}" class="rounded" style="width: 70px; height: 70px; object-fit: cover;">
                <div class="flex-grow-1">
                    <h6 class="mb-1 fw-bold text-truncate" style="max-width: 180px;">${item.title}</h6>
                    <div class="text-danger fw-bold small">${formatRupiah(item.price)}</div>
                    <div class="d-flex align-items-center mt-2 gap-2">
                        <button class="btn btn-sm btn-light border" onclick="updateCartQty('${item.id}', -1)">-</button>
                        <span class="fw-bold">${item.qty}</span>
                        <button class="btn btn-sm btn-light border" onclick="updateCartQty('${item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="btn btn-link text-danger p-0" onclick="removeFromCart('${item.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = html;
    cartTotalPrice.textContent = formatRupiah(total);
}

function setupCartListeners() {
    btnCheckout.addEventListener('click', () => {
        if (!currentUser && cart.length > 0) {
            alert('Mohon login terlebih dahulu untuk melakukan checkout.');
            window.location.href = 'auth.html';
            return;
        }

        if (cart.length === 0) {
            alert('Keranjang kosong!');
            return;
        }
        
        let message = `Halo Craft & Gift! Saya ${currentUser.identifier.split('@')[0]} ingin memesan:\n\n`;
        let total = 0;
        
        cart.forEach((item, index) => {
            message += `${index + 1}. ${item.title} (x${item.qty})\n`;
            total += item.price * item.qty;
        });
        
        message += `\nTotal: ${formatRupiah(total)}\n\nMohon info pembayaran. Terima kasih.`;
        window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(message)}`, '_blank');
    });
}

// Analytics Tracker
async function trackClick(url) {
    try {
        await fetch('api/analytics.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'track_click' })
        });
    } catch(e) {
        console.error('Tracking failed', e);
    }
    // Return true so link navigation continues
    return true;
}
