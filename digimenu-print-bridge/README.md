# DigiMenu Print Bridge (MVP)

Bridge local para Windows que expoe uma API HTTP no loopback para o DigiMenu Web detectar impressoras.

## Arquitetura

```text
DigiMenu Web
  -> http://127.0.0.1:48931
  -> DigiMenu Print Bridge (Electron + Express)
  -> Impressoras do Windows (Get-Printer / spooler)
```

## Estrutura de pastas

```text
digimenu-print-bridge/
  package.json
  .gitignore
  src/
    main.js
    server.js
    printerService.js
    config.js
    logger.js
```

## Endpoints

### `GET /health`

Resposta:

```json
{
  "ok": true,
  "app": "DigiMenu Print Bridge"
}
```

### `GET /printers`

Resposta de exemplo:

```json
{
  "ok": true,
  "printers": [
    {
      "name": "EPSON TM-T20X Receipt",
      "driverName": "EPSON Advanced Printer Driver 6",
      "portName": "USB001",
      "isDefault": true,
      "status": 3,
      "shared": false
    }
  ]
}
```

### `POST /test-print`

Body:

```json
{
  "printerName": "EPSON TM-T20X Receipt"
}
```

Resposta de exemplo:

```json
{
  "ok": true,
  "jobId": "test-1741367680000",
  "result": {
    "ok": true,
    "jobId": "test-1741367680000",
    "jobType": "test-print",
    "contentType": "html",
    "printer": "EPSON TM-T20X Receipt",
    "copies": 1,
    "printedAt": "2026-03-07T15:12:00.000Z"
  }
}
```

### `POST /print`

Body:

```json
{
  "printerName": "EPSON TM-T20X Receipt",
  "jobType": "cupom",
  "contentType": "html",
  "content": "<html><body><h1>Cupom</h1></body></html>",
  "copies": 1,
  "jobId": "pdv-123"
}
```

Resposta de exemplo:

```json
{
  "ok": true,
  "jobId": "pdv-123",
  "result": {
    "ok": true,
    "jobId": "pdv-123",
    "jobType": "cupom",
    "contentType": "html",
    "printer": "EPSON TM-T20X Receipt",
    "copies": 1,
    "printedAt": "2026-03-07T15:15:00.000Z"
  }
}
```

## Como rodar localmente

1. Entre na pasta:

```powershell
cd digimenu-print-bridge
```

2. Instale dependencias:

```powershell
npm install
```

3. Rode o app em background (Electron + API):

```powershell
npm run dev
```

4. Teste os endpoints:

```powershell
curl http://127.0.0.1:48931/health
curl http://127.0.0.1:48931/printers
curl -X POST http://127.0.0.1:48931/test-print -H "Content-Type: application/json" -d "{\"printerName\":\"EPSON TM-T20X Receipt\"}"
curl -X POST http://127.0.0.1:48931/print -H "Content-Type: application/json" -d "{\"printerName\":\"EPSON TM-T20X Receipt\",\"jobType\":\"cupom\",\"contentType\":\"html\",\"content\":\"<html><body><h1>Teste</h1></body></html>\",\"copies\":1,\"jobId\":\"pdv-123\"}"
```
