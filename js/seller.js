// DOM Elements
const linkInput = document.getElementById('linkInput');
const btnGenerate = document.getElementById('btnGenerate');
const loader = document.getElementById('loader');
const previewSection = document.getElementById('previewSection');
const cardPreviewContainer = document.getElementById('cardPreviewContainer');
const btnSaveCard = document.getElementById('btnSaveCard');
const sellerProductGrid = document.getElementById('sellerProductGrid');
const searchProducts = document.getElementById('searchProducts');

let currentGeneratedData = null;
let allProducts = [];

// Utils
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

document.addEventListener('DOMContentLoaded', () => {
    fetchSellerProducts();
});

// Smart Link Engine
btnGenerate.addEventListener('click', async () => {
    const link = linkInput.value.trim();
    if (!link) {
        alert('Silakan masukkan link terlebih dahulu.');
        return;
    }

    // Show loader, hide preview
    loader.style.display = 'block';
    previewSection.classList.remove('active');

    try {
        const response = await fetch('api/process_link.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ link: link })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentGeneratedData = result.data;
            renderPreview(currentGeneratedData);
            loader.style.display = 'none';
            previewSection.classList.add('active');
        } else {
            alert('Gagal memproses link: ' + result.error);
            loader.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat memproses link.');
        loader.style.display = 'none';
    }
});

function renderPreview(data) {
    const tagsHtml = data.tags.map(tag => `<span class="tag">#${tag}</span>`).join('');
    
    cardPreviewContainer.innerHTML = `
        <div class="product-card glass" style="margin:0; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
            <img src="${data.image}" alt="${data.title}" class="product-image">
            <div class="product-info">
                <div class="product-tags">
                    ${tagsHtml}
                </div>
                <h3 class="product-title">${data.title}</h3>
                <p class="product-desc" style="font-size:0.8rem">${data.description}</p>
                <div class="product-footer" style="margin-top:10px;">
                    <span class="product-price">${formatRupiah(data.price)}</span>
                    <a href="${data.affiliateLink}" target="_blank" class="btn-affiliate" onclick="event.preventDefault()">Beli di Shopee</a>
                </div>
            </div>
        </div>
    `;
}

btnSaveCard.addEventListener('click', async () => {
    if (!currentGeneratedData) return;

    try {
        const response = await fetch('api/products.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentGeneratedData)
        });

        const result = await response.json();
        if (result.success) {
            alert('Produk berhasil ditambahkan ke etalase!');
            linkInput.value = '';
            previewSection.classList.remove('active');
            currentGeneratedData = null;
            fetchSellerProducts(); // refresh grid
        } else {
            alert('Gagal menyimpan produk.');
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan saat menyimpan produk.');
    }
});

// Product Management
async function fetchSellerProducts() {
    try {
        const response = await fetch('api/products.php');
        allProducts = await response.json();
        renderSellerGrid(allProducts);
    } catch (err) {
        console.error(err);
        sellerProductGrid.innerHTML = '<p>Gagal memuat produk.</p>';
    }
}

function renderSellerGrid(products) {
    if (products.length === 0) {
        sellerProductGrid.innerHTML = '<p style="text-align:center; width:100%;">Belum ada produk di etalase.</p>';
        return;
    }

    sellerProductGrid.innerHTML = products.map(p => `
        <div class="product-card glass">
            ${p.isPinned ? '<div class="pin-badge"><i class="fas fa-star"></i> Pinned</div>' : ''}
            <img src="${p.image}" alt="${p.title}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${p.title}</h3>
                <span style="font-size: 0.8rem; color: var(--text-light)">Kategori: ${p.category}</span>
                <div class="action-btns">
                    <button class="btn-pin ${p.isPinned ? 'pinned' : ''}" onclick="togglePin('${p.id}')">
                        <i class="fas fa-thumbtack"></i> ${p.isPinned ? 'Unpin' : 'Pin Spotlight'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function togglePin(productId) {
    try {
        const response = await fetch('api/products.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_pin', id: productId })
        });
        
        const result = await response.json();
        if (result.success) {
            fetchSellerProducts();
        }
    } catch (err) {
        console.error(err);
        alert('Gagal mengubah status pin.');
    }
}

// Search
searchProducts.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allProducts.filter(p => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
    renderSellerGrid(filtered);
});
