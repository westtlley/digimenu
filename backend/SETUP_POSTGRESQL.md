# 🗄️ Configuração PostgreSQL - DigiMenu

## Visão Geral

O sistema agora suporta PostgreSQL para persistência de dados com isolamento por assinante (multi-tenancy). Se `DATABASE_URL` não estiver configurado, o sistema usa fallback em memória com arquivos JSON.

## 🚀 Configuração Rápida

### 1. Criar Banco de Dados no Render

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `digimenu-db`
   - **Database**: `digimenu`
   - **User**: `digimenu_user`
   - **Region**: Escolha a mais próxima
4. Copie a **Internal Database URL**

### 2. Configurar Variável de Ambiente

No Render, adicione a variável de ambiente:

```env
DATABASE_URL=postgresql://digimenu_user:senha@host:5432/digimenu
```

**Importante**: Use a **Internal Database URL** se o backend estiver no mesmo serviço do Render, ou a **External Database URL** se estiver em outro lugar.

### 3. Deploy

O sistema automaticamente:
- ✅ Detecta `DATABASE_URL`
- ✅ Conecta ao PostgreSQL
- ✅ Executa migração do schema
- ✅ Cria tabelas necessárias
- ✅ Insere usuário admin padrão

## 📋 Estrutura do Banco

### Tabelas Principais

- **`users`**: Usuários do sistema
- **`subscribers`**: Assinantes (multi-tenancy)
- **`customers`**: Clientes dos assinantes
- **`entities`**: Entidades genéricas (Dish, Category, Store, etc.)

### Multi-Tenancy

Cada assinante tem seus dados isolados através do campo `subscriber_email`:
- **Master**: Vê todos os dados (`subscriber_email = NULL`)
- **Assinante**: Vê apenas seus dados (`subscriber_email = seu_email`)

## 🔧 Desenvolvimento Local

### Opção 1: PostgreSQL Local

```bash
# Instalar PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Criar banco
createdb digimenu

# Configurar .env
echo "DATABASE_URL=postgresql://seu_usuario@localhost:5432/digimenu" > backend/.env
```

### Opção 2: Docker

```bash
docker run --name digimenu-postgres \
  -e POSTGRES_PASSWORD=senha \
  -e POSTGRES_DB=digimenu \
  -p 5432:5432 \
  -d postgres:15

# .env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/digimenu
```

### Opção 3: Sem PostgreSQL (Fallback)

Se não configurar `DATABASE_URL`, o sistema usa arquivos JSON automaticamente.

## 📊 Migração Manual

Se precisar executar a migração manualmente:

```bash
cd backend
node db/migrate.js
```

## 🔍 Verificar Conexão

O servidor mostra no console:
- ✅ `Conectado ao PostgreSQL` - Conexão OK
- ✅ `Banco de dados PostgreSQL pronto!` - Schema criado
- ⚠️ `DATABASE_URL não configurado` - Usando fallback

## 🛠️ Troubleshooting

### Erro: "relation does not exist"
**Solução**: Execute a migração manualmente ou verifique se o schema foi criado.

### Erro: "password authentication failed"
**Solução**: Verifique se `DATABASE_URL` está correto.

### Erro: "connection refused"
**Solução**: 
- Verifique se o PostgreSQL está rodando
- Verifique firewall/portas
- Use Internal Database URL no Render

## 📝 Variáveis de Ambiente Necessárias

```env
# Obrigatório para PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database

# Opcionais
PORT=3000
NODE_ENV=production
JWT_SECRET=seu-secret-aqui
FRONTEND_URL=https://seu-frontend.com
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

## 🎯 Próximos Passos

1. ✅ Configure `DATABASE_URL` no Render
2. ✅ Faça deploy do backend
3. ✅ Verifique os logs para confirmar conexão
4. ✅ Teste criação de pratos/entidades
5. ✅ Verifique isolamento entre assinantes

## 📚 Recursos

- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Render PostgreSQL](https://render.com/docs/databases)
- [Node.js pg](https://node-postgres.com/)
