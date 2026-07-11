<?php
defined('ROOT') or die();
$_GET['type'] = $_GET['type'] ?? 'page';
$_GET['page'] = 'pages';
require __DIR__ . '/posts.php';
