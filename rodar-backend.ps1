# Script para rodar o backend
# Este script usa o caminho completo do npm para evitar conflitos

$npmPath = "C:\Program Files\nodejs\npm.cmd"
$backendPath = Join-Path $PSScriptRoot "backend"

if (Test-Path $npmPath) {
    Write-Host "🚀 Iniciando servidor de desenvolvimento do backend..." -ForegroundColor Green
    Set-Location $backendPath
    & $npmPath run dev
} else {
    Write-Host "❌ Erro: npm não encontrado em $npmPath" -ForegroundColor Red
    Write-Host "Por favor, verifique se o Node.js está instalado corretamente." -ForegroundColor Yellow
}
