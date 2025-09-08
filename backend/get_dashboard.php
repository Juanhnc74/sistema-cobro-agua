<?php
header('Content-Type: application/json');

// Conexión a la base de datos
$host = "localhost";
$user = "root";
$pass = "";
$db   = "sistema_agua";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

// 1️⃣ Total recaudado mes (sumando tarifa_valor de los pagos del mes actual)
// Total recaudado "estimado" sumando tarifa_valor de todos los usuarios
$sqlMonth = "SELECT SUM(tarifa_valor) AS total_mes FROM usuarios";
$result = $conn->query($sqlMonth);
$row = $result->fetch_assoc();
$total_mes = $row['total_mes'] ?? 0;


// 2️⃣ Total usuarios
$sqlUsers = "SELECT COUNT(*) AS total_usuarios FROM usuarios";
$result = $conn->query($sqlUsers);
$row = $result->fetch_assoc();
$total_usuarios = $row['total_usuarios'] ?? 0;

// 3️⃣ Deudores (usuarios con 3 o más meses sin pagar)
$sqlDeudores = "SELECT COUNT(*) AS total_deudores
                FROM usuarios u
                LEFT JOIN pagos p ON u.id = p.usuario_id AND YEAR(p.fecha_pago) = ? AND MONTH(p.fecha_pago) >= ? 
                GROUP BY u.id
                HAVING COUNT(p.id) < 3";
$stmt = $conn->prepare($sqlDeudores);
$stmt->bind_param("ii", $anio_actual, $mes_actual);
$stmt->execute();
$result = $stmt->get_result();
$total_deudores = $result->num_rows; // cantidad de usuarios que cumplen la condición
$stmt->close();

$conn->close();

// Devolver JSON
echo json_encode([
    "status" => "ok",
    "total_mes" => $total_mes,
    "total_usuarios" => $total_usuarios,
    "total_deudores" => $total_deudores
]);
?>
