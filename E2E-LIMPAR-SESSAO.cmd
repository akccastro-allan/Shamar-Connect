@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ====================================================
echo SHAMAR CONNECT - LIMPAR SESSAO E2E LOCAL
echo ====================================================
echo Este comando remove somente a sessão E2E local deste projeto.
echo Ele não remove node_modules, test-results nem arquivos fora do projeto.
echo ====================================================
echo.
set /p CONFIRMACAO=Digite exatamente APAGAR SESSAO LOCAL E2E para continuar: 

if not "%CONFIRMACAO%"=="APAGAR SESSAO LOCAL E2E" (
  echo Confirmação incorreta. Nada foi removido.
  goto end
)

if exist "%CD%\.auth\operations.json" del /f /q "%CD%\.auth\operations.json" >nul 2>nul
if exist "%CD%\.auth\browser-profile" rmdir /s /q "%CD%\.auth\browser-profile" >nul 2>nul

echo Sessão E2E local removida com segurança.

:end
echo.
echo Pressione qualquer tecla para fechar.
pause >nul
endlocal
