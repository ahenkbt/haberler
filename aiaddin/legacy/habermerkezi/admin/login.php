<?php
/**
 * AhenkPress Admin — Giriş Sayfası
 */
if (!defined('ROOT'))       define('ROOT', dirname(__DIR__));
if (!defined('ADMIN_DIR'))  define('ADMIN_DIR', __DIR__);
if (!defined('AP_VERSION')) require_once ROOT . '/core/bootstrap.php';

if (Auth::check()) { header('Location: /admin/'); exit; }

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if (!$username || !$password) {
        $error = 'Kullanıcı adı ve şifre gerekli.';
    } elseif (Auth::login($username, $password)) {
        header('Location: /admin/');
        exit;
    } else {
        $error = 'Kullanıcı adı veya şifre hatalı.';
    }
}
?>
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Giriş — AhenkPress</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1117;color:#e6edf3;min-height:100vh;display:flex;align-items:center;justify-content:center}
.box{width:100%;max-width:380px;padding:20px}
.brand{text-align:center;margin-bottom:28px}
.logo{width:52px;height:52px;background:#238636;border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff}
h1{font-size:22px;font-weight:800}
.sub{font-size:13px;color:#7d8590;margin-top:4px}
.card{background:#1c2128;border:1px solid #30363d;border-radius:10px;padding:24px}
.lbl{display:block;font-size:12px;font-weight:600;color:#7d8590;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px}
.inp{width:100%;padding:9px 12px;background:#0f1117;border:1px solid #30363d;border-radius:6px;color:#e6edf3;font-size:14px;outline:none;transition:border .2s}
.inp:focus{border-color:#388bfd;box-shadow:0 0 0 3px rgba(56,139,253,.15)}
.grp{margin-bottom:14px}
.btn{width:100%;padding:10px;background:#238636;border:1px solid #1a7f37;border-radius:6px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px}
.btn:hover{background:#1a7f37}
.err{background:rgba(218,54,51,.12);border:1px solid rgba(218,54,51,.3);color:#f85149;padding:10px;border-radius:6px;font-size:13px;margin-bottom:14px}
.back{text-align:center;margin-top:14px;font-size:12px}
.back a{color:#7d8590;text-decoration:none}
.back a:hover{color:#e6edf3}
</style>
</head>
<body>
<div class="box">
  <div class="brand">
    <div class="logo">A</div>
    <h1>AhenkPress</h1>
    <div class="sub">Yönetim Paneli</div>
  </div>
  <div class="card">
    <?php if ($error): ?>
    <div class="err"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="POST">
      <div class="grp">
        <label class="lbl">Kullanıcı Adı veya E-posta</label>
        <input class="inp" type="text" name="username" required autofocus>
      </div>
      <div class="grp">
        <label class="lbl">Şifre</label>
        <input class="inp" type="password" name="password" required>
      </div>
      <button class="btn" type="submit">Giriş Yap</button>
    </form>
  </div>
  <div class="back"><a href="/">← Siteye dön</a></div>
</div>
</body>
</html>
