@echo off
SET GIT_PATH="C:\Program Files\Git\mingw64\libexec\git-core\git.exe"
echo [DEPLOY] Iniciando deploy via CMD...
%GIT_PATH% add .
%GIT_PATH% commit -m "Deploy via CMD"
echo [DEPLOY] Enviando para o GitHub...
%GIT_PATH% push origin main
if %ERRORLEVEL% EQU 0 (
    echo [OK] Deploy concluido com sucesso!
) else (
    echo [ERRO] Falha no deploy. Verifique se o Git Credential Manager esta funcionando.
)
pause
