@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ====================================================
echo SHAMAR CONNECT - VALIDACAO E2E READ-ONLY
echo ====================================================
echo Este teste é somente leitura.
echo Nenhum bootstrap, incremental, reconciliação ou envio será executado.
echo ====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js não encontrado no PATH.
  goto end
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm não encontrado no PATH.
  goto end
)

if not exist "%CD%\node_modules" (
  echo ERRO: node_modules não existe. Rode npm install antes.
  goto end
)

if not exist "%CD%\.auth\operations.json" (
  echo ERRO: sessão local ausente.
  echo Execute primeiro E2E-LOGIN-CENTRO-DE-COMANDO.cmd e aguarde "Sessão salva".
  goto end
)

echo Iniciando smoke read-only do Centro de Comando...
call npm run e2e:operations:read
if errorlevel 1 goto failed

echo.
echo Iniciando smoke visual...
call npm run e2e:operations:visual
if errorlevel 1 goto failed

echo.
echo Iniciando readiness read-only da Lips...
call npm run e2e:lips:readiness
if errorlevel 1 goto failed

echo.
echo RESUMO: todos os smokes read-only foram concluídos com sucesso.
goto end

:failed
echo.
echo RESUMO: algum smoke read-only falhou. Revise a saída sanitizada acima.

:end
echo.
echo Pressione qualquer tecla para fechar.
pause >nul
endlocal
