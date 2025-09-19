<?php
require_once __DIR__.'/libs/tcpdf/tcpdf.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


header('Content-Type: application/json');

$host="localhost"; $user="root"; $pass=""; $db="sistema_agua";
$conn = new mysqli($host,$user,$pass,$db);
if($conn->connect_error){
    echo json_encode(['status'=>'error', 'msg'=>'Error de conexión']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$usuario_id = $data['usuario_id'];
$anio = $data['anio'];
$tarifa = $data['tarifa'];
$meses = $data['meses']; 
$hidrante = $data['hidrante'] ? 20 : 0;

// Obtener datos del usuario
$userRes = $conn->query("SELECT nombre, direccion, telefono FROM usuarios WHERE id=$usuario_id");
$user = $userRes->fetch_assoc();

$total = ($tarifa + $hidrante) * count($meses);

// Insertar pagos
foreach($meses as $mes){
    $monto = $tarifa + $hidrante;
    $stmt = $conn->prepare("INSERT INTO pagos (usuario_id, monto, fecha_pago, mes_pagado, anio) VALUES (?, ?, NOW(), ?, ?)");
    $stmt->bind_param("idsi", $usuario_id, $monto, $mes, $anio);
    $stmt->execute();
}

// Crear PDF
$pdf = new TCPDF();
$pdf->SetMargins(15, 15, 15);
$pdf->SetAutoPageBreak(true, 15);
$pdf->SetFont('helvetica','',12);

// Función para agregar recibo con tabla
function addRecibo($pdf, $user, $meses, $tarifa, $hidrante, $total, $tipo){
    $pdf->AddPage();
    
    // Logo o nombre de empresa
    $pdf->SetFont('helvetica','B',18);
    $pdf->Cell(0,10,"PC Life - Recibo de Pago",0,1,'C');
    $pdf->SetFont('helvetica','B',14);
    $pdf->Cell(0,6,"$tipo",0,1,'C');
    $pdf->Ln(5);

    // Datos del usuario
    $pdf->SetFont('helvetica','',12);
    $html = '<table border="0" cellpadding="4">
        <tr><td><b>Nombre:</b> '.$user['nombre'].'</td><td><b>Teléfono:</b> '.$user['telefono'].'</td></tr>
        <tr><td><b>Dirección:</b> '.$user['direccion'].'</td><td><b>Año:</b> '.$GLOBALS['anio'].'</td></tr>
    </table>';
    $pdf->writeHTML($html, true, false, false, false, '');
    $pdf->Ln(3);

    // Tabla de meses y montos
    $pdf->SetFont('helvetica','',12);
    $html = '<table border="1" cellpadding="5">
        <tr style="background-color:#f2f2f2;"><th>Mes</th><th>Tarifa</th><th>Hidrante</th><th>Subtotal</th></tr>';
    foreach($meses as $mes){
        $html .= '<tr>
            <td>'.$mes.'</td>
            <td>$'.number_format($tarifa,2).'</td>
            <td>$'.($hidrante>0?number_format($hidrante,2):'0.00').'</td>
            <td>$'.number_format($tarifa+$hidrante,2).'</td>
        </tr>';
    }
    $html .= '<tr style="font-weight:bold;"><td colspan="3" align="right">Total</td><td>$'.number_format($total,2).'</td></tr>';
    $html .= '</table>';
    $pdf->writeHTML($html, true, false, false, false, '');
    $pdf->Ln(10);

    $pdf->Cell(0,6,"Firma: __________________________",0,1);
}

// Original
addRecibo($pdf, $user, $meses, $tarifa, $hidrante, $total, "ORIGINAL");

// Línea punteada para separar
$y = $pdf->GetY();
$pdf->SetLineStyle(array('width'=>0.2,'color'=>array(0,0,0),'dash'=>'2,2'));
$pdf->Line(15, $y, 195, $y);

// Copia
addRecibo($pdf, $user, $meses, $tarifa, $hidrante, $total, "COPIA");

// Guardar PDF
$filename = "recibo_pago_".$usuario_id."_".time().".pdf";
$pdf->Output(__DIR__."/recibos/".$filename, 'F');

echo json_encode(['status'=>'success','msg'=>'Pago registrado','pdf'=>$filename]);
