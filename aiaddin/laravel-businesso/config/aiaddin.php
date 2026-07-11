<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Otomatik veritabanı kurulumu (Docker / Railway)
    |--------------------------------------------------------------------------
    |
    | docker-entrypoint.sh: MySQL erişilebiliyorsa ve şema boşsa
    | public/installer/database.sql dosyasını import eder, ardından storage/installed oluşturur.
    | Web /install sihirbazına gerek kalmaz.
    |
    | Kapatmak için Railway Variables: AIADDIN_AUTO_DATABASE=0
    |
    */
    'auto_database' => filter_var(env('AIADDIN_AUTO_DATABASE', true), FILTER_VALIDATE_BOOLEAN),

    /*
    | Teşhis: GET /healthz + Header: X-Aiaddin-Diag: <AIADDIN_DIAG_SECRET>
    | Railway Variables'a uzun rastgele bir AIADDIN_DIAG_SECRET yazın; şifreyi kimseyle paylaşmayın.
    */
    'diag_secret' => env('AIADDIN_DIAG_SECRET'),

];
