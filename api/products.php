<?php
header('Content-Type: application/json');
$dataFile = '../products.json';

if (!file_exists($dataFile)) {
    file_put_contents($dataFile, json_encode([]));
}

$method = $_SERVER['REQUEST_METHOD'];
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if ($method === 'GET') {
    echo file_get_contents($dataFile);
    exit;
} elseif ($method === 'POST') {
    if (isset($input['action']) && $input['action'] === 'toggle_pin') {
        $id = $input['id'];
        $products = json_decode(file_get_contents($dataFile), true);
        foreach ($products as &$p) {
            if ($p['id'] === $id) {
                $p['isPinned'] = !$p['isPinned'];
                file_put_contents($dataFile, json_encode($products, JSON_PRETTY_PRINT));
                echo json_encode(['success' => true]);
                exit;
            }
        }
    }

    // Add new product
    if (isset($input['title']) && isset($input['price'])) {
        $products = json_decode(file_get_contents($dataFile), true);
        $newProduct = [
            'id' => 'prod_' . time(),
            'title' => $input['title'],
            'description' => $input['description'] ?? '',
            'price' => (float)$input['price'],
            'image' => $input['image'] ?? 'https://via.placeholder.com/600x400',
            'category' => $input['category'] ?? 'Uncategorized',
            'tags' => $input['tags'] ?? [],
            'rating' => 5.0,
            'isAffiliate' => $input['isAffiliate'] ?? false,
            'affiliateLink' => $input['affiliateLink'] ?? '',
            'isPinned' => false
        ];
        array_unshift($products, $newProduct);
        file_put_contents($dataFile, json_encode($products, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data']);
    }
} elseif ($method === 'PUT') {
    // Edit Product
    if (isset($input['id'])) {
        $products = json_decode(file_get_contents($dataFile), true);
        foreach ($products as &$p) {
            if ($p['id'] === $input['id']) {
                $p['title'] = $input['title'] ?? $p['title'];
                $p['description'] = $input['description'] ?? $p['description'];
                $p['price'] = isset($input['price']) ? (float)$input['price'] : $p['price'];
                $p['category'] = $input['category'] ?? $p['category'];
                $p['image'] = $input['image'] ?? $p['image']; // Allow image edit
                file_put_contents($dataFile, json_encode($products, JSON_PRETTY_PRINT));
                echo json_encode(['success' => true]);
                exit;
            }
        }
    }
} elseif ($method === 'DELETE') {
    // Delete Product
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        $products = json_decode(file_get_contents($dataFile), true);
        $filtered = array_filter($products, function($p) use ($id) { return $p['id'] !== $id; });
        file_put_contents($dataFile, json_encode(array_values($filtered), JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
        exit;
    }
}
?>
