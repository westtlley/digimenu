# Guia de Setup - DigiMenu

## 🚀 Configuração Rápida

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### 2. Frontend

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Depois:

```bash
npm install
npm run dev
```

## 📁 Estrutura do Projeto

```
digimenu/
├── backend/           # Backend Node.js/Express
│   ├── server.js     # Servidor principal
│   └── package.json  # Dependências do backend
├── src/              # Frontend React
│   └── api/          # Cliente de API
│       ├── apiClient.js      # Cliente genérico
│       └── base44Client.js   # Wrapper compatível
└── .env              # Configurações (criar)
```

## ✅ Verificação

1. Backend rodando: Acesse `http://localhost:3000/api/health`
2. Frontend rodando: A aplicação deve carregar sem erros
3. Login: Use qualquer email/senha (autenticação fake para desenvolvimento)

## 🔧 Troubleshooting

### Backend não inicia
- Verifique se a porta 3000 está livre
- Execute `npm install` na pasta `backend/`

### Frontend não conecta
- Verifique se o arquivo `.env` existe e tem `VITE_API_BASE_URL`
- Verifique se o backend está rodando
- Reinicie o servidor de desenvolvimento do frontend após criar o `.env`

### Erros de importação
- Execute `npm install` na raiz do projeto
- Verifique se todas as dependências estão instaladas
