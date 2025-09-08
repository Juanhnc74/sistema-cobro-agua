<?php
header('Content-Type: application/json');
$host="localhost"; $user="root"; $pass=""; $db="sistema_agua";

$conn = new mysqli($host,$user,$pass,$db);
if($conn->connect_error){ echo json_encode(["status"=>"error","message"=>"Error de conexión"]); exit; }

$q = $_GET['q'] ?? '';
$mode = $_GET['mode'] ?? 'all';
$anio_actual = date('Y');

// Obtener todos los usuarios con filtro de nombre o número
$sql = "SELECT u.id, u.numero_usuario, u.nombre, u.direccion, u.telefono, u.tarifa, u.tarifa_valor
        FROM usuarios u
        WHERE u.numero_usuario LIKE ? OR u.nombre LIKE ?";
$stmt = $conn->prepare($sql);
$like_q = "%$q%";
$stmt->bind_param("ss", $like_q, $like_q);
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while($u = $result->fetch_assoc()){
    // Contar pagos realizados en el año actual
    $stmt2 = $conn->prepare("SELECT COUNT(*) as pagos_realizados 
                             FROM pagos 
                             WHERE usuario_id=? AND anio=?");
    $stmt2->bind_param("ii", $u['id'], $anio_actual);
    $stmt2->execute();
    $res2 = $stmt2->get_result();
    $row2 = $res2->fetch_assoc();
    $pagos_realizados = $row2['pagos_realizados'] ?? 0;
    $stmt2->close();

    $meses_deuda = max(0, 12 - $pagos_realizados);
    $u['meses_deuda'] = $meses_deuda;

    if($mode==='deudores' && $meses_deuda < 3) continue;

    $users[] = $u;
}

$stmt->close();
$conn->close();

echo json_encode(["status"=>"ok","users"=>$users]);
?>
