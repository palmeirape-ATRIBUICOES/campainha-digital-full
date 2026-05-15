# Script de Deploy para Campainha Digital
$ErrorActionPreference = "Continue"

Write-Host "INICIANDO DEPLOY PARA O GITHUB..."

$gitPath = "C:\ProgramData\thiag\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe"

Write-Host "Adicionando arquivos..."
& $gitPath add .

$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
$message = "Deploy via Antigravity: $timestamp"

Write-Host "Criando commit..."
& $gitPath commit -m "$message"

Write-Host "Pushing to GitHub (origin main)..."
& $gitPath push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "DEPLOY CONCLUIDO COM SUCESSO!"
} else {
    Write-Host "ERRO NO DEPLOY: Verifique suas credenciais do GitHub."
}
