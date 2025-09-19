<?php
require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $user_num = isset($_GET['user_num']) ? $_GET['user_num'] : null;
        
        if ($user_num) {
            $stmt = $pdo->prepare("SELECT * FROM payments WHERE user_num = ? ORDER BY date_iso DESC");
            $stmt->execute([$user_num]);
        } else {
            $stmt = $pdo->query("SELECT * FROM payments ORDER BY date_iso DESC");
        }
        
        $payments = $stmt->fetchAll();
        
        // Convertir months de JSON a array
        foreach ($payments as &$payment) {
            $payment['months'] = json_decode($payment['months'], true);
        }
        
        echo json_encode($payments);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $folio = $data['folio'];
        $user_num = $data['userNum'];
        $date_iso = $data['dateISO'];
        $year = $data['year'];
        $months = json_encode($data['months']);
        $rate = $data['rate'];
        $total = $data['total'];
        $hydrant = $data['hydrant'] ? 1 : 0;
        
        $stmt = $pdo->prepare("INSERT INTO payments (folio, user_num, date_iso, year, months, rate, total, hydrant) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$folio, $user_num, $date_iso, $year, $months, $rate, $total, $hydrant]);
        
        echo json_encode($data);
        break;
        
    case 'DELETE':
        $folio = $_GET['folio'];
        $stmt = $pdo->prepare("DELETE FROM payments WHERE folio = ?");
        $stmt->execute([$folio]);
        
        echo json_encode(['success' => true]);
        break;
}
?>