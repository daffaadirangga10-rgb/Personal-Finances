# zip-project.ps1
#
# Zip folder project ini jadi satu file, tapi otomatis skip:
# - .env (kredensial asli, jangan pernah ikut ter-share)
# - node_modules (besar, tinggal `npm install` ulang di sisi penerima)
# - dist (hasil build, bisa di-generate ulang dari source)
# - .git (riwayat commit, biasanya tidak perlu ikut saat share biasa)
#
# Cara pakai:
#   1. Taruh file ini di root folder project (sejajar dengan package.json)
#   2. Klik kanan folder project -> "Open in Terminal" (akan buka PowerShell)
#   3. Jalankan: powershell -ExecutionPolicy Bypass -File zip-project.ps1
#   4. Hasilnya: <nama-folder-project>.zip di folder yang sama

$ProjectName = Split-Path -Leaf (Get-Location)
$Output = "$ProjectName.zip"
$TempFolder = Join-Path $env:TEMP "zip-staging-$ProjectName"

# Folder/file yang mau di-skip
$ExcludeNames = @("node_modules", ".env", ".env.local", "dist", "dist-ssr", ".git", "$Output")

# Bersihkan temp folder lama kalau ada, lalu buat staging folder baru
if (Test-Path $TempFolder) { Remove-Item $TempFolder -Recurse -Force }
New-Item -ItemType Directory -Path $TempFolder | Out-Null

# Salin semua isi project ke staging folder, kecuali yang di-exclude
Get-ChildItem -Path . -Force | Where-Object {
    $ExcludeNames -notcontains $_.Name
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $TempFolder -Recurse -Force
}

# Hapus zip lama kalau ada
if (Test-Path $Output) { Remove-Item $Output -Force }

# Compress staging folder jadi zip
Compress-Archive -Path "$TempFolder\*" -DestinationPath $Output -Force

# Bersihkan staging folder
Remove-Item $TempFolder -Recurse -Force

Write-Host ""
Write-Host "Selesai! Dibuat: $Output"
Write-Host "Catatan: .env, node_modules, dist, dan .git sengaja tidak ikut."
Write-Host "Sebelum pakai project hasil unzip, jalankan 'npm install' dan siapkan .env dari .env.example."
