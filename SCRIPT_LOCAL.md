# ⚡ SOLUÇÃO RÁPIDA - SCRIPT AUTOMÁTICO

## Para rodar TUDO local (backend + frontend)

### 1. Copie e cole no PowerShell:

```powershell
# Parar processos anteriores
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force 2>$null

# Ir para pasta do projeto
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu-main (1)\digimenu"

# Configurar backend local
$env:VITE_API_BASE_URL="http://localhost:3000/api"
Set-Content -Path ".env" -Value "VITE_API_BASE_URL=http://localhost:3000/api`nVITE_GOOGLE_MAPS_API_KEY=`nVITE_WS_URL=ws://localhost:3000`nVITE_MERCADOPAGO_PUBLIC_KEY=TEST-9af3e8f4-0e38-4edc-ac7c-1edb7bf8b489"

Write-Host "✅ Configurado para rodar local!" -ForegroundColor Green
Write-Host ""
Write-Host "🔹 Agora abra 2 terminais:" -ForegroundColor Yellow
Write-Host "   Terminal 1: cd backend && npm start" -ForegroundColor Cyan
Write-Host "   Terminal 2: npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Acesse: http://localhost:5173" -ForegroundColor Green
```

### 2. Abra 2 terminais no VSCode/PowerShell:

**Terminal 1 - Backend:**
```bash
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu-main (1)\digimenu\backend"
npm start
```

**Terminal 2 - Frontend:**
```bash
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu-main (1)\digimenu"
npm run dev
```

### 3. Acesse:
http://localhost:5173

---

## 🌐 VOLTAR PARA PRODUÇÃO DEPOIS

Quando quiser voltar a usar o Render:

```powershell
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu-main (1)\digimenu"
Set-Content -Path ".env" -Value "VITE_API_BASE_URL=https://digimenu-backend-3m6t.onrender.com/api`nVITE_GOOGLE_MAPS_API_KEY=`nVITE_WS_URL=wss://digimenu-backend.onrender.com`nVITE_MERCADOPAGO_PUBLIC_KEY=TEST-9af3e8f4-0e38-4edc-ac7c-1edb7bf8b489"
```

Depois reinicie o frontend.
