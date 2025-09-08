<?php
header('Content-Type: application/json');

// Configuración de la base de datos
$host = "localhost";
$user = "root";       // Cambia si tu usuario MySQL es distinto
$pass = "";           // Cambia si tu MySQL tiene contraseña
$db   = "sistema_agua";

// Conexión
$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

// Recibir datos del formulario
$numero_usuario = trim($_POST['numero_usuario'] ?? '');
$nombre         = trim($_POST['nombre'] ?? '');
$direccion      = trim($_POST['direccion'] ?? '');
$telefono       = trim($_POST['telefono'] ?? '');
$tarifa         = $_POST['tarifa'] ?? '';

// Validaciones básicas
if (!$numero_usuario || !$nombre || !$direccion || !$telefono || !$tarifa) {
    echo json_encode(["status" => "error", "message" => "Completa todos los campos."]);
    exit;
}

// Validar teléfono de 10 dígitos
if (!preg_match('/^\d{10}$/', $telefono)) {
    echo json_encode(["status" => "error", "message" => "El teléfono debe tener 10 dígitos."]);
    exit;
}

// Comprobar que el número de usuario no exista
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE numero_usuario = ?");
$stmt->bind_param("s", $numero_usuario);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Número de usuario ya existente."]);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// Asignar valor numérico de tarifa
$tarifa_valor = 0;
switch($tarifa) {
    case 'domestica': $tarifa_valor = 90; break;
    case 'hidrante':  $tarifa_valor = 20; break;
    case 'comercial': $tarifa_valor = 150; break;
    default: $tarifa_valor = 0; break;
}

// Insertar usuario
$stmt = $conn->prepare("INSERT INTO usuarios (numero_usuario, nombre, direccion, telefono, tarifa, tarifa_valor) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssi", $numero_usuario, $nombre, $direccion, $telefono, $tarifa, $tarifa_valor);

if ($stmt->execute()) {
    echo json_encode(["status" => "ok", "message" => "Usuario registrado correctamente."]);
} else {
    echo json_encode(["status" => "error", "message" => "Error al registrar usuario."]);
}

$stmt->close();
$conn->close();
?>

