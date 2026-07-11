<?php
/**
 * AhenkPress — Genel AJAX API
 * Endpoints: category_posts | next_article | yazar_yazilari
 */
define('ROOT', dirname(dirname(__FILE__)));
require_once ROOT . '/core/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

// Sadece AJAX isteklerine izin ver
if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) !== 'xmlhttprequest') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {

    // ── Kategori Haberleri (Infinity Scroll) ─────────────────────────
    case 'category_posts':
        $catId   = max(0, (int)($_GET['cat_id'] ?? 0));
        $page    = max(1, (int)($_GET['page'] ?? 2));
        $perPage = max(6, min(36, (int)($_GET['per_page'] ?? 18)));
        $offset  = ($page - 1) * $perPage;

        if (!$catId) { echo json_encode(['success'=>false,'message'=>'Geçersiz kategori']); exit; }

        try {
            $total  = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='news' AND status='published' AND category_id=?", [$catId]);
            $posts  = PostType::getPosts(['post_type'=>'news','status'=>'published','category_id'=>$catId,'limit'=>$perPage,'offset'=>$offset]);
            $hasMore = ($page * $perPage) < $total;

            $result = [];
            foreach ($posts as $p) {
                $result[] = [
                    'id'          => $p['id'],
                    'title'       => e($p['title']),
                    'slug'        => $p['slug'],
                    'url'         => ap_url($p['slug']),
                    'cover_image' => ap_thumb_url($p['cover_image']),
                    'is_breaking' => (bool)$p['is_breaking'],
                    'time_ago'    => ap_time_ago($p['published_at'] ?? $p['created_at']),
                    'cat_name'    => e($p['cat_name'] ?? ''),
                ];
            }

            echo json_encode(['success'=>true,'posts'=>$result,'has_more'=>$hasMore,'total'=>$total]);
        } catch (\Throwable $e) {
            echo json_encode(['success'=>false,'message'=>'Sunucu hatası']);
        }
        break;

    // ── Sıradaki Haber (Single.php Infinite Scroll) ─────────────────
    case 'next_article':
        $catId    = (int)($_GET['cat_id'] ?? 0);
        $currentId= (int)($_GET['current_id'] ?? 0);
        $page     = max(1, (int)($_GET['page'] ?? 1));

        try {
            // Aynı kategoriden, mevcut haberden sonraki haber
            $where = $catId ? "AND category_id=$catId" : '';
            $nextPost = DB::queryRow(
                "SELECT p.*, c.name AS cat_name, c.slug AS cat_slug, c.color AS cat_color
                 FROM `{p}posts` p
                 LEFT JOIN `{p}categories` c ON c.id=p.category_id
                 WHERE p.status='published' AND p.post_type='news' AND p.id!=? $where
                 ORDER BY p.published_at DESC
                 LIMIT 1 OFFSET ?",
                [$currentId, $page - 1]
            );

            if (!$nextPost) {
                echo json_encode(['success'=>false,'html'=>null]);
                exit;
            }

            // Okuma süresi hesapla
            $wordCount = str_word_count(strip_tags($nextPost['content'] ?? ''));
            $readTime  = max(1, (int)ceil($wordCount / 200));
            $renk      = $nextPost['cat_color'] ?? '#CC0000';
            $postUrl   = ap_url($nextPost['slug']);

            ob_start();
            ?>
            <article style="background:#fff;border-radius:10px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.07);margin-bottom:20px">
              <?php if ($nextPost['cat_name']): ?>
              <a href="<?= e(ap_url($nextPost['cat_slug'])) ?>"
                 style="display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;padding:3px 10px;border:1.5px solid <?= e($renk) ?>;border-radius:3px;color:<?= e($renk) ?>;text-decoration:none;margin-bottom:10px">
                <?= e($nextPost['cat_name']) ?>
              </a>
              <?php endif; ?>
              <h2 style="font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.35;margin:0 0 14px">
                <a href="<?= e($postUrl) ?>" style="color:inherit;text-decoration:none"><?= e($nextPost['title']) ?></a>
              </h2>
              <?php if ($nextPost['excerpt']): ?>
              <p style="font-size:15px;color:#555;border-left:4px solid <?= e($renk) ?>;padding-left:14px;margin:0 0 14px;line-height:1.7;font-style:italic"><?= e(mb_substr($nextPost['excerpt'],0,200)) ?></p>
              <?php endif; ?>
              <div style="display:flex;align-items:center;gap:14px;font-size:12px;color:#888;margin-bottom:16px">
                <span><i class="fa fa-clock"></i> <?= ap_date($nextPost['published_at']??$nextPost['created_at'],'d M Y H:i') ?></span>
                <span style="background:#f0f0f0;padding:2px 8px;border-radius:10px;font-weight:600"><i class="fa fa-book-open"></i> <?= $readTime ?> dk</span>
              </div>
              <?php if ($nextPost['cover_image']): ?>
              <a href="<?= e($postUrl) ?>">
                <img src="<?= e(ap_thumb_url($nextPost['cover_image'])) ?>" alt="<?= e($nextPost['title']) ?>"
                     style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;display:block;margin-bottom:16px">
              </a>
              <?php endif; ?>
              <div style="font-size:16px;line-height:1.8;color:#222"><?= $nextPost['content'] ?></div>
              <div style="text-align:center;margin-top:20px">
                <a href="<?= e($postUrl) ?>" style="display:inline-block;background:<?= e($renk) ?>;color:#fff;padding:10px 28px;border-radius:8px;font-weight:700;text-decoration:none">
                  Haberin Tamamını Oku →
                </a>
              </div>
            </article>
            <?php
            $html = ob_get_clean();

            echo json_encode([
                'success' => true,
                'html'    => $html,
                'post_id' => $nextPost['id'],
                'url'     => $postUrl,
                'title'   => $nextPost['title'],
            ]);
        } catch (\Throwable $e) {
            echo json_encode(['success'=>false,'message'=>'Sunucu hatası']);
        }
        break;

    // ── Yazarın Diğer Yazıları ───────────────────────────────────────
    case 'yazar_yazilari':
        $yazarId  = max(0, (int)($_GET['yazar_id'] ?? 0));
        $page     = max(1, (int)($_GET['page'] ?? 2));
        $currentId= (int)($_GET['current_id'] ?? 0);
        $perPage  = 6;
        $offset   = ($page - 1) * $perPage;

        if (!$yazarId) { echo json_encode(['success'=>false]); exit; }

        try {
            $total = (int)DB::queryValue("SELECT COUNT(*) FROM `{p}posts` WHERE post_type='columnist' AND status='published' AND columnist_id=? AND id!=?", [$yazarId, $currentId]);
            $yazilar = PostType::getPosts(['post_type'=>'columnist','status'=>'published','columnist_id'=>$yazarId,'limit'=>$perPage,'offset'=>$offset]);
            $yazilar = array_values(array_filter($yazilar, fn($p) => $p['id'] !== $currentId));

            $html = '';
            foreach ($yazilar as $yz) {
                $thumb = ap_thumb_url($yz['cover_image']);
                $url   = ap_url($yz['slug']);
                $html .= '<article class="yazar-yazi-kart"><a href="' . e($url) . '">'
                    . '<div class="yyz-resim" style="background-image:url(\'' . e($thumb) . '\')"></div>'
                    . '<h4 class="yyz-baslik">' . e(mb_substr($yz['title'],0,70)) . '</h4>'
                    . '<div class="yyz-tarih"><i class="fa fa-clock"></i> ' . ap_time_ago($yz['published_at']??$yz['created_at']) . '</div>'
                    . '</a></article>';
            }

            echo json_encode(['success'=>true,'html'=>$html,'has_more'=> ($page * $perPage) < $total]);
        } catch (\Throwable $e) {
            echo json_encode(['success'=>false]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['success'=>false,'message'=>'Bilinmeyen işlem']);
}
