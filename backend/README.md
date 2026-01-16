# Backend DigiMenu

Backend Node.js/Express para o DigiMenu.

## Instalação

```bash
npm install
```

## Executar

```bash
# Modo desenvolvimento (com watch)
npm run dev

# Modo produção
npm start
```

O servidor rodará na porta 3000 por padrão.

## Estrutura da API

### Autenticação

- `POST /api/auth/login` - Login (retorna token fake)
- `GET /api/auth/me` - Obtém usuário atual

### Entidades (CRUD Genérico)

- `GET /api/entities/:entity` - Lista entidades (suporta filtros e ordenação)
- `GET /api/entities/:entity/:id` - Obtém entidade por ID
- `POST /api/entities/:entity` - Cria nova entidade
- `PUT /api/entities/:entity/:id` - Atualiza entidade
- `DELETE /api/entities/:entity/:id` - Deleta entidade
- `POST /api/entities/:entity/bulk` - Cria múltiplas entidades

### Funções

- `POST /api/functions/:name` - Invoca função customizada

### Integrações

- `POST /api/integrations/email/send` - Envia email (mock)
- `POST /api/integrations/file/upload` - Upload de arquivo (mock)
- `POST /api/integrations/llm/invoke` - Invoca LLM (mock)

## Banco de Dados

### ⚠️ IMPORTANTE: Produção vs Desenvolvimento

**Para produção com assinantes: PostgreSQL é OBRIGATÓRIO.**

O sistema suporta:
- ✅ **PostgreSQL** (recomendado para produção) - Configure `DATABASE_URL`
- ⚠️ **Fallback JSON** (apenas desenvolvimento) - Usado quando `DATABASE_URL` não está configurado

**NUNCA use fallback JSON em produção com assinantes ativos.**

Veja `SETUP_POSTGRESQL.md` para configuração completa.

## Variáveis de Ambiente

Crie um arquivo `.env` na pasta `backend/`:

```env
PORT=3000
NODE_ENV=development
```

## Próximos Passos

1. Implementar banco de dados real
2. Adicionar validação JWT real
3. Implementar upload de arquivos real
4. Adicionar logs e monitoramento
