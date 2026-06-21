<?php
$productsFile = __DIR__ . '/products.json';
$products = [];
if (file_exists($productsFile)) {
    $json = file_get_contents($productsFile);
    $products = json_decode($json, true) ?: [];
}
function formatRupiah($n) {
    return 'Rp ' . number_format($n, 0, ',', '.');
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Craft & Gift - Premium Bouquets & Gifts</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-glass sticky-top">
        <div class="container">
            <a class="navbar-brand" href="#"><i class="fas fa-gift"></i> Craft & Gift</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-center">
                    <li class="nav-item me-3" id="adminLinkContainer" style="display:none;">
                        <a class="nav-link text-dark fw-bold" href="admin.html"><i class="fas fa-user-shield"></i> Dashboard Admin</a>
                    </li>
                    <li class="nav-item me-3" id="authBtnContainer">
                        <a class="btn btn-outline-pink btn-sm rounded-pill px-3" href="auth.html">Daftar / Login</a>
                    </li>
                    <li class="nav-item">
                        <div class="cart-wrapper" id="cartIcon" data-bs-toggle="offcanvas" data-bs-target="#cartDrawer">
                            <i class="fas fa-shopping-bag"></i>
                            <span class="cart-badge" id="cartCount">0</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <header class="container mt-5 mb-5 text-center animate-fade-up">
        <div class="p-5 glass-panel">
            <h1 class="display-5 fw-bold mb-3" style="color: var(--primary-color);">Kado Terbaik Untuk Momen Spesial</h1>
            <p class="lead text-muted mb-4">Mulai dari buket bunga estetik, snack menggemaskan, hingga money bouquet kekinian bergaya Shopee.</p>
            <a href="#katalog" class="btn btn-pink btn-lg shadow-sm">Belanja Sekarang</a>
        </div>
    </header>

    <!-- Categories -->
    <section class="container mb-4 text-center animate-fade-up" id="katalog">
        <div class="d-flex justify-content-center flex-wrap gap-2" id="categoryFilter">
            <button class="btn btn-outline-pink active" data-filter="all">Semua Koleksi</button>
            <!-- Categories injected here -->
        </div>
    </section>

    <!-- Product Grid -->
    <main class="container mb-5">
        <div class="row g-4" id="productGrid">
            <!-- Server-rendered products -->
            <?php if (count($products) === 0): ?>
                <div class="col-12 text-center p-5">
                    <div class="spinner-border" style="color: var(--primary-color);" role="status"></div>
                    <p class="mt-3 text-muted">Mencari buket terlucu...</p>
                </div>
            <?php else: ?>
                <?php foreach ($products as $p): ?>
                    <div class="col-12 col-sm-6 col-lg-4 col-xl-3 animate-fade-up">
                        <div class="card product-card glass-panel h-100">
                            <?php if (!empty($p['isPinned'])): ?>
                                <div class="pin-badge"><i class="fas fa-heart text-danger"></i> Pilihan Utama</div>
                            <?php endif; ?>
                            <img src="<?= htmlspecialchars($p['image']) ?>" class="card-img-top product-img-top" alt="<?= htmlspecialchars($p['title']) ?>" onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=Gambar+Tidak+Tersedia'">
                            <div class="card-body d-flex flex-column">
                                <div class="mb-2">
                                    <?php if (!empty($p['tags']) && is_array($p['tags'])): ?>
                                        <?php foreach ($p['tags'] as $tag): ?>
                                            <span class="badge badge-tag me-1 mb-1">#<?= htmlspecialchars($tag) ?></span>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </div>
                                <h5 class="card-title fw-bold text-dark"><?= htmlspecialchars($p['title']) ?></h5>
                                <p class="card-text text-muted small flex-grow-1"><?= htmlspecialchars($p['description']) ?></p>
                                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                                    <span class="price-tag"><?= formatRupiah($p['price'] ?? 0) ?></span>
                                    <?php if (!empty($p['isAffiliate'])): ?>
                                        <a href="<?= htmlspecialchars($p['affiliateLink']) ?>" target="_blank" class="btn btn-shopee btn-sm px-3 fw-bold"><i class="fas fa-shopping-cart"></i> Beli di Shopee</a>
                                    <?php else: ?>
                                        <button class="btn btn-pink btn-sm px-3 fw-bold shadow-sm" onclick="addToCart('<?= htmlspecialchars($p['id']) ?>')"><i class="fas fa-plus"></i> Keranjang</button>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <!-- Cart Offcanvas (Bootstrap) -->
    <div class="offcanvas offcanvas-end glass-panel" tabindex="-1" id="cartDrawer" style="border:none;">
        <div class="offcanvas-header border-bottom">
            <h5 class="offcanvas-title fw-bold" style="color: var(--primary-color);"><i class="fas fa-shopping-basket"></i> Keranjang Anda</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body" id="cartItems">
            <!-- Cart items injected here -->
            <p class="text-center text-muted mt-5">Keranjang masih kosong nih. Yuk belanja!</p>
        </div>
        <div class="offcanvas-footer p-3 bg-white border-top">
            <div class="d-flex justify-content-between mb-3">
                <span class="fw-bold fs-5">Total Pembayaran:</span>
                <span class="fw-bold fs-5" style="color: var(--primary-color);" id="cartTotalPrice">Rp 0</span>
            </div>
            <button class="btn btn-success w-100 py-2 fw-bold" id="btnCheckout" style="border-radius: 12px;">
                <i class="fab fa-whatsapp fs-5 me-2"></i> Checkout via WhatsApp
            </button>
        </div>
    </div>

    <!-- Bootstrap JS Bundle -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
