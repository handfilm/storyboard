$ErrorActionPreference = "Stop"
Write-Host "1. Pulling latest updates from GitHub..." -ForegroundColor Cyan
git fetch origin
git reset --hard origin/main

Write-Host "2. Building Web Production Bundle..." -ForegroundColor Cyan
npm install
npm run build

Write-Host "3. Building Android APK..." -ForegroundColor Cyan
npx cap sync android
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
New-Item -ItemType Directory -Force -Path "public\downloads" | Out-Null
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" -Destination "public\downloads\HandFilm-Studio.apk" -Force

Write-Host "4. Building Windows EXE Installer..." -ForegroundColor Cyan
npx @tauri-apps/cli build
$exe = Get-ChildItem "src-tauri\target\release\bundle\nsis\*.exe" | Select-Object -First 1
Copy-Item $exe.FullName -Destination "public\downloads\HandFilm-Studio-Setup.exe" -Force

Write-Host "5. Re-bundling & Publishing Live to GitHub..." -ForegroundColor Cyan
npm run build
git add .
git commit -m "Auto-release Web, Windows EXE, and Android APK"
git push origin main

Write-Host "DONE! Both EXE and APK are updated and live in public/downloads/." -ForegroundColor Green
dir public\downloads
