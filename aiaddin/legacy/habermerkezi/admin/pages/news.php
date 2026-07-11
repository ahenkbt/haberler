<?php
defined('ROOT') or die();
$_GET['type'] = $_GET['type'] ?? 'news';
$_GET['page'] = 'news';
require __DIR__ . '/posts.php';
