<?php
require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['user'] ?? '';
$password = $data['pass'] ?? '';

// Verificar credenciales (en un sistema real, deberías usar hash para las contraseñas)
if ($username === 'admin' && ($password === 'aguapotable2027' || $password === 'administracion2027')) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Credenciales incorrectas']);
}
?>