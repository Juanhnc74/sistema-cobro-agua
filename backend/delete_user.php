<?php
header('Content-Type: application/json');
$host="localhost"; $user="root"; $pass=""; $db="sistema_agua";

$conn = new mysqli($host, $user, $pass, $db);
if($conn->connect_error){ echo json_encode(["status"=>"error","message"=>"Error de conexión"]); exit; }

$id = $_POST['id'] ?? 0;
if(!$id){ echo json_encode(["status"=>"error","message"=>"ID inválido"]); exit; }

// Eliminar pagos asociados
$stmt = $conn->prepare("DELETE FROM pagos WHERE usuario_id=?");
$stmt->bind_param("i",$id);
$stmt->execute();
$stmt->close();

// Eliminar usuario
$stmt = $conn->prepare("DELETE FROM usuarios WHERE id=?");
$stmt->bind_param("i",$id);
$stmt->execute();
$stmt->close();

$conn->close();
echo json_encode(["status"=>"ok","message"=>"Usuario eliminado ✅"]);
?>
