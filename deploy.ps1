# Script de Deploy para Campainha Digital
$ErrorActionPreference = "Continue"

Write-Host "INICIANDO DEPLOY PARA O GITHUB..."

$gitPath = "C:\Program Files\Git\mingw64\libexec\git-core\git.exe"

Write-Host "Adicionando arquivos..."
& $gitPath add .

$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
$message = "Deploy automatico: $timestamp"

Write-Host "Criando commit..."
& $gitPath commit -m "$message"

Write-Host "Pushing to GitHub..."
& $gitPath push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "DEPLOY CONCLUIDO COM SUCESSO!"
} else {
    Write-Host "ERRO NO DEPLOY: Verifique suas credenciais do GitHub."
}
