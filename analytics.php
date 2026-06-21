<?php
header('Content-Type: application/json');

$dataFile = '../data/analytics.json';

if (!file_exists($dataFile)) {
    if (!is_dir('../data')) mkdir('../data', 0777, true);
    file_put_contents($dataFile, json_encode([]));
}

$method = $_SERVER['REQUEST_METHOD'];
$analytics = json_decode(file_get_contents($dataFile), true);
$todayDate = date('Y-m-d');

if ($method === 'GET') {
    // Return report data
    $totalClicks = 0;
    foreach ($analytics as $day) {
        $totalClicks += $day['clicks'];
    }
    
    // Asumsi komisi Rp 5000 per 5 klik (misal conversion rate 20%)
    $estimasiKomisi = ($totalClicks / 5) * 5000;
    
    echo json_encode([
        'success' => true,
        'totalClicks' => $totalClicks,
        'estimasiKomisi' => $estimasiKomisi,
        'chartData' => $analytics
    ]);
    exit;
} elseif ($method === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if (isset($input['action']) && $input['action'] === 'track_click') {
        $found = false;
        foreach ($analytics as &$day) {
            if ($day['date'] === $todayDate) {
                $day['clicks']++;
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            $analytics[] = [
                'date' => $todayDate,
                'clicks' => 1
            ];
        }

        // Keep only last 14 days
        if (count($analytics) > 14) {
            array_shift($analytics);
        }

        file_put_contents($dataFile, json_encode($analytics, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true]);
        exit;
    }
}
?>
