<?php
header('Content-Type: application/json');
$host="localhost"; $user="root"; $pass=""; $db="sistema_agua";

$conn = new mysqli($host,$user,$pass,$db);
if($conn->connect_error){
    echo json_encode([]);
    exit;
}

$q = $_GET['q'] ?? '';
$q = $conn->real_escape_string($q);

$sql = "SELECT id, nombre, direccion, telefono FROM usuarios 
        WHERE nombre LIKE '%$q%' OR telefono LIKE '%$q%' 
        LIMIT 10";
$result = $conn->query($sql);

$users = [];
if($result){
    while($row = $result->fetch_assoc()){
        $users[] = $row;
    }
}

echo json_encode($users);
?>
