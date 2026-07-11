<?php
define('ROOT', dirname(dirname(__FILE__)));
require_once ROOT . '/core/bootstrap.php';
header('Content-Type: application/json; charset=utf-8');
Cart::init();
$action = basename(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
switch ($action) {
    case 'add':
        $id = (int)($body['product_id'] ?? 0);
        $qty = max(1, (int)($body['qty'] ?? 1));
        if ($id) Cart::add($id, $qty);
        echo json_encode(['ok'=>true,'count'=>Cart::count(),'total'=>Cart::total()]);
        break;
    case 'update':
        $key = $body['key'] ?? '';
        $qty = (int)($body['qty'] ?? 0);
        if ($key) Cart::update($key, $qty);
        echo json_encode(['ok'=>true,'count'=>Cart::count(),'total'=>Cart::total()]);
        break;
    case 'remove':
        $key = $body['key'] ?? '';
        if ($key) Cart::remove($key);
        echo json_encode(['ok'=>true,'count'=>Cart::count(),'total'=>Cart::total()]);
        break;
    case 'clear':
        Cart::clear();
        echo json_encode(['ok'=>true,'count'=>0,'total'=>0]);
        break;
    case 'items':
        echo json_encode(['ok'=>true,'items'=>Cart::items(),'count'=>Cart::count(),'total'=>Cart::total()]);
        break;
    default:
        http_response_code(404);
        echo json_encode(['ok'=>false,'msg'=>'Endpoint bulunamadı']);
}
