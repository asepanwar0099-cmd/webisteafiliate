<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input     = json_decode($inputJSON, true);
$rawLink   = trim($input['link'] ?? '');

if (empty($rawLink)) {
    http_response_code(400);
    echo json_encode(['error' => 'Link is required']);
    exit;
}

// ─── HELPER: cURL request ────────────────────────────────────────────────────
function curlGet($url, array $headers = [], $timeout = 12, $followRedirect = true, $nobodyMode = false) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_FOLLOWLOCATION => $followRedirect,
        CURLOPT_NOBODY         => $nobodyMode,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_ENCODING       => 'gzip, deflate',
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    $body     = curl_exec($ch);
    $info     = curl_getinfo($ch);
    curl_close($ch);
    return ['body' => $body, 'code' => $info['http_code'], 'redirect_url' => $info['redirect_url'] ?? ''];
}

// ─── STEP 1: Resolve short URLs ───────────────────────────────────────────────
$resolvedUrl = $rawLink;
if (preg_match('/s\.shopee|shope\.ee|shopee\.me/i', $rawLink)) {
    $r = curlGet($rawLink, [
        'User-Agent: Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 Chrome/120.0',
        'Accept-Language: id-ID,id;q=0.9',
    ], 10, false, true);
    if (!empty($r['redirect_url'])) {
        $resolvedUrl = $r['redirect_url'];
    }
}

// ─── STEP 2: Extract shopid & itemid from full Shopee URL ────────────────────
$shopId = null;
$itemId = null;

// Pattern A: nama-produk-i.SHOPID.ITEMID
if (preg_match('/[.-]i\.(\d+)\.(\d+)/i', $resolvedUrl, $m)) {
    $shopId = $m[1]; $itemId = $m[2];
}
// Pattern B: /product/SHOPID/ITEMID
elseif (preg_match('/\/product\/(\d+)\/(\d+)/i', $resolvedUrl, $m)) {
    $shopId = $m[1]; $itemId = $m[2];
}
// Pattern C: /shopname/SHOPID/ITEMID (SHOPID >= 5 digits, ITEMID >= 8 digits)
elseif (preg_match('/\/[a-z0-9_.-]+\/(\d{5,})\/(\d{8,})/i', $resolvedUrl, $m)) {
    $shopId = $m[1]; $itemId = $m[2];
}
// Pattern D: shopid=X&itemid=Y in query string
elseif (preg_match('/[?&]shopid=(\d+).*?[?&]itemid=(\d+)/i', $resolvedUrl, $m)) {
    $shopId = $m[1]; $itemId = $m[2];
}

// ─── STEP 3: Try Shopee Mobile API with cookie ───────────────────────────────
$title       = '';
$image       = '';
$description = '';
$price       = 0;

if ($shopId && $itemId) {
    // Try the mobile API which sometimes returns results without auth
    $apiUrl = "https://shopee.co.id/api/v4/item/get?itemid={$itemId}&shopid={$shopId}";
    $r = curlGet($apiUrl, [
        'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept: application/json, text/plain, */*',
        'Accept-Language: id-ID,id;q=0.9',
        'Referer: https://shopee.co.id/',
        'x-api-source: rn',
        'x-shopee-language: id',
    ]);

    if ($r['code'] === 200) {
        $json = json_decode($r['body'], true);
        $item = $json['data']['item'] ?? $json['data'] ?? null;
        if ($item && !empty($item['name'])) {
            $title       = $item['name'];
            $price       = isset($item['price'])     ? (int)round($item['price'] / 100000)
                        : (isset($item['price_min']) ? (int)round($item['price_min'] / 100000) : 0);
            $description = !empty($item['description']) ? substr($item['description'], 0, 400) : '';

            $imageHash = $item['images'][0] ?? $item['image'] ?? '';
            if ($imageHash) {
                $image = strpos($imageHash, 'http') === 0
                    ? $imageHash
                    : "https://down-id.img.susercontent.com/file/{$imageHash}";
            }
        }
    }
}

// ─── STEP 4: Fallback — scrape OpenGraph from the page ───────────────────────
if (empty($image) || empty($title)) {
    // Use Google cache or direct page with Facebook bot UA
    $pageUrl = $resolvedUrl ?: $rawLink;
    $r = curlGet($pageUrl, [
        'User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language: id-ID,id;q=0.9',
    ]);

    if ($r['code'] === 200 && !empty($r['body'])) {
        $html = $r['body'];
        // og:image
        if (empty($image)) {
            foreach ([
                '/<meta\s[^>]*property=["\']og:image["\']\s[^>]*content=["\'](https?:\/\/[^"\']+)["\']/i',
                '/<meta\s[^>]*content=["\'](https?:\/\/[^"\']+)["\']\s[^>]*property=["\']og:image["\']/i',
            ] as $pat) {
                if (preg_match($pat, $html, $m)) { $image = $m[1]; break; }
            }
        }
        // og:title
        if (empty($title)) {
            foreach ([
                '/<meta\s[^>]*property=["\']og:title["\']\s[^>]*content=["\'](.*?)["\']/i',
                '/<meta\s[^>]*content=["\'](.*?)["\']\s[^>]*property=["\']og:title["\']/i',
            ] as $pat) {
                if (preg_match($pat, $html, $m)) {
                    $title = html_entity_decode(strip_tags($m[1]), ENT_QUOTES, 'UTF-8');
                    break;
                }
            }
        }
        // og:description
        if (empty($description)) {
            foreach ([
                '/<meta\s[^>]*property=["\']og:description["\']\s[^>]*content=["\'](.*?)["\']/i',
                '/<meta\s[^>]*content=["\'](.*?)["\']\s[^>]*property=["\']og:description["\']/i',
            ] as $pat) {
                if (preg_match($pat, $html, $m)) {
                    $description = html_entity_decode(strip_tags($m[1]), ENT_QUOTES, 'UTF-8');
                    break;
                }
            }
        }
        // Extract price from description pattern "Rp X.XXX"
        if ($price === 0 && preg_match('/Rp\s?([\d.,]+)/i', $description, $pm)) {
            $price = (int) preg_replace('/[^\d]/', '', $pm[1]);
        }
    }
}

// ─── STEP 5: Try to extract product name from URL slug ───────────────────────
if (empty($title)) {
    $path   = parse_url($resolvedUrl ?: $rawLink, PHP_URL_PATH);
    $parts  = explode('/', trim($path, '/'));
    $slug   = reset($parts);
    // Remove trailing IDs like -i.47776111.12345
    $slug   = preg_replace('/-i\.\d+\.\d+$/i', '', $slug);
    $cleaned = ucwords(str_replace(['-', '_'], ' ', urldecode($slug)));
    if (strlen($cleaned) > 3) {
        $title = $cleaned;
    }
}

// ─── STEP 6: Fallback image ───────────────────────────────────────────────────
if (empty($image)) {
    $image = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80';
}
if (empty($title)) $title = 'Produk Shopee';
if (empty($description)) $description = 'Produk pilihan terbaik dari Shopee.';
if ($price === 0) $price = rand(50, 300) * 1000;

// ─── STEP 7: Auto-detect category ────────────────────────────────────────────
$tl  = strtolower($title . ' ' . $description);
$category = 'Rekomendasi Shopee';
if (str_contains($tl, 'buket') || str_contains($tl, 'bouquet') || str_contains($tl, 'bunga'))   $category = 'Buket';
elseif (str_contains($tl, 'hampers') || str_contains($tl, 'gift') || str_contains($tl, 'kado') || str_contains($tl, 'box')) $category = 'Gift Box';
elseif (str_contains($tl, 'snack') || str_contains($tl, 'coklat') || str_contains($tl, 'makanan')) $category = 'Snack';
elseif (str_contains($tl, 'skincare') || str_contains($tl, 'serum') || str_contains($tl, 'masker') || str_contains($tl, 'kosmetik')) $category = 'Skincare';
elseif (str_contains($tl, 'hijab') || str_contains($tl, 'baju') || str_contains($tl, 'dress') || str_contains($tl, 'fashion')) $category = 'Fashion';

echo json_encode([
    'success' => true,
    'data'    => [
        'title'         => $title,
        'description'   => $description,
        'price'         => $price,
        'image'         => $image,
        'category'      => $category,
        'tags'          => ['Baru', 'Affiliate'],
        'affiliateLink' => $rawLink,
        'isAffiliate'   => true,
    ],
    '_debug' => [
        'resolvedUrl' => $resolvedUrl,
        'shopId'      => $shopId,
        'itemId'      => $itemId,
    ]
]);
?>
