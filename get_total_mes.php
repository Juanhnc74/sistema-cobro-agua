<?php
require 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $mes_actual = date('m');
    $anio_actual = date('Y');
    
    $sql = "SELECT SUM(total) as total FROM payments 
            WHERE MONTH(date_iso) = ? AND YEAR(date_iso) = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$mes_actual, $anio_actual]);
    $result = $stmt->fetch();
    
    $total = $result['total'] ? (float)$result['total'] : 0;
    
    echo json_encode(['success' => true, 'total' => $total]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de base de datos: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
