# 🗺️ Roadmap: Multi-Tenancy e Assinaturas

## 📊 Situação Atual (v1.0)

### Implementação Atual
- ✅ Multi-tenancy funcional usando `subscriber_email`
- ✅ Isolamento básico entre assinantes
- ✅ PostgreSQL configurado
- ✅ CRUD completo de entidades

### Limitações Conhecidas
- ⚠️ Usa `subscriber_email` como identificador (não ideal)
- ⚠️ Email pode mudar (requer migração manual)
- ⚠️ Sem auditoria completa de mudanças
- ⚠️ Sem integração com gateway de pagamento
- ⚠️ Verificação de status manual

## 🎯 Quando Refatorar

### ✅ Refatore AGORA se:
- Você tem **10+ assinantes ativos pagando**
- Está recebendo pedidos de mudança de email
- Precisa de auditoria completa para compliance
- Vai integrar gateway de pagamento
- Precisa de relatórios financeiros detalhados

### ⏸️ NÃO refatore AGORA se:
- Ainda está validando o produto
- Tem menos de 5 assinantes
- Não há problemas com a implementação atual
- Está focado em crescimento, não em perfeição técnica

**Regra de ouro**: Não pare o crescimento para refatorar. Planeje, documente, mas execute quando fizer sentido de negócio.

## 🚀 Próximas Versões

### v1.1 - Melhorias Críticas (1-2 meses)

#### 1. Migração `subscriber_email` → `subscriber_id`

**Por quê?**
- Email não é chave primária ideal
- Email pode mudar
- Mais seguro e escalável

**Como?**
```sql
-- Adicionar coluna
ALTER TABLE entities ADD COLUMN subscriber_id UUID;
ALTER TABLE customers ADD COLUMN subscriber_id UUID;

-- Migrar dados
UPDATE entities SET subscriber_id = (
  SELECT id FROM subscribers WHERE email = entities.subscriber_email
);

-- Criar índice
CREATE INDEX idx_entities_subscriber_id ON entities(subscriber_id);

-- Remover coluna antiga (após validação)
-- ALTER TABLE entities DROP COLUMN subscriber_email;
```

**Impacto**: Migração de dados necessária. Planeje downtime ou faça gradualmente.

#### 2. Tabela `subscriptions` Separada

**Estrutura:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  subscriber_id UUID REFERENCES subscribers(id),
  plan VARCHAR(50),
  status VARCHAR(50), -- 'active', 'inactive', 'suspended', 'expired'
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  payment_gateway_id VARCHAR(255), -- ID no gateway
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Benefícios:**
- Histórico completo de assinaturas
- Múltiplas assinaturas por assinante (futuro)
- Melhor rastreamento de pagamentos

#### 3. Sistema de Verificação de Status

**Implementar:**
- Cron job diário para verificar expirações
- Bloqueio automático de acesso se `status != 'active'`
- Notificações antes de expirar

### v2.0 - Gateway de Pagamento (3-6 meses)

#### 1. Integração com Stripe/PagSeguro

**Webhooks:**
- `subscription.created` → Criar assinatura
- `subscription.updated` → Atualizar status
- `subscription.deleted` → Cancelar assinatura
- `payment.succeeded` → Renovar assinatura
- `payment.failed` → Suspender acesso

#### 2. Sistema de Planos Dinâmicos

**Estrutura:**
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10,2),
  interval VARCHAR(20), -- 'monthly', 'yearly'
  features JSONB,
  limits JSONB,
  active BOOLEAN DEFAULT TRUE
);
```

#### 3. Quotas e Limites

- Limite de pratos por plano
- Limite de pedidos por mês
- Limite de armazenamento de imagens
- Limite de usuários/colaboradores

### v3.0 - Enterprise Features (6-12 meses)

- Multi-tenant com sub-organizações
- White-label completo
- API para integrações
- Analytics avançado por tenant
- Backup e restore por tenant
- Compliance (LGPD, GDPR)

## 📋 Checklist de Decisão

Use este checklist para decidir quando refatorar:

### Critérios de Negócio
- [ ] Tenho 10+ assinantes pagando?
- [ ] Receita mensal recorrente (MRR) > R$ 5.000?
- [ ] Estou tendo problemas com a implementação atual?
- [ ] Preciso de features que requerem refatoração?

### Critérios Técnicos
- [ ] Performance está degradando?
- [ ] Estou tendo bugs relacionados a multi-tenancy?
- [ ] Preciso de auditoria para compliance?
- [ ] Vou integrar gateway de pagamento?

### Se 3+ itens marcados: **Refatore**
### Se menos: **Documente e planeje, mas não execute ainda**

## 🔧 Plano de Migração (Quando Chegar a Hora)

### Fase 1: Preparação (1 semana)
1. Criar branch `feature/multitenancy-v2`
2. Adicionar `subscriber_id` sem remover `subscriber_email`
3. Migrar dados gradualmente
4. Testes extensivos

### Fase 2: Transição (1 semana)
1. Sistema usa ambos os campos
2. Novos dados usam `subscriber_id`
3. Dados antigos ainda usam `subscriber_email`
4. Monitoramento ativo

### Fase 3: Consolidação (1 semana)
1. Migrar todos os dados restantes
2. Remover dependência de `subscriber_email`
3. Remover coluna antiga
4. Deploy em produção

### Fase 4: Validação (1 semana)
1. Monitorar erros
2. Validar isolamento
3. Verificar performance
4. Rollback plan pronto

**Total estimado**: 4 semanas com equipe dedicada

## 📚 Referências

- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

## 💡 Lições Aprendidas

1. **MVP primeiro, perfeição depois**: A implementação atual funciona. Melhore quando necessário.
2. **Documente limitações**: Seja transparente sobre o que não está perfeito.
3. **Planeje, mas não pare**: Continue crescendo enquanto planeja melhorias.
4. **Métricas decidem**: Use dados, não suposições, para decidir quando refatorar.

---

**Última atualização**: 2025-01-XX  
**Próxima revisão**: Quando atingir 10 assinantes ativos
