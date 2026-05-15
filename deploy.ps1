# Script de Deploy Automático para Campainha Digital
$ErrorActionPreference = "Continue"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DEPLOY PARA O GITHUB" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

Write-Host "🔍 Verificando alterações..." -ForegroundColor Gray
& "C:\Program Files\Git\mingw64\libexec\git-core\git.exe" add .

$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
$message = "Deploy automatico: $timestamp"

Write-Host "📝 Criando registro (commit)..." -ForegroundColor Gray
& "C:\Program Files\Git\mingw64\libexec\git-core\git.exe" commit -m "$message"

Write-Host "📤 Enviando arquivos para o servidor (GitHub)..." -ForegroundColor Yellow
& "C:\Program Files\Git\mingw64\libexec\git-core\git.exe" push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "===========================================" -ForegroundColor Green
    Write-Host "✅ DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "===========================================" -ForegroundColor Green
} else {
    Write-Host "===========================================" -ForegroundColor Red
    Write-Host "❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "Verifique suas credenciais do GitHub." -ForegroundColor Red
    Write-Host "===========================================" -ForegroundColor Red
}

Write-Host "Pressione qualquer tecla para sair..."
# Comentado para evitar travamento em execucoes automaticas
# $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
