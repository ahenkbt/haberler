# Goalgo — Railway medya volume teşhisi ve kurtarma adımları (Windows PowerShell)
# Önkoşul: https://docs.railway.com/develop/cli — `railway login` ve proje linkli
#
# Kullanım:
#   cd goalgo
#   .\scripts\recover-media-volume.ps1
#   .\scripts\recover-media-volume.ps1 -Service "goalgo" -BackupProject "goalgo-2024-05-12"
#
param(
  [string]$Service = "goalgo",
  [string]$BackupProject = "goalgo-2024-05-12",
  [string]$VolumeMount = "/mnt/media-uploads",
  [string]$LegacyPath = "/app/data/media-uploads"
)

$ErrorActionPreference = "Stop"

function Invoke-RailwaySh([string]$Script) {
  $escaped = $Script -replace '"', '\"'
  railway run --service $Service sh -c $escaped
}

Write-Host ""
Write-Host "=== Goalgo medya volume teşhisi ===" -ForegroundColor Cyan
Write-Host "Servis: $Service"
Write-Host ""

if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  Write-Host "HATA: railway CLI yok. Kurun: npm i -g @railway/cli ; railway login" -ForegroundColor Red
  exit 1
}

Write-Host "--- Ortam (canlı konteyner) ---" -ForegroundColor Yellow
Invoke-RailwaySh @"
echo RAILWAY_VOLUME_MOUNT_PATH=\$RAILWAY_VOLUME_MOUNT_PATH
echo MEDIA_UPLOAD_ROOT=\${MEDIA_UPLOAD_ROOT:-(yok)}
MOUNT=\${RAILWAY_VOLUME_MOUNT_PATH:-$VolumeMount}
echo Kullanilan mount: \$MOUNT
if [ -d \"\$MOUNT\" ]; then
  echo Volume dosya sayisi:
  find \"\$MOUNT\" -type f 2>/dev/null | wc -l
  echo Ilk 15 dosya:
  find \"\$MOUNT\" -type f 2>/dev/null | head -15
else
  echo UYARI: \$MOUNT dizini yok
fi
"@

Write-Host ""
Write-Host "--- Eski Docker yolu ($LegacyPath) ---" -ForegroundColor Yellow
Invoke-RailwaySh @"
if [ -d \"$LegacyPath\" ]; then
  echo Legacy dosya sayisi:
  find \"$LegacyPath\" -type f 2>/dev/null | wc -l
else
  echo Legacy dizin yok
fi
"@

Write-Host ""
Write-Host "--- Ornek 404 dosya kontrolu ---" -ForegroundColor Yellow
Write-Host "Asagidaki FILE adini bilinen kirik dosya ile degistirin:"
Write-Host '  railway run --service goalgo sh -c "test -f /mnt/media-uploads/DOSYA.jpg && echo VAR || echo YOK"'
Write-Host ""

Write-Host "=== Yedek proje: $BackupProject ===" -ForegroundColor Cyan
Write-Host @"
1. https://railway.app → proje **$BackupProject** (canvas / yedek node)
2. **Volumes** → **goalgo-volume** → hangi servise bagli oldugunu not edin
3. O serviste shell veya bu script ile ayni komutlari calistirin:
     railway link   # yedek projeyi secin
     railway run --service SERVIS_ADI sh -c "find /mnt/media-uploads -type f | wc -l"
4. Dosyalar yedekte varsa, canli **$Service** volume'una kopyalama:
   - Railway panel: Volume → (destekleniyorsa) snapshot / clone
   - veya gecici bir shell konteynerinde:
       tar -czf /tmp/media-backup.tgz -C /mnt/media-uploads .
     yedekten arşivi indirip canli servise yukleyip:
       tar -xzf /tmp/media-backup.tgz -C /mnt/media-uploads
5. Canli serviste Volume mount path **$VolumeMount** veya **$LegacyPath** (/app/data/media-uploads) ile
   Deploy Logs'taki mediaRoot satiri AYNI olmali. Mount /mnt/media-uploads ise MEDIA_UPLOAD_ROOT eklemeyin.

Kalici bulut depolama (R2/S3) icin Railway Variables:
  S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT (R2 icin),
  S3_PUBLIC_BASE_URL (ornek: https://pub-xxxx.r2.dev veya ozel domain)

API teşhis (panel oturumu veya ADMIN_MAINTENANCE_SECRET):
  GET  /api/media/missing-uploads
  POST /api/media/repair-external-images  body: { "limit": 50 }
"@

Write-Host ""
Write-Host "Bitti." -ForegroundColor Green
