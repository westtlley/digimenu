# 📦 Guia de Backup e Importação - DigiMenu

## 🎯 Visão Geral

O sistema de backup do DigiMenu permite que **assinantes** exportem e importem seus dados de forma segura, incluindo:

- ✅ Pratos (dishes)
- ✅ Categorias (categories)
- ✅ Grupos de complementos (complement_groups)
- ✅ Configurações da loja (store)
- ❌ Pedidos (apenas exportação, não importação)
- ❌ Caixas (apenas exportação, não importação)

---

## 📤 EXPORTAR BACKUP

### **Como Fazer:**

1. Acesse o **Admin Master** (`/Assinantes`)
2. Selecione um assinante
3. Clique em **"Exportar Backup"**
4. O arquivo `.json` será baixado automaticamente

### **Estrutura do Arquivo Exportado:**

```json
{
  "subscriber": {
    "email": "cliente@exemplo.com",
    "name": "Restaurante Exemplo",
    "plan": "pro",
    "status": "active",
    "expires_at": "2026-12-31T23:59:59.000Z"
  },
  "data": {
    "dishes": [
      {
        "id": 1,
        "name": "Pizza Margherita",
        "description": "Molho de tomate, mussarela, manjericão",
        "price": 45.90,
        "category_id": 1,
        "image_url": "https://...",
        "available": true,
        "product_type": "pizza",
        "complement_groups": [1, 2]
      }
    ],
    "categories": [
      {
        "id": 1,
        "name": "Pizzas",
        "order": 1
      }
    ],
    "complement_groups": [
      {
        "id": 1,
        "name": "Bordas",
        "options": [
          {
            "name": "Borda Catupiry",
            "price": 5.00
          }
        ],
        "required": false,
        "max_selections": 1
      }
    ],
    "store": {
      "store_name": "Restaurante Exemplo",
      "whatsapp": "11999999999",
      "theme_color": "#ff6b35"
    }
  },
  "stats": {
    "total_dishes": 15,
    "total_orders": 120,
    "revenue": 5400.00
  },
  "exported_at": "2026-01-29T12:00:00.000Z",
  "exported_by": "admin"
}
```

---

## 📥 IMPORTAR BACKUP

### **Como Fazer:**

1. Acesse o **Admin Master** (`/Assinantes`)
2. Selecione um assinante
3. Clique em **"Importar Backup"**
4. Selecione o arquivo `.json`
5. O sistema valida automaticamente
6. Escolha o **modo de importação**:
   - **Mesclar:** Mantém dados existentes, adiciona novos
   - **Substituir:** Sempre cria novos itens
7. Clique em **"Importar"**

### **Validação Automática:**

O sistema valida:
- ✅ Estrutura do arquivo JSON
- ✅ Campos obrigatórios (nome, etc.)
- ✅ Tipos de dados corretos
- ⚠️ Avisos (itens sem nome, etc.)

### **Resultado da Importação:**

```
📋 RESUMO DA IMPORTAÇÃO:
  Categorias: 5 criadas, 2 atualizadas, 0 erros
  Complementos: 8 criados, 3 atualizados, 0 erros
  Pratos: 15 criados, 0 atualizados, 0 erros
  Loja: ✅ Atualizada
```

---

## 🔄 MODOS DE IMPORTAÇÃO

### **1. Modo MESCLAR (Merge)** ✅ Recomendado

**Quando usar:**
- ✅ Restaurar backup após perda de dados
- ✅ Adicionar novos pratos de outro restaurante
- ✅ Atualizar dados existentes

**Como funciona:**
```javascript
if (item já existe com mesmo ID) {
  atualiza o item existente
} else {
  cria novo item
}
```

**Exemplo:**
- Você tem 10 pratos no sistema
- Importa backup com 5 pratos (3 novos, 2 já existentes)
- **Resultado:** 13 pratos (10 originais - 2 atualizados + 3 novos)

---

### **2. Modo SUBSTITUIR (Replace)** ⚠️ Use com cuidado

**Quando usar:**
- ✅ Duplicar cardápio completo
- ✅ Criar cópia para novo restaurante
- ✅ Testar diferentes configurações

**Como funciona:**
```javascript
SEMPRE cria novo item (ignora IDs do backup)
```

**Exemplo:**
- Você tem 10 pratos no sistema
- Importa backup com 5 pratos
- **Resultado:** 15 pratos (10 originais + 5 novos)

---

## 📋 CENÁRIOS DE USO

### **Cenário 1: Backup e Restauração** 🔄

**Situação:** Cliente deletou pratos por engano

**Solução:**
1. Exportar backup atual (se possível)
2. Importar backup antigo (modo **Mesclar**)
3. Revisar e ajustar manualmente

**Resultado:** Pratos deletados voltam, pratos atuais permanecem

---

### **Cenário 2: Migração de Loja** 📦

**Situação:** Cliente quer copiar cardápio de uma loja para outra

**Solução:**
1. Exportar backup da **Loja A**
2. Editar arquivo JSON (remover `id` de todos os itens)
3. Importar na **Loja B** (modo **Substituir**)

**Resultado:** Loja B tem cópia completa do cardápio da Loja A

---

### **Cenário 3: Adicionar Categorias/Pratos de Outro Restaurante** 🍕

**Situação:** Cliente quer adicionar pizzas de outro restaurante ao seu cardápio

**Solução:**
1. Exportar backup do **Restaurante com pizzas**
2. Editar arquivo JSON:
   ```json
   {
     "data": {
       "categories": [ /* apenas categoria "Pizzas" */ ],
       "dishes": [ /* apenas pratos de pizza */ ],
       "complement_groups": [ /* apenas complementos de pizza */ ]
     }
   }
   ```
3. Importar no **Restaurante de destino** (modo **Substituir**)

**Resultado:** Pizzas adicionadas sem afetar outros pratos

---

### **Cenário 4: Atualização em Massa de Preços** 💰

**Situação:** Cliente quer atualizar preços de todos os pratos

**Solução:**
1. Exportar backup atual
2. Editar arquivo JSON com novo preço:
   ```json
   {
     "dishes": [
       { "id": 1, "name": "Pizza", "price": 50.00 } // era 45.00
     ]
   }
   ```
3. Importar (modo **Mesclar**)

**Resultado:** Preços atualizados, outras informações mantidas

---

## 🛡️ SEGURANÇA E VALIDAÇÕES

### **O que é importado:**
✅ Nome, descrição, preço
✅ Imagens (URLs)
✅ Complementos e opções
✅ Configurações visuais (tema, logo)

### **O que NÃO é importado:**
❌ Pedidos (para evitar duplicação)
❌ Caixas (dados financeiros sensíveis)
❌ Senhas e tokens
❌ IDs de outros assinantes

### **Validações automáticas:**
- ✅ Campos obrigatórios presentes
- ✅ Tipos de dados corretos (número, texto, booleano)
- ✅ Estrutura JSON válida
- ⚠️ Avisos para itens sem nome ou incompletos

---

## ⚠️ AVISOS IMPORTANTES

### **1. Backup Não Substitui Banco de Dados**
- ❌ Não é recomendado como único backup
- ✅ Use como complemento ao backup do banco
- ✅ Ideal para migração e restauração pontual

### **2. IDs Podem Mudar**
- ⚠️ Ao importar em modo **Substituir**, novos IDs serão gerados
- ⚠️ Relacionamentos (categoria_id, complement_groups) podem quebrar
- ✅ Use modo **Mesclar** quando possível

### **3. Imagens Externas**
- ⚠️ URLs de imagens são importadas, mas arquivos não
- ✅ Garanta que URLs sejam acessíveis (Cloudinary, etc.)
- ❌ Imagens locais (localhost) não funcionarão

### **4. Complementos Duplicados**
- ⚠️ Modo **Substituir** pode criar complementos duplicados
- ✅ Revise grupos de complementos após importação
- ✅ Delete duplicatas manualmente

---

## 🧪 TESTANDO A IMPORTAÇÃO

### **Criar Backup de Teste:**

```json
{
  "data": {
    "categories": [
      { "name": "Teste", "order": 99 }
    ],
    "dishes": [
      {
        "name": "Prato Teste",
        "description": "Apenas para testar importação",
        "price": 1.00,
        "available": true
      }
    ]
  }
}
```

**Salve como:** `teste-import.json`

**Importe e verifique:**
1. Categoria "Teste" foi criada? ✅
2. Prato "Prato Teste" aparece? ✅
3. Sem erros? ✅

Se tudo OK, delete os itens de teste e importe o backup real.

---

## 🔧 TROUBLESHOOTING

### **Erro: "Arquivo de backup inválido"**
- ✅ Verifique se é um arquivo `.json` válido
- ✅ Use validador JSON online (jsonlint.com)
- ✅ Garanta estrutura: `{ "data": { ... } }`

### **Erro: "Erro ao importar prato X"**
- ✅ Verifique se categoria existe
- ✅ Verifique se preço é número válido
- ✅ Veja logs do backend para detalhes

### **Importação lenta (muitos itens)**
- ⏱️ Normal para 100+ itens
- ✅ Aguarde conclusão (pode levar 1-2 minutos)
- ❌ Não feche a janela durante importação

### **Itens importados não aparecem**
- ✅ Limpe cache do navegador (Ctrl + Shift + Del)
- ✅ Recarregue a página (F5)
- ✅ Verifique se assinante está ativo

---

## 📊 COMPARAÇÃO: Export vs Import

| Funcionalidade | Export | Import |
|----------------|--------|--------|
| **Pratos** | ✅ Sim | ✅ Sim |
| **Categorias** | ✅ Sim | ✅ Sim |
| **Complementos** | ✅ Sim | ✅ Sim |
| **Loja** | ✅ Sim | ✅ Sim (modo Mesclar) |
| **Pedidos** | ✅ Sim | ❌ Não |
| **Caixas** | ✅ Sim | ❌ Não |
| **Estatísticas** | ✅ Sim | ❌ Não |

---

## 🎓 BOAS PRÁTICAS

### **DO's (Faça):**
1. ✅ Exporte backup ANTES de grandes mudanças
2. ✅ Teste importação em ambiente de teste primeiro
3. ✅ Use modo **Mesclar** quando possível
4. ✅ Revise arquivo JSON antes de importar
5. ✅ Mantenha backups organizados (data no nome)
6. ✅ Delete backups antigos após 90 dias

### **DON'Ts (Não Faça):**
1. ❌ NUNCA delete dados antes de fazer backup
2. ❌ NUNCA importe backup de outro assinante sem revisar
3. ❌ NUNCA confie apenas em backups de importação (use banco também)
4. ❌ NUNCA edite JSON manualmente sem validar depois
5. ❌ NUNCA importe em produção sem testar antes

---

## 🚀 PRÓXIMOS PASSOS

Funcionalidades planejadas:
- [ ] Importação de pedidos históricos
- [ ] Backup automático agendado
- [ ] Backup incremental (apenas mudanças)
- [ ] Versionamento de backups
- [ ] Comparação de backups (diff)
- [ ] Restauração seletiva (escolher itens)

---

## ✅ RESUMO RÁPIDO

```
1. EXPORTAR: Admin → Assinante → "Exportar Backup" → .json baixado
2. IMPORTAR: Admin → Assinante → "Importar Backup" → Selecionar .json → Validar → Importar
3. MODOS: Mesclar (atualiza) vs Substituir (cria novos)
4. SEGURO: Validação automática + logs detalhados
5. USO: Restauração, migração, duplicação de cardápios
```

**Tempo médio:** 2-5 minutos para importar 50 itens

**Compatibilidade:** Funciona com JSON/PostgreSQL

**Suporte:** Verifique logs em `backend/server.js` para detalhes de erros

---

📅 **Implementado em:** 29 Janeiro 2026  
👤 **Responsável:** Admin Master  
🔄 **Status:** ✅ PRODUÇÃO
