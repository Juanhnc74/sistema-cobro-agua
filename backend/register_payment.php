<?php
// Configuración de la base de datos
$host = "localhost";
$user = "root";     // Ajusta según tu MySQL
$pass = "";
$db   = "sistema_agua";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(['status'=>'error','message'=>'Error de conexión a la base de datos']));
}

// Recibir datos del POST
$numero_usuario = $_POST['numero_usuario'] ?? '';
$anio           = intval($_POST['anio'] ?? 0);
$meses          = $_POST['meses'] ?? []; // Array de índices de meses
$monto          = floatval($_POST['monto'] ?? 0);
$hidrante       = isset($_POST['hidrante']) && $_POST['hidrante'] == 1 ? 1 : 0;

if(!$numero_usuario || !$anio || !$meses || $monto <= 0){
    echo json_encode(['status'=>'error','message'=>'Datos incompletos o inválidos']);
    exit;
}

// Buscar usuario
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE numero_usuario = ?");
$stmt->bind_param("s", $numero_usuario);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if(!$user){
    echo json_encode(['status'=>'error','message'=>'Usuario no encontrado']);
    exit;
}

// Registrar pagos (uno por cada mes)
$stmt = $conn->prepare("INSERT INTO pagos (usuario_id, monto, fecha_pago, mes_pagado, anio, metodo_pago) VALUES (?, ?, NOW(), ?, ?, 'efectivo')");
foreach($meses as $mes){
    $mes_nombre = $mes; // opcional: si guardas índice o nombre
    $stmt->bind_param("idss", $user['id'], $monto, $mes_nombre, $anio);
    $stmt->execute();
}
$stmt->close();

echo json_encode(['status'=>'ok','message'=>'Pago registrado correctamente']);
?>
