<?php
header('Content-Type: application/json');
$host="localhost"; $user="root"; $pass=""; $db="sistema_agua";

$conn = new mysqli($host, $user, $pass, $db);
if($conn->connect_error){ echo json_encode(["status"=>"error","message"=>"Error de conexión"]); exit; }

$id = $_POST['id'] ?? 0;
$nombre = $_POST['nombre'] ?? '';
$direccion = $_POST['direccion'] ?? '';
$telefono = $_POST['telefono'] ?? '';
$tarifa = $_POST['tarifa'] ?? '';

if(!$id || !$nombre || !$direccion || !preg_match('/^\d{10}$/',$telefono)){
    echo json_encode(["status"=>"error","message"=>"Datos inválidos"]); exit;
}

$tarifa_valor = 0;
switch($tarifa){
    case 'domestica': $tarifa_valor=90; break;
    case 'hidrante': $tarifa_valor=20; break;
    case 'comercial': $tarifa_valor=150; break;
}

$stmt = $conn->prepare("UPDATE usuarios SET nombre=?, direccion=?, telefono=?, tarifa=?, tarifa_valor=? WHERE id=?");
$stmt->bind_param("ssssii", $nombre, $direccion, $telefono, $tarifa, $tarifa_valor, $id);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(["status"=>"ok","message"=>"Usuario actualizado ✅"]);
?>
