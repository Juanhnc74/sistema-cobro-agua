<?php
require 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query("SELECT * FROM users ORDER BY name");
        $users = $stmt->fetchAll();
        echo json_encode($users);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $num = $data['num'];
        $name = $data['name'];
        $calle = $data['calle'];
        $tel = $data['tel'];
        $tarifa = $data['tarifa'];
        
        $stmt = $pdo->prepare("INSERT INTO users (num, name, calle, tel, tarifa) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$num, $name, $calle, $tel, $tarifa]);
        
        echo json_encode(['num' => $num, 'name' => $name, 'calle' => $calle, 'tel' => $tel, 'tarifa' => $tarifa]);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $num = $data['num'];
        $name = $data['name'];
        $calle = $data['calle'];
        $tel = $data['tel'];
        $tarifa = $data['tarifa'];
        
        $stmt = $pdo->prepare("UPDATE users SET name = ?, calle = ?, tel = ?, tarifa = ? WHERE num = ?");
        $stmt->execute([$name, $calle, $tel, $tarifa, $num]);
        
        echo json_encode(['success' => true]);
        break;
        
    case 'DELETE':
        $num = $_GET['num'];
        $stmt = $pdo->prepare("DELETE FROM users WHERE num = ?");
        $stmt->execute([$num]);
        
        echo json_encode(['success' => true]);
        break;
}
?>