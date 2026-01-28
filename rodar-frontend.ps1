# Script para rodar o frontend
# Este script usa o caminho completo do npm para evitar conflitos

$npmPath = "C:\Program Files\nodejs\npm.cmd"

if (Test-Path $npmPath) {
    Write-Host "🚀 Iniciando servidor de desenvolvimento do frontend..." -ForegroundColor Green
    & $npmPath run dev
} else {
    Write-Host "❌ Erro: npm não encontrado em $npmPath" -ForegroundColor Red
    Write-Host "Por favor, verifique se o Node.js está instalado corretamente." -ForegroundColor Yellow
}
