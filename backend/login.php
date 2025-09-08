<?php
$host = "localhost";
$user = "root";   // usuario de MySQL en XAMPP
$pass = "";       // contraseña de MySQL en XAMPP (vacía por defecto)
$db   = "sistema_agua"; // asegúrate que este sea el nombre de tu BD

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Recibir datos del login
$usuario = $_POST['usuario'] ?? '';
$password = $_POST['password'] ?? '';

$sql = "SELECT * FROM admins WHERE usuario = ? AND password = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $usuario, $password);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    echo json_encode(["status" => "ok", "message" => "Bienvenido $usuario"]);
} else {
    echo json_encode(["status" => "error", "message" => "Usuario o contraseña incorrectos"]);
}

$stmt->close();
$conn->close();
?>
