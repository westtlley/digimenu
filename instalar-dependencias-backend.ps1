# Script para instalar dependências do backend
Write-Host "📦 Instalando dependências do backend..." -ForegroundColor Cyan

# Navegar para o diretório backend
$backendPath = Join-Path $PSScriptRoot "backend"

if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "✅ Diretório encontrado: $backendPath" -ForegroundColor Green
    
    # Instalar dependências
    Write-Host "📥 Executando npm install..." -ForegroundColor Yellow
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    }
    
    # Voltar para o diretório original
    Set-Location $PSScriptRoot
} else {
    Write-Host "❌ Diretório backend não encontrado em: $backendPath" -ForegroundColor Red
    Write-Host "📂 Diretório atual: $PSScriptRoot" -ForegroundColor Yellow
}
