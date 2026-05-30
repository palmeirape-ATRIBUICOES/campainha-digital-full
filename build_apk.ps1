# Script de Compilação e Assinatura Automatizada do App Android (Campainha Digital)
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " INICIANDO COMPILACAO DO APP ANDROID (CAMPAINHA DIGITAL)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Garante que a Keystore existe
$keystorePath = "C:\Users\thiag\OneDrive\Área de Trabalho\campainha digital\android.keystore"
$keytoolPath = "C:\Users\thiag\.bubblewrap\jdk\jdk-17.0.11+9\bin\keytool.exe"

if (!(Test-Path $keystorePath)) {
    Write-Host "[KEYSTORE] android.keystore nao encontrada. Gerando chave de assinatura..." -ForegroundColor Yellow
    & $keytoolPath -genkeypair -v -keystore $keystorePath -alias android-alias -keyalg RSA -keysize 2048 -validity 10000 -storepass "senha123" -keypass "senha123" -dname "CN=Campainha Digital, OU=Mobile, O=Campainha Digital, L=Palmeira, S=Pernambuco, C=BR"
    Write-Host "[KEYSTORE] android.keystore criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[KEYSTORE] android.keystore ja existe. Prosseguindo..." -ForegroundColor Green
}

# 2. Prepara as respostas automatizadas para o 'bubblewrap init'
Write-Host "[INIT] Inicializando o projeto Android Bubblewrap..." -ForegroundColor Yellow

# Respostas para as perguntas interativas do init:
# 1. Domain (press Enter)
# 2. URL path (press Enter)
# 3. Application name (press Enter)
# 4. Short name (press Enter)
# 5. Package ID: br.com.campainhadigital.app (customizado!)
# 6. Version name (press Enter)
# 7. Version code (press Enter)
# 8. Display mode (press Enter)
# 9. Orientation (press Enter)
# 10. Theme color (press Enter)
# 11. Background color (press Enter)
# 12. Navigation color (press Enter)
# 13. Navigation color dark (press Enter)
# 14. Navigation color legacy (press Enter)
# 15. Splash screen fade duration (press Enter)
# 16. Site settings shortcut (press Enter)
# 17. Include dark theme support (press Enter)
# 18. Enable notifications (press Enter)
# 19. Include Play Billing (press Enter)
# 20. Signing key path: ./android.keystore
# 21. Key alias: android-alias
$initInputs = @(
    "", 
    "", 
    "", 
    "", 
    "br.com.campainhadigital.app", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "", 
    "./android.keystore", 
    "android-alias"
)
$initInputString = [string]::Join("`r`n", $initInputs) + "`r`n"

# Remove twa-manifest.json antigo se houver para evitar loops de reconfiguração
if (Test-Path "twa-manifest.json") {
    Remove-Item "twa-manifest.json" -Force
}

$initInputString | npx @bubblewrap/cli init --manifest=https://palmeirape-atribuicoes.github.io/campainha-digital-full/manifest.json

Write-Host "[INIT] Projeto Android inicializado com sucesso!" -ForegroundColor Green

# 3. Prepara as senhas automatizadas para o 'bubblewrap build'
Write-Host "[BUILD] Compilando e assinando os pacotes (APK & AAB)..." -ForegroundColor Yellow

# Respostas de senha para o build:
# 1. Password for the Key Store: senha123
# 2. Password for the Key: senha123
$buildInputs = @(
    "senha123",
    "senha123"
)
$buildInputString = [string]::Join("`r`n", $buildInputs) + "`r`n"

# Executa compilação do APK e App Bundle AAB
$buildInputString | npx @bubblewrap/cli build

Write-Host "[BUILD] Compilacao concluida com sucesso!" -ForegroundColor Green

# 4. Copia os arquivos de saída para fácil acesso
Write-Host "[EXPORT] Copiando pacotes gerados para a pasta raiz..." -ForegroundColor Yellow

$apkSource = Get-ChildItem -Path . -Filter "*release-signed.apk" -Recurse | Select-Object -First 1 -ExpandProperty FullName
$aabSource = Get-ChildItem -Path . -Filter "*release-signed.aab" -Recurse | Select-Object -First 1 -ExpandProperty FullName

if ($apkSource) {
    Copy-Item $apkSource ".\CampainhaDigital.apk" -Force
    Write-Host "[EXPORT] APK gerado em: .\CampainhaDigital.apk" -ForegroundColor Green
} else {
    Write-Warning "APK assinado de release nao foi encontrado."
}

if ($aabSource) {
    Copy-Item $aabSource ".\CampainhaDigital.aab" -Force
    Write-Host "[EXPORT] AAB (Bundle da Play Store) gerado em: .\CampainhaDigital.aab" -ForegroundColor Green
} else {
    Write-Warning "AAB (Bundle da Play Store) assinado de release nao foi encontrado."
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " PROCESSO DE COMPILACAO CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
