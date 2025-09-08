<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "sistema_agua";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(['status'=>'error','message'=>'Error de conexión']));
}

$numero_usuario = $_GET['numero_usuario'] ?? '';
if(!$numero_usuario){
    echo json_encode(['status'=>'error','message'=>'Usuario no especificado']);
    exit;
}

// Obtener usuario
$stmt = $conn->prepare("SELECT id, nombre, numero_usuario FROM usuarios WHERE numero_usuario = ?");
$stmt->bind_param("s", $numero_usuario);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if(!$user){
    echo json_encode(['status'=>'error','message'=>'Usuario no encontrado']);
    exit;
}

// Obtener pagos del usuario
$stmt = $conn->prepare("SELECT id, monto, fecha_pago, mes_pagado, anio FROM pagos WHERE usuario_id = ? ORDER BY anio DESC, fecha_pago DESC");
$stmt->bind_param("i", $user['id']);
$stmt->execute();
$pagos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

echo json_encode(['status'=>'ok','user'=>$user,'pagos'=>$pagos]);
?>
