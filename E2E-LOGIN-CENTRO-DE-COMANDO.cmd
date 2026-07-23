@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ====================================================
echo SHAMAR CONNECT - LOGIN E2E DO CENTRO DE COMANDO
echo ====================================================
echo.
echo Uma janela do navegador será aberta.
echo Entre com allan@moriahsystems.com.br.
echo Conclua o login e aguarde /operations carregar.
echo Não feche esta janela até aparecer "Sessão salva".
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

npm run e2e:auth
if errorlevel 1 (
  echo.
  echo ERRO: login E2E não foi concluído. Nenhum cookie ou token foi exibido.
  goto end
)

if exist "%CD%\.auth\operations.json" (
  echo.
  echo Sessão salva com segurança.
) else (
  echo.
  echo ERRO: .auth\operations.json não foi criado.
)

:end
echo.
echo Pressione qualquer tecla para fechar.
pause >nul
endlocal
