// DOM Elements
const adminProductGrid = document.getElementById('adminProductGrid');
const searchProducts = document.getElementById('searchProducts');

// Form Add Elements
const addForm = document.getElementById('addForm');
const addLink = document.getElementById('addLink');
const btnFetchData = document.getElementById('btnFetchData');
const loaderFetch = document.getElementById('loaderFetch');
const addImage = document.getElementById('addImage');
const previewImageAdd = document.getElementById('previewImageAdd');
const addTitle = document.getElementById('addTitle');
const addPrice = document.getElementById('addPrice');
const addCategory = document.getElementById('addCategory');
const addDesc = document.getElementById('addDesc');

let allProducts = [];

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth
    try {
        const res = await fetch('api/auth.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check' })
        });
        const data = await res.json();
        
        if (!data.loggedIn || data.role !== 'admin') {
            alert('Akses Ditolak. Anda bukan Admin.');
            window.location.href = 'index.html';
            return;
        }
    } catch(err) {
        window.location.href = 'index.html';
    }

    // Handle Logout
    document.getElementById('btnAdminLogout').addEventListener('click', async () => {
        await fetch('api/auth.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'logout' })
        });
        window.location.href = 'index.html';
    });

    fetchAdminProducts();
    fetchAnalytics();
});

// Auto-update image preview when URL changes manually
addImage.addEventListener('input', () => {
    const url = addImage.value.trim();
    if (url) {
        previewImageAdd.src = url;
        previewImageAdd.onerror = () => {
            previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Gambar+Tidak+Ditemukan';
        };
    } else {
        previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Preview+Gambar';
    }
});

document.getElementById('editImage').addEventListener('input', (e) => {
    document.getElementById('previewImageEdit').src = e.target.value || 'https://via.placeholder.com/300x300';
});

// Fetch Data from Shopee Link
btnFetchData.addEventListener('click', async () => {
    const link = addLink.value.trim();
    if (!link) return showToast('Masukkan link Shopee terlebih dahulu!', 'warning');
    if (!link.includes('shopee') && !link.includes('shope.ee')) {
        return showToast('Link tidak terdeteksi sebagai link Shopee.', 'danger');
    }

    // Loading state
    loaderFetch.classList.remove('d-none');
    btnFetchData.disabled = true;
    btnFetchData.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Mengambil dari Shopee...';
    previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Mengambil+Gambar...';

    try {
        const res = await fetch('api/process_link.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        const result = await res.json();
        
        if (result.success) {
            const data = result.data;

            // Fill form fields
            addImage.value = data.image;
            addTitle.value = data.title;
            addPrice.value = data.price;
            addCategory.value = data.category;
            addDesc.value = data.description;

            // Load image preview with error handling
            previewImageAdd.onerror = () => {
                previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Gambar+Tidak+Bisa+Dimuat';
                showToast('⚠️ Data berhasil diambil, tapi gambar tidak bisa dimuat langsung. Anda perlu ganti URL gambar secara manual.', 'warning', 6000);
            };
            previewImageAdd.onload = () => {
                showToast('✅ Gambar produk Shopee berhasil dimuat!', 'success');
            };
            previewImageAdd.src = data.image;

        } else {
            showToast('Gagal menarik data: ' + (result.error || 'Error tidak diketahui'), 'danger');
            previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Gagal+Muat+Gambar';
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan saat menarik data.', 'danger');
    } finally {
        loaderFetch.classList.add('d-none');
        btnFetchData.disabled = false;
        btnFetchData.innerHTML = '<i class="fas fa-sync-alt"></i> Tarik Data';
    }
});

// Toast notification helper
function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
    }
    const colors = { success: '#198754', danger: '#dc3545', warning: '#fd7e14', info: '#0dcaf0' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type]||'#333'};color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:350px;line-height:1.4;animation:slideIn .3s ease;`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .4s'; setTimeout(() => toast.remove(), 400); }, duration);
}

// Save New Product
addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newProduct = {
        title: addTitle.value,
        price: Number(addPrice.value) || 0,
        image: addImage.value,
        category: addCategory.value,
        description: addDesc.value,
        affiliateLink: addLink.value,
        isAffiliate: !!addLink.value.trim(),
        tags: ['Baru']
    };

    try {
        const res = await fetch('api/products.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProduct)
        });
        const result = await res.json();
        if (result.success) {
            alert('Produk berhasil ditambahkan ke Etalase!');
            addForm.reset();
            previewImageAdd.src = 'https://via.placeholder.com/300x300?text=Preview+Gambar';
            fetchAdminProducts();
        } else {
            alert('Gagal menyimpan produk: ' + (result.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Gagal menyimpan: ' + (err.message || err));
    }
});


// Admin Catalog Management
async function fetchAdminProducts() {
    try {
        const res = await fetch('api/products.php');
        allProducts = await res.json();
        renderAdminGrid(allProducts);
    } catch (err) {
        adminProductGrid.innerHTML = '<p class="text-danger text-center">Gagal memuat produk.</p>';
    }
}

function renderAdminGrid(products) {
    if (products.length === 0) {
        adminProductGrid.innerHTML = '<div class="col-12 text-center text-muted">Etalase kosong.</div>';
        return;
    }

    adminProductGrid.innerHTML = products.map(p => `
        <div class="col-12 col-md-6 col-lg-4 col-xl-3 animate-fade-up">
            <div class="card product-card h-100 border-0 shadow-sm">
                ${p.isPinned ? '<div class="pin-badge"><i class="fas fa-star text-danger"></i> Spotlight</div>' : ''}
                <img src="${p.image}" class="card-img-top product-img-top" style="height: 200px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h6 class="fw-bold mb-1">${p.title}</h6>
                    <small class="text-muted d-block mb-2"><i class="fas fa-tag"></i> ${p.category}</small>
                    <h5 class="text-danger fw-bold mt-auto mb-3">${formatRupiah(p.price)}</h5>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm flex-grow-1 ${p.isPinned ? 'btn-warning' : 'btn-outline-warning'}" onclick="togglePin('${p.id}')">
                            <i class="fas fa-thumbtack"></i> Pin
                        </button>
                        <button class="btn btn-sm btn-info text-white" onclick="openEditModal('${p.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

async function togglePin(id) {
    await fetch('api/products.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_pin', id })
    });
    fetchAdminProducts();
}

async function deleteProduct(id) {
    if (!confirm('Hapus produk ini secara permanen dari toko?')) return;
    try {
        const res = await fetch(`api/products.php?id=${id}`, { method: 'DELETE' });
        const result = await res.json();
        if(result.success) fetchAdminProducts();
    } catch(err) { alert('Gagal menghapus'); }
}

// Edit Modal Logic
const editModal = new bootstrap.Modal(document.getElementById('editProductModal'));
function openEditModal(id) {
    const product = allProducts.find(p => p.id === id);
    if(!product) return;
    document.getElementById('editId').value = product.id;
    document.getElementById('editTitle').value = product.title;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editCategory').value = product.category;
    document.getElementById('editDesc').value = product.description;
    
    const editImage = document.getElementById('editImage');
    editImage.value = product.image;
    document.getElementById('previewImageEdit').src = product.image;

    editModal.show();
}

document.getElementById('btnSaveEdit').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitle').value;
    const price = document.getElementById('editPrice').value;
    const category = document.getElementById('editCategory').value;
    const description = document.getElementById('editDesc').value;
    const image = document.getElementById('editImage').value; // Also allow editing image

    try {
        const res = await fetch('api/products.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, title, price, category, description, image })
        });
        const result = await res.json();
        if(result.success) {
            editModal.hide();
            fetchAdminProducts();
        }
    } catch(err) { alert('Gagal menyimpan perubahan'); }
});

searchProducts.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderAdminGrid(allProducts.filter(p => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)));
});

// Analytics Dashboard
async function fetchAnalytics() {
    try {
        const res = await fetch('api/analytics.php');
        const data = await res.json();
        
        if(data.success) {
            document.getElementById('reportClicks').textContent = data.totalClicks;
            document.getElementById('reportCommission').textContent = formatRupiah(data.estimasiKomisi);
            renderChart(data.chartData);
        }
    } catch(err) {
        console.error('Failed to load analytics', err);
    }
}

function renderChart(chartData) {
    const ctx = document.getElementById('affiliateChart').getContext('2d');
    const labels = chartData.map(d => d.date.split('-').slice(1).join('/')); // MM/DD
    const dataPoints = chartData.map(d => d.clicks);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Klik Affiliate',
                data: dataPoints,
                borderColor: '#ff4d6d',
                backgroundColor: 'rgba(255, 77, 109, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}
