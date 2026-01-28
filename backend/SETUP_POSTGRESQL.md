# 🗄️ Configuração PostgreSQL - DigiMenu SaaS

## ⚠️ IMPORTANTE: Produção vs Desenvolvimento

### 🚨 Para Produção com Assinantes

**PostgreSQL é OBRIGATÓRIO.**

O fallback JSON (sistema de arquivos) é apenas para:
- ✅ Desenvolvimento local
- ✅ Demonstrações rápidas
- ✅ Testes iniciais

**NUNCA use fallback JSON em produção com assinantes ativos.**

### Por quê?

- ❌ **Sem isolamento real**: Risco de vazamento de dados entre assinantes
- ❌ **Sem transações**: Pode perder dados em falhas
- ❌ **Sem escalabilidade**: Não suporta múltiplos assinantes simultâneos
- ❌ **Sem auditoria**: Dificulta rastreamento de mudanças
- ❌ **Sem backup automático**: Depende de sistema de arquivos

## 🚀 Configuração Rápida

### 1. Criar Banco de Dados no Render

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `digimenu-db`
   - **Database**: `digimenu`
   - **User**: `digimenu_user`
   - **Region**: Escolha a mais próxima
   - **Plan**: Escolha conforme volume esperado
4. Copie a **Internal Database URL**

### 2. Configurar Variável de Ambiente

No Render, adicione a variável de ambiente:

```env
DATABASE_URL=postgresql://digimenu_user:senha@host:5432/digimenu
```

**Importante**: 
- Use **Internal Database URL** se o backend estiver no mesmo serviço do Render
- Use **External Database URL** se estiver em outro lugar
- **NUNCA** commite a URL no código

### 3. Deploy

O sistema automaticamente:
- ✅ Detecta `DATABASE_URL`
- ✅ Conecta ao PostgreSQL
- ✅ Executa migração do schema
- ✅ Cria tabelas necessárias
- ✅ Insere usuário admin padrão

## 📋 Estrutura do Banco

### Tabelas Principais

- **`users`**: Usuários do sistema (master e assinantes)
- **`subscribers`**: Assinantes com planos e permissões
- **`customers`**: Clientes dos assinantes
- **`entities`**: Entidades genéricas (Dish, Category, Store, etc.)

### Multi-Tenancy (Isolamento por Assinante)

**⚠️ ATENÇÃO: Implementação Atual usa `subscriber_email`**

A implementação atual usa `subscriber_email` como identificador de tenant. Isso funciona, mas tem limitações:

#### Limitações Conhecidas:
- 📧 Email pode mudar (requer migração de dados)
- 🔑 Email não é chave primária ideal
- 🔒 Risco potencial de vazamento se email for alterado incorretamente

#### Quando Refatorar:
- ✅ Quando tiver **10+ assinantes ativos**
- ✅ Quando precisar de **auditoria completa**
- ✅ Quando implementar **gateway de pagamento**
- ✅ Quando email começar a mudar frequentemente

#### Refatoração Futura (v2):
```sql
-- Mudança planejada:
subscriber_email → subscriber_id (UUID)
-- Relacionamento mais robusto e seguro
```

**Por enquanto**: A implementação atual é suficiente para MVP e validação de produto.

### Como Funciona Hoje

- **Master (`is_master: true`)**: Vê todos os dados (`subscriber_email = NULL`)
- **Assinante**: Vê apenas seus dados (`subscriber_email = seu_email`)
- **Isolamento**: Queries filtram automaticamente por `subscriber_email`

## 💳 Assinaturas e Pagamentos

### Status de Assinatura

O campo `status` na tabela `subscribers` controla acesso:

- **`active`**: Assinante ativo, acesso completo
- **`inactive`**: Assinante inativo, acesso bloqueado
- **`suspended`**: Assinante suspenso (pagamento pendente)
- **`expired`**: Assinatura expirada

### Integração com Gateway de Pagamento

**Planejado para v2:**

1. **Webhook de pagamento** → Atualiza `status` e `expires_at`
2. **Verificação periódica** → Cron job verifica expirações
3. **Bloqueio automático** → Sistema bloqueia acesso se `status != 'active'`

### Campos Importantes

```sql
subscribers (
  email VARCHAR(255),
  plan VARCHAR(50),        -- 'basic', 'premium', 'enterprise'
  status VARCHAR(50),      -- 'active', 'inactive', 'suspended', 'expired'
  expires_at TIMESTAMP,    -- Data de expiração da assinatura
  permissions JSONB        -- Permissões específicas do plano
)
```

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

### Opção 3: Fallback JSON (APENAS DEV)

⚠️ **Use apenas em desenvolvimento local sem assinantes reais.**

Se não configurar `DATABASE_URL`, o sistema usa arquivos JSON automaticamente.

**NUNCA use isso em produção.**

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
- ⚠️ `DATABASE_URL não configurado` - Usando fallback (DEV ONLY)

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

### Dados não aparecem após deploy
**Solução**: 
- Verifique se `DATABASE_URL` está configurado
- Verifique logs do servidor para erros de conexão
- Execute migração manual se necessário

## 📝 Variáveis de Ambiente Necessárias

```env
# OBRIGATÓRIO para produção
DATABASE_URL=postgresql://user:password@host:5432/database

# Opcionais mas recomendados
PORT=3000
NODE_ENV=production
JWT_SECRET=seu-secret-aqui
FRONTEND_URL=https://seu-frontend.com
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

## ✅ Checklist de Produção

Antes de colocar em produção com assinantes:

- [ ] PostgreSQL configurado e acessível
- [ ] `DATABASE_URL` configurado no Render
- [ ] Migração executada com sucesso
- [ ] Backup automático configurado no Render
- [ ] Monitoramento de conexões ativo
- [ ] Testes de isolamento entre assinantes realizados
- [ ] Gateway de pagamento integrado (ou planejado)
- [ ] Sistema de verificação de status de assinatura implementado
- [ ] Logs de auditoria configurados
- [ ] Plano de escalabilidade definido

## 🎯 Próximos Passos (Roadmap)

### v1.1 (Próxima versão)
- [ ] Migrar `subscriber_email` → `subscriber_id` (UUID)
- [ ] Adicionar tabela `subscriptions` separada
- [ ] Implementar webhook de gateway de pagamento
- [ ] Adicionar cron job para verificar expirações
- [ ] Sistema de bloqueio automático por status

### v2.0 (Futuro)
- [ ] Auditoria completa de mudanças
- [ ] Backup incremental automático
- [ ] Replicação para alta disponibilidade
- [ ] Métricas e analytics por assinante
- [ ] Sistema de quotas e limites por plano

## 📚 Recursos

- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Render PostgreSQL](https://render.com/docs/databases)
- [Node.js pg](https://node-postgres.com/)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

## 🚨 Avisos Importantes

1. **Nunca use fallback JSON em produção**
2. **Sempre faça backup antes de migrações**
3. **Monitore conexões e performance**
4. **Teste isolamento entre assinantes regularmente**
5. **Planeje refatoração de multi-tenancy quando escalar**

---

**Versão**: 1.0  
**Última atualização**: 2025-01-XX  
**Status**: Produção-ready com limitações conhecidas documentadas
