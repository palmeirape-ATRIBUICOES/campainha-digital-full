@echo off
setlocal enabledelayedexpansion

echo [DEPLOY] Procurando executavel do Git...

:: Tentar caminhos - Preferindo GitHub Desktop que geralmente ja esta autenticado
set "GIT_PATH="
if exist "C:\ProgramData\thiag\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe" set "GIT_PATH=C:\ProgramData\thiag\GitHubDesktop\app-3.5.8\resources\app\git\cmd\git.exe"
if not defined GIT_PATH if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_PATH=C:\Program Files\Git\cmd\git.exe"
if not defined GIT_PATH if exist "C:\Program Files\Git\mingw64\libexec\git-core\git.exe" set "GIT_PATH=C:\Program Files\Git\mingw64\libexec\git-core\git.exe"

if not defined GIT_PATH (
    echo [ERRO] Git nao encontrado.
    pause
    exit /b 1
)

echo [DEPLOY] Usando: !GIT_PATH!
echo [DEPLOY] Sincronizando arquivos...

"!GIT_PATH!" add .
"!GIT_PATH!" commit -m "Deploy via CMD"

echo [DEPLOY] Enviando para o GitHub (origin main)...
"!GIT_PATH!" push origin main

if !ERRORLEVEL! EQU 0 (
    echo [OK] DEPLOY REALIZADO COM SUCESSO!
) else (
    echo [ERRO] Falha no envio.
    echo Se voce estiver logado no GitHub Desktop, o deploy deveria funcionar.
)

pause
