# 📋 GOVERNANÇA DO SISTEMA DE ASSINANTES - DigiMenu

## 🎯 VISÃO GERAL DO SISTEMA

O DigiMenu opera com **2 fluxos principais** de cadastro:

### 1. **Cadastro AUTOMÁTICO** (via /assinar + pagamento)
- Usuário acessa `/assinar`
- Escolhe um plano (FREE, Básico, Pro, Ultra)
- Preenche cadastro em `/cadastro?plan=X`
- **Se FREE:** conta criada automaticamente
- **Se PAGO:** Redireciona para Mercado Pago → Webhook cria conta após pagamento

### 2. **Cadastro MANUAL** (Admin Master)
- Admin acessa `/Assinantes`
- Clica em "+ Adicionar Assinante"
- Preenche dados manualmente
- **Tem total controle:** pode definir qualquer data, plano, status

---

## 🔐 HIERARQUIA DE PLANOS

### **FREE** (R$ 0 - Trial 10 dias)
```
✅ Propósito: Teste sem cartão
✅ Duração: 10 dias (expira automaticamente)
✅ Limites:
   - 20 produtos
   - 10 pedidos/dia
   - 1 usuário
   - Histórico: 7 dias
   - SEM personalização
   - SEM cupons/promoções
   - SEM app entregadores
   - SEM relatórios avançados
```

**Quando usar:**
- ✅ Cliente quer testar antes de pagar
- ✅ Demo para prospects
- ❌ NÃO usar para parceiros de longo prazo (use Basic grátis via Admin)

---

### **BÁSICO** (R$ 39,90/mês)
```
✅ Propósito: Delivery simples
✅ Bônus: 1º mês com 40 dias (se não usou FREE antes)
✅ Permissões:
   - Cardápio completo (100 produtos)
   - Pedidos via WhatsApp
   - Gestor de pedidos básico
   - Personalização (logo, cores, tema)
   - Dashboard básico
   - Histórico: 30 dias
   - 50 pedidos/dia
   - 1 usuário
   
❌ Bloqueado:
   - PDV / Caixa
   - App entregadores
   - Zonas de entrega
   - Cupons e promoções
   - Relatórios avançados
   - Comandas presenciais
```

**Quando usar:**
- ✅ Restaurantes pequenos/delivery básico
- ✅ Início de operação
- ✅ Orçamento limitado

---

### **PRO** (R$ 79,90/mês) 🔥 MAIS POPULAR
```
✅ Propósito: Crescimento com entregas
✅ Bônus: 1º mês com 40 dias (se não usou FREE antes)
✅ Permissões:
   - TUDO do Básico +
   - 500 produtos
   - 200 pedidos/dia
   - App para entregadores
   - Zonas de entrega
   - Rastreamento tempo real
   - Cupons e promoções
   - Relatórios avançados
   - Até 5 usuários
   - Histórico: 1 ano
   
❌ Bloqueado:
   - PDV / Caixa
   - Comandas presenciais
   - App garçom
   - Display cozinha
   - Emissão fiscal
```

**Quando usar:**
- ✅ Restaurantes em crescimento
- ✅ Operação de delivery ativa
- ✅ Precisa de app de entregadores
- ✅ Quer cupons/marketing

---

### **ULTRA** (R$ 149,90/mês) 👑
```
✅ Propósito: TUDO LIBERADO - operação completa
✅ Bônus: 1º mês com 40 dias (se não usou FREE antes)
✅ Permissões:
   - TUDO do Pro +
   - Produtos ILIMITADOS
   - Pedidos ILIMITADOS
   - PDV completo
   - Controle de caixa
   - Comandas presenciais
   - App garçom
   - Display cozinha (KDS)
   - Emissão NFC-e / SAT
   - API & Webhooks
   - Até 5 localizações
   - Analytics preditivo
   - Até 20 usuários
   - Histórico ILIMITADO
   
✅ NADA BLOQUEADO (acesso total)
```

**Quando usar:**
- ✅ Restaurantes com operação presencial + delivery
- ✅ Precisa de PDV e emissão fiscal
- ✅ Múltiplos pontos de venda
- ✅ Operação complexa

---

## 🛡️ REGRAS DE NEGÓCIO - ADMIN MASTER

### **O QUE O ADMIN PODE FAZER:**

#### ✅ **Criar Assinantes Grátis (BASIC, PRO, ULTRA)**
```javascript
Cenários permitidos:
1. Parceiro estratégico (restaurante parceiro)
2. Teste para cliente enterprise
3. Acordo comercial especial
4. Demonstração para leads importantes
5. Compensação por problemas/bugs

COMO FAZER:
1. Ir em /Assinantes → "+ Adicionar"
2. Selecionar plano: Basic, Pro ou Ultra
3. Status: Ativo
4. Data de Expiração: 
   - Deixar VAZIO = sem expiração
   - Ou definir data específica (ex: 90 dias)
5. Plano: NÃO selecionar "FREE" (é só para trial)
```

**IMPORTANTE:** 
- ❌ NÃO use plano FREE para parceiros (ele expira em 10 dias)
- ✅ Use BASIC grátis sem data de expiração
- ✅ Documente o motivo no campo "Observações" (se existir)

---

#### ✅ **Modificar Dias de Validade**
```javascript
QUANDO PODE:
1. ✅ Cliente pagou mas teve problemas técnicos → adicionar dias
2. ✅ Compensação por downtime do sistema → adicionar dias
3. ✅ Cliente está em dúvida, quer mais tempo → adicionar 7 dias
4. ✅ Acordo comercial especial → definir data customizada
5. ✅ Migração de outro sistema → ajustar data para sincronizar

COMO FAZER:
1. Ir em /Assinantes → Editar assinante
2. Campo "Data de Expiração"
3. Adicionar dias manualmente ou limpar (sem expiração)

CRITÉRIOS:
- Compensação técnica: até +30 dias
- Teste estendido: até +14 dias
- Acordo comercial: documentar no CRM/email
- NUNCA reduzir dias sem avisar o cliente antes
```

---

#### ✅ **Criar Perfis de Teste/Demo**
```javascript
QUANDO USAR:
1. Demo para prospects (reunião comercial)
2. Treinamento da equipe
3. Teste de novas features
4. Ambiente de homologação

COMO FAZER:
1. Criar com plano ULTRA (acesso total)
2. Email: demo-XXXX@digimenu.com.br
3. Data de expiração: +7 dias (demo) ou +30 dias (teste interno)
4. Observação: "DEMO - Prospect: Nome da Empresa"

LIMPEZA:
- Deletar demos com mais de 30 dias
- Manter apenas demos ativas
```

---

### **O QUE O ADMIN NÃO DEVE FAZER:**

#### ❌ **Criar Planos Grátis Permanentes sem Critério**
```
ERRADO: Dar plano grátis para qualquer pedido
CERTO: Avaliar caso a caso e documentar

Exemplos de NÃO FAZER:
- Cliente pediu desconto → NÃO dar grátis, negociar desconto
- Amigo do dono → NÃO dar grátis, dar desconto de 50%
- "Teste indefinido" → NÃO, limite de 30 dias
```

#### ❌ **Modificar Plano de Cliente Pagante sem Autorização**
```
NUNCA fazer:
- Downgrade sem avisar (de Pro para Basic)
- Bloquear módulos que o cliente usa
- Mudar data de expiração sem motivo documentado

SEMPRE:
- Avisar cliente antes de qualquer mudança
- Documentar motivo da alteração
- Se possível, obter confirmação por email
```

---

## 🔄 FLUXO COMPARATIVO: ADMIN vs. CLIENTE

### **Cliente se Cadastrando (Automático)**
```
1. Acessa /assinar
2. Escolhe plano (FREE, Básico, Pro, Ultra)
3. Preenche /cadastro
4. Se FREE:
   ✅ Conta criada na hora
   ✅ Status: "trial"
   ✅ Expira em: hoje + 10 dias
   ✅ Sem cobrança

5. Se PAGO:
   ✅ Redireciona para Mercado Pago
   ✅ Webhook cria conta após aprovação
   ✅ Status: "active"
   ✅ Expira em: hoje + 40 dias (1º mês) ou +30 dias (já usou FREE)
   ✅ Cobrança automática mensal
```

### **Admin Criando (Manual)**
```
1. Admin vai em /Assinantes → "+ Adicionar"
2. Preenche manualmente:
   - Email
   - Nome
   - Plano: Free, Basic, Pro, Ultra, Personalizado
   - Status: Ativo, Inativo, Trial
   - Data de Expiração: Qualquer data ou vazio
3. Salva
4. Sistema NÃO cobra (criação manual)
5. Sistema NÃO envia para Mercado Pago
6. Sistema NÃO cria renovação automática

DIFERENÇAS:
- ✅ Admin tem controle total
- ✅ Pode criar sem pagamento
- ✅ Pode definir qualquer data
- ❌ NÃO tem renovação automática
- ❌ Admin precisa renovar manualmente ou cliente paga depois
```

---

## 💰 REGRAS DE COBRANÇA E TRIALS

### **Trial FREE (10 dias)**
```
Quando é aplicado:
✅ Cliente clica em "Testar 10 Dias Grátis" no /assinar
✅ Não pede cartão
✅ Cria conta na hora

O que acontece após 10 dias:
✅ Sistema bloqueia acesso
✅ Mostra mensagem: "Trial expirado, escolha um plano"
✅ Cliente pode contratar qualquer plano pago
✅ Se contratar, NÃO ganha bônus de 40 dias (já usou trial)
```

### **Bônus de 40 dias (1º mês)**
```
Quando é aplicado:
✅ Cliente contrata Basic, Pro ou Ultra DIRETO (sem usar FREE antes)
✅ Primeiro pagamento aprovado
✅ Sistema adiciona: 10 dias bônus + 30 dias pagos = 40 dias

Quando NÃO é aplicado:
❌ Cliente já usou o trial FREE antes
❌ Admin criou manualmente (sem pagamento)
❌ Renovações (apenas 1º mês tem bônus)

Lógica:
if (cliente NUNCA usou FREE) {
  1º mês = 40 dias (30 + 10 bônus)
} else {
  1º mês = 30 dias (normal)
}
```

### **Renovação Automática**
```
Quando acontece:
✅ Cliente contratou via Mercado Pago
✅ Assinatura recorrente ativa
✅ Mercado Pago cobra automaticamente

Como funciona:
- Dia 1: Cliente paga R$ 79,90 (Pro)
- Dia 40: Sistema renova por mais 30 dias (se não usou FREE)
  OU
- Dia 30: Sistema renova por mais 30 dias (se já usou FREE)
- Mercado Pago cobra automaticamente
- Webhook atualiza data de expiração (+30 dias)

Se pagamento falhar:
- Mercado Pago tenta novamente (até 3x)
- Se falhar, status muda para "payment_failed"
- Sistema bloqueia acesso após 3 dias de atraso
```

---

## 📊 CRITÉRIOS PROFISSIONAIS - QUANDO FAZER O QUÊ

### **Criar Perfil GRÁTIS permanente**
```
SIM:
✅ Parceiro estratégico (influencer, grande rede)
✅ Acordo de co-marketing
✅ Cliente beta-tester de features novas
✅ ONG / Causa social (aprovado pela direção)
✅ Compensação por bug crítico que causou prejuízo

NÃO:
❌ "Amigo pediu"
❌ Cliente reclamando do preço
❌ "Só para testar" (use trial de 10 dias)
```

### **Estender Dias de Validade**
```
+7 dias:
✅ Cliente em dúvida, precisa de mais tempo
✅ Problema técnico pequeno

+14 dias:
✅ Bug que afetou operação do cliente
✅ Downtime do sistema

+30 dias:
✅ Bug crítico que causou prejuízo real
✅ Acordo comercial documentado
✅ Cliente enterprise em negociação

+60 dias ou mais:
✅ APENAS com aprovação da direção
✅ Acordo escrito
✅ Documentado no CRM
```

### **Fazer Downgrade de Plano**
```
QUANDO PODE:
✅ Cliente solicitou (quer economizar)
✅ Cliente não usa features avançadas há 60+ dias
✅ Sugestão de otimização de custo

PROCESSO:
1. Analisar uso real do cliente (relatórios)
2. Se usa menos de 50% das features do plano atual
3. Sugerir downgrade por email
4. Cliente confirma
5. Admin faz downgrade no início do próximo ciclo
6. NÃO fazer no meio do mês pago
```

---

## 🎯 BOAS PRÁTICAS - ADMIN MASTER

### **DO'S (Faça):**
1. ✅ Documente TODOS os ajustes manuais
2. ✅ Avise cliente antes de mudanças
3. ✅ Use plano FREE apenas para trial de 10 dias
4. ✅ Use BASIC grátis para parceiros de longo prazo
5. ✅ Mantenha histórico de mudanças (quem, quando, por quê)
6. ✅ Revise assinantes grátis a cada 90 dias
7. ✅ Ofereça upgrade quando cliente cresce
8. ✅ Monitore uso vs. plano (otimização)

### **DON'TS (Não Faça):**
1. ❌ NUNCA mude plano sem avisar
2. ❌ NUNCA bloqueie sem notificar antes (3 dias de aviso)
3. ❌ NUNCA reduza dias de forma arbitrária
4. ❌ NUNCA crie planos grátis permanentes sem critério
5. ❌ NUNCA prometa features que não existem
6. ❌ NUNCA faça downgrade no meio do ciclo pago
7. ❌ NUNCA delete assinante com pedidos ativos

---

## 🔍 MONITORAMENTO - O QUE ACOMPANHAR

### **Métricas Críticas (AdminMasterDashboard):**
```
MRR (Receita Mensal Recorrente):
- Meta: Crescimento de 10% ao mês
- Alerta: Queda por 2 meses seguidos

Churn Rate (Taxa de Cancelamento):
- Meta: < 5% ao mês
- Alerta: > 10% ao mês

Trial Conversion (Trial → Pago):
- Meta: 30% de conversão
- Alerta: < 15% de conversão

Assinantes Grátis:
- Meta: < 10% do total
- Alerta: > 20% do total (revisar critérios)
```

### **Ações Baseadas em Métricas:**
```
Se MRR caindo:
1. Analisar cancelamentos do mês
2. Contatar clientes que cancelaram
3. Oferecer desconto de 20% para retorno

Se Churn > 10%:
1. Identificar padrão (qual plano cancela mais?)
2. Melhorar onboarding desse plano
3. Adicionar features que clientes pedem

Se Trial Conversion < 15%:
1. Revisar fluxo de trial (10 dias é suficiente?)
2. Adicionar email de engajamento (dia 3, 7, 9)
3. Ligar para trials no dia 8 (antes de expirar)
```

---

## 📞 SCRIPTS DE ATENDIMENTO

### **Cliente pede desconto:**
```
Cliente: "Quero 50% de desconto permanente"

Resposta:
"Entendo! Vamos fazer assim:
1. Teste nosso plano FREE por 10 dias (sem cartão)
2. Se gostar, contrato o Básico com 20% de desconto no 1º mês
3. Após 3 meses, reavaliamos baseado no seu uso

Isso funciona para você?"
```

### **Cliente quer trial estendido:**
```
Cliente: "10 dias é pouco, quero 30 dias"

Resposta:
"O trial FREE é de 10 dias por padrão, mas posso te ajudar:

Opção 1: Teste 10 dias FREE + contrate Básico (ganha +10 dias bônus = 20 dias total de teste)
Opção 2: Vou liberar +7 dias no seu trial (17 dias total)

Qual prefere?"
```

### **Parceiro estratégico:**
```
Situação: Influencer com 50k seguidores quer parceria

Ação:
1. Criar plano PRO grátis
2. Data de expiração: +90 dias
3. Observação: "Parceria marketing - @influencer - 3 posts por mês"
4. Renovar se cumprir acordo
5. Downgrade para BASIC se não cumprir
```

---

## ✅ RESUMO - REGRAS DE OURO

```
1. PLANO FREE = Apenas trial de 10 dias
2. PLANOS GRÁTIS PERMANENTES = Usar BASIC/PRO/ULTRA com critério
3. 1º MÊS PAGO = 40 dias (se não usou FREE antes)
4. ADMIN pode modificar TUDO, mas deve DOCUMENTAR
5. NUNCA mudar plano sem avisar cliente
6. REVISAR assinantes grátis a cada 90 dias
7. SEMPRE oferecer upgrade quando cliente cresce
8. MONITORAR churn, MRR e conversão de trials
```

---

## 🎓 CONCLUSÃO

Como **especialista e dono do SaaS**, você deve:
- ✅ Ter critérios claros (não dar grátis indiscriminadamente)
- ✅ Documentar exceções (parceiros, compensações)
- ✅ Monitorar métricas (MRR, churn, conversão)
- ✅ Automatizar o máximo possível (renovações, cobranças)
- ✅ Intervir manualmente apenas quando necessário
- ✅ Sempre pensar: "Isso escala?" antes de criar exceção

**Objetivo final:** Sistema que funciona 90% no automático, com intervenção manual apenas para casos especiais documentados.

---

📅 **Última atualização:** Janeiro 2026  
👤 **Responsável:** Admin Master  
🔄 **Próxima revisão:** A cada 90 dias
