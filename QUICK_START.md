# ⚡ Quick Start - DigiMenu

## 🎯 Objetivo

Garantir que o sistema está pronto para o primeiro cliente pagante.

## 📋 Checklist Rápido

### 1. Setup (5 minutos)
```bash
# Instalar dependências
cd backend
npm install

# Configurar ambiente
npm run test:setup

# Verificar configuração
cat .env | grep -E "DATABASE_URL|JWT_SECRET"
```

### 2. Checklist Manual (30-60 minutos)
Siga o checklist completo em `CHECKLIST_PRE_CLIENTE.md`:

- [ ] Cadastro e Login
- [ ] Criar Estabelecimento
- [ ] Criar Cardápio (5 produtos)
- [ ] Pedido Completo (criar → preparar → finalizar)
- [ ] Testar Limite (Free: 30 produtos, 20 pedidos/mês)
- [ ] Testar Permissões
- [ ] Testar Erros (401, 403, 404, 400)

### 3. Testes Automatizados (opcional)
```bash
cd backend
npm test
```

**Nota:** Testes podem precisar de ajustes dependendo do ambiente.

### 4. Stress Test (opcional)
```bash
export BACKEND_URL="http://localhost:3000"
export TEST_SLUG="seu-slug"
npm run stress:test
```

## ✅ Critérios de Liberação

Você só libera para cliente se:

- [ ] **0 erros 500** em casos esperados
- [ ] **0 bypass de permissão** (backend sempre valida)
- [ ] **0 limite quebrado** (validação sempre funciona)
- [ ] **Pedido completo funcionando** (criar → preparar → finalizar)
- [ ] **Fluxo simples em menos de 5 minutos** (criar estabelecimento → cardápio → pedido)

## 📚 Documentação

- **Checklist Completo:** `CHECKLIST_PRE_CLIENTE.md`
- **Guia de Testes:** `GUIA_RAPIDO_TESTES.md`
- **Resumo da Implementação:** `RESUMO_IMPLEMENTACAO.md`
- **Prompts para Análises:** `PROMPTS/`

## 🆘 Problemas Comuns

### Erro: "Banco não disponível"
```bash
# Verificar PostgreSQL
psql -U postgres -c "SELECT version();"

# Verificar DATABASE_URL
echo $DATABASE_URL
```

### Erro: "JWT_SECRET não definido"
```bash
# Adicionar ao .env
echo "JWT_SECRET=seu-secret-aqui" >> backend/.env
```

### Testes falhando
- Os testes foram criados como estrutura base
- Podem precisar de ajustes dependendo da configuração
- Foque no checklist manual primeiro

## 🎉 Pronto!

Se passou por tudo isso, você está pronto para vender! 🚀
