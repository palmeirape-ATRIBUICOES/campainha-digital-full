# Script de Deploy para Produção (Estável)
$ErrorActionPreference = "Stop"
$gitPath = "C:\ProgramData\thiag\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe"

Write-Host "1. Mudando para a branch production..."
& $gitPath checkout production

Write-Host "2. Sincronizando a branch production local..."
& $gitPath pull origin production

Write-Host "3. Trazendo as alterações da branch main (desenvolvimento)..."
& $gitPath merge main --no-edit

Write-Host "4. Enviando a versão estável para o GitHub (Dispara o Deploy Oficial)..."
& $gitPath push origin production

Write-Host "5. Voltando para a branch main para continuar desenvolvimento..."
& $gitPath checkout main

Write-Host "DEPLOY DE PRODUÇÃO CONCLUÍDO COM SUCESSO!"
