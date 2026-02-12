# 🚀 Instruções de Uso - DigiMenu

## ✅ Estrutura Criada

✅ Backend Node.js/Express completo em `backend/`
✅ Frontend configurado para usar API própria
✅ Dependência do Base44 SDK removida
✅ Cliente de API genérico criado

## 📋 Passos para Executar

### 1. Criar arquivo .env

Na **raiz do projeto**, crie um arquivo `.env` com:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. Instalar e rodar o Backend

```bash
cd backend
npm install
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### 3. Instalar e rodar o Frontend

Em outro terminal:

```bash
npm install
npm run dev
```

## 🧪 Testar

1. **Backend**: Acesse `http://localhost:3000/api/health` - deve retornar `{"status":"ok"}`

2. **Frontend**: A aplicação deve carregar sem erros

3. **Login**: Use qualquer email/senha (autenticação fake para desenvolvimento)

## 📁 Estrutura

```
digimenu/
├── backend/
│   ├── server.js          # Servidor Express
│   ├── package.json      # Dependências do backend
│   └── README.md         # Documentação do backend
├── src/
│   └── api/
│       ├── apiClient.js      # Cliente de API genérico
│       └── base44Client.js    # Wrapper compatível
├── .env                  # Configurações (CRIAR)
└── package.json          # Dependências do frontend
```

## 🔧 Funcionalidades do Backend

### Autenticação
- ✅ `POST /api/auth/login` - Login (aceita qualquer email/senha)
- ✅ `GET /api/auth/me` - Obtém usuário atual

### CRUD Genérico
- ✅ `GET /api/entities/:entity` - Lista (com filtros e ordenação)
- ✅ `GET /api/entities/:entity/:id` - Obtém por ID
- ✅ `POST /api/entities/:entity` - Cria
- ✅ `PUT /api/entities/:entity/:id` - Atualiza
- ✅ `DELETE /api/entities/:entity/:id` - Deleta
- ✅ `POST /api/entities/:entity/bulk` - Cria múltiplos

### Funções
- ✅ `POST /api/functions/:name` - Invoca função customizada

## ⚠️ Importante

- O backend usa **banco em memória** (dados são perdidos ao reiniciar)
- A autenticação é **fake** (aceita qualquer credencial)
- Para produção, implemente:
  - Banco de dados real (PostgreSQL, MongoDB, etc.)
  - Autenticação JWT real
  - Validação de dados
  - Logs e monitoramento

## 🐛 Troubleshooting

### Backend não inicia
- Verifique se a porta 3000 está livre
- Execute `npm install` na pasta `backend/`

### Frontend não conecta
- Verifique se o arquivo `.env` existe na raiz
- Verifique se o backend está rodando
- Reinicie o servidor de desenvolvimento após criar o `.env`

### Erros de importação
- Execute `npm install` na raiz do projeto
- Verifique se todas as dependências estão instaladas

## 📚 Documentação Adicional

- `backend/README.md` - Documentação do backend
- `SETUP.md` - Guia de setup detalhado
- `MIGRATION.md` - Guia de migração do Base44
