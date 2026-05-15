@echo off
SET GIT_PATH="C:\Program Files\Git\mingw64\libexec\git-core\git.exe"
%GIT_PATH% add .
%GIT_PATH% commit -m "Deploy automatico"
%GIT_PATH% push origin main
pause
