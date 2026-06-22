<?php
session_start();
header('Content-Type: application/json');

$usersFile = '../users.json';
if (!file_exists($usersFile)) {
    file_put_contents($usersFile, json_encode([]));
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (!isset($input['action'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Action is required']);
    exit;
}

$action = $input['action'];

if ($action === 'register') {
    $identifier = isset($input['identifier']) ? trim(strtolower($input['identifier'])) : '';
    $password = $input['password'] ?? '';
    $adminCode = trim($input['adminCode'] ?? '');

    $users = json_decode(file_get_contents($usersFile), true);
    
    // Check if exists
    foreach ($users as $user) {
        if (trim(strtolower($user['identifier'])) === $identifier) {
            echo json_encode(['success' => false, 'error' => 'Email / No HP sudah terdaftar.']);
            exit;
        }
    }

    $role = 'customer';
    if ($adminCode === 'ADMINPINK2026') {
        $role = 'admin';
    } else if (!empty($adminCode)) {
        echo json_encode(['success' => false, 'error' => 'Kode Admin salah. Kosongkan jika mendaftar sebagai pelanggan.']);
        exit;
    }

    $newUser = [
        'id' => 'user_' . time(),
        'identifier' => $identifier,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role
    ];

    $users[] = $newUser;
    file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));

    // Auto login
    $_SESSION['user_id'] = $newUser['id'];
    $_SESSION['role'] = $newUser['role'];
    $_SESSION['identifier'] = $newUser['identifier'];

    echo json_encode(['success' => true, 'role' => $role]);
    exit;
}

if ($action === 'login') {
    $identifier = isset($input['identifier']) ? trim(strtolower($input['identifier'])) : '';
    $password = $input['password'] ?? '';

    $users = json_decode(file_get_contents($usersFile), true);

    foreach ($users as $user) {
        if (trim(strtolower($user['identifier'])) === $identifier) {
            // Check password (handle plain text 'password' for default admin, or hashed for new users)
            if (password_verify($password, $user['password']) || $password === $user['password']) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['role'] = $user['role'];
                $_SESSION['identifier'] = $user['identifier'];
                echo json_encode(['success' => true, 'role' => $user['role']]);
                exit;
            }
        }
    }

    echo json_encode(['success' => false, 'error' => 'Kredensial tidak valid.']);
    exit;
}

if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'loggedIn' => true,
            'role' => $_SESSION['role'],
            'identifier' => $_SESSION['identifier']
        ]);
    } else {
        echo json_encode(['loggedIn' => false]);
    }
    exit;
}

if ($action === 'forgot_password') {
    $identifier = $input['identifier'];
    $newPassword = $input['newPassword'];

    $users = json_decode(file_get_contents($usersFile), true);
    $found = false;

    foreach ($users as &$user) {
        if ($user['identifier'] === $identifier) {
            $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
            $found = true;
            break;
        }
    }

    if ($found) {
        file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true, 'message' => 'Password berhasil di-reset. Silakan login.']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Email / No HP tidak ditemukan.']);
    }
    exit;
}
?>
