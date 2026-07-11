<?php
/**
 * Örnek Widget Modülü — main.php
 * Bu dosya Module::boot() tarafından yüklenir.
 * Hook ve filter sistemiyle ana sistemi genişletebilirsiniz.
 */
defined('ROOT') or die();

// Örnek: Admin menüsüne yeni sayfa ekle
Hook::addFilter('ap_admin_nav', function(array $nav) {
    $nav[] = [
        'label' => 'Örnek Modül',
        'url'   => '/admin/?page=ornek-widget',
        'icon'  => 'package',
        'page'  => 'ornek-widget',
    ];
    return $nav;
});

// Örnek: Yeni admin sayfası kaydet
Hook::addFilter('ap_admin_pages', function(array $pages) {
    $pages['ornek-widget'] = __DIR__ . '/admin-page.php';
    return $pages;
});
