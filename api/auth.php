<?php
declare(strict_types=1);

session_start();

// Pastikan response selalu JSON
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
error_reporting(E_ALL);

$usersFile = __DIR__ . '/../users.json';

function auth_log(string $msg): void {
    // error_log biasanya lebih reliable dari file write permission di hosting
    @error_log('[auth_debug] ' . $msg);
}

auth_log('--- New request ---');
auth_log('URI: ' . ($_SERVER['REQUEST_URI'] ?? ''));
auth_log('Method: ' . ($_SERVER['REQUEST_METHOD'] ?? ''));

try {
    if (!file_exists($usersFile)) {
        file_put_contents($usersFile, json_encode([], JSON_PRETTY_PRINT));
    }

    $rawUsers = file_get_contents($usersFile);
    $users = json_decode($rawUsers ?: '[]', true);
    if (!is_array($users)) {
        $users = [];
    }

    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON ?: '{}', true);
    if (!is_array($input)) {
        $input = [];
    }

    if (!isset($input['action']) || !is_string($input['action']) || $input['action'] === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Action is required']);
        exit;
    }

    $action = $input['action'];

    if ($action === 'register') {
        $identifier = isset($input['identifier']) ? trim((string)$input['identifier']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';
        $adminCode = isset($input['adminCode']) ? trim((string)$input['adminCode']) : '';

        if ($identifier === '' || $password === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'error' => 'Email / No HP dan password wajib diisi.']);
            exit;
        }

        // Reload users untuk mencegah konflik
        $rawUsers = file_get_contents($usersFile) ?: '[]';
        $users = json_decode($rawUsers, true);
        if (!is_array($users)) $users = [];

        foreach ($users as $user) {
            if (is_array($user) && isset($user['identifier']) && (string)$user['identifier'] === $identifier) {
                echo json_encode(['success' => false, 'error' => 'Email / No HP sudah terdaftar.']);
                exit;
            }
        }

        $role = 'customer';
        if ($adminCode === 'ADMINPINK2026') {
            $role = 'admin';
        } elseif ($adminCode !== '') {
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

        if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT)) === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Gagal menyimpan data pengguna.']);
            exit;
        }

        // Auto login
        $_SESSION['user_id'] = $newUser['id'];
        $_SESSION['role'] = $newUser['role'];
        $_SESSION['identifier'] = $newUser['identifier'];

        echo json_encode(['success' => true, 'role' => $role]);
        exit;
    }

    if ($action === 'login') {
        $identifier = isset($input['identifier']) ? trim((string)$input['identifier']) : '';
        $password = isset($input['password']) ? (string)$input['password'] : '';

        if ($identifier === '' || $password === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'error' => 'Email / No HP dan password wajib diisi.']);
            exit;
        }

        $rawUsers = file_get_contents($usersFile) ?: '[]';
        $users = json_decode($rawUsers, true);
        if (!is_array($users)) $users = [];

        foreach ($users as $user) {
            if (!is_array($user) || !isset($user['identifier'], $user['password'], $user['id'], $user['role'])) {
                continue;
            }

            if ((string)$user['identifier'] !== $identifier) continue;

            $stored = (string)$user['password'];
            $ok = password_verify($password, $stored) || $password === $stored; // fallback untuk user lama
            if ($ok) {
                $_SESSION['user_id'] = (string)$user['id'];
                $_SESSION['role'] = (string)$user['role'];
                $_SESSION['identifier'] = (string)$user['identifier'];

                echo json_encode(['success' => true, 'role' => (string)$user['role']]);
                exit;
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
                'role' => $_SESSION['role'] ?? 'customer',
                'identifier' => $_SESSION['identifier'] ?? ''
            ]);
        } else {
            echo json_encode(['loggedIn' => false]);
        }
        exit;
    }

    if ($action === 'forgot_password') {
        $identifier = isset($input['identifier']) ? trim((string)$input['identifier']) : '';
        $newPassword = isset($input['newPassword']) ? (string)$input['newPassword'] : '';

        if ($identifier === '' || $newPassword === '') {
            http_response_code(422);
            echo json_encode(['success' => false, 'error' => 'Identifier dan password baru wajib diisi.']);
            exit;
        }

        $rawUsers = file_get_contents($usersFile) ?: '[]';
        $users = json_decode($rawUsers, true);
        if (!is_array($users)) $users = [];

        $found = false;

        foreach ($users as &$user) {
            if (!is_array($user)) continue;
            if (!isset($user['identifier'])) continue;

            if ((string)$user['identifier'] === $identifier) {
                $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
                $found = true;
                break;
            }
        }
        unset($user);

        if ($found) {
            if (file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT)) === false) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Gagal menyimpan perubahan password.']);
                exit;
            }
            echo json_encode(['success' => true, 'message' => 'Password berhasil di-reset. Silakan login.']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Email / No HP tidak ditemukan.']);
        }
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Unknown action']);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
    exit;
}
?>
