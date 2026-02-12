# 🍕 DEBUG: MODO PIZZA NÃO ABRINDO

**Data:** 30/01/2026  
**Status:** 🔍 **INVESTIGANDO COM LOGS**

---

## 🎯 **PROBLEMA REPORTADO**

O modo pizza não está abrindo quando o cliente clica em um prato do tipo "pizza".

---

## ✅ **CORREÇÕES APLICADAS**

### **1. Logs de Debug Adicionados**

Adicionei logs detalhados para rastrear o fluxo completo:

```javascript
// Ao clicar no prato
const handleDishClick = (dish) => {
  console.log('🍕 Clicou no prato:', dish.name, 'Tipo:', dish.product_type);
  if (dish.product_type === 'pizza') {
    console.log('✅ É pizza! Abrindo PizzaBuilder...');
    setSelectedPizza(dish);
  } else {
    console.log('📦 Não é pizza, abrindo modal normal');
    setSelectedDish(dish);
  }
};

// Ao renderizar o PizzaBuilder
{selectedPizza && (
  <>
    {console.log('🍕 Renderizando PizzaBuilder para:', selectedPizza.name)}
    {console.log('📏 Tamanhos disponíveis:', pizzaSizesResolved.length)}
    {console.log('🎨 Sabores disponíveis:', pizzaFlavorsResolved.length)}
    <PizzaBuilder ... />
  </>
)}
```

---

## 🔍 **COMO TESTAR**

1. Acesse o cardápio no ambiente de produção
2. Abra o **Console do navegador** (F12 → Console)
3. Clique em um prato do tipo "pizza"
4. Observe os logs:

### **Logs Esperados:**
```
🍕 Clicou no prato: Pizza Margherita Tipo: pizza
✅ É pizza! Abrindo PizzaBuilder...
🍕 Renderizando PizzaBuilder para: Pizza Margherita
📏 Tamanhos disponíveis: 3
🎨 Sabores disponíveis: 10
```

### **Se não abrir, verifique:**
- ❌ `product_type` não é "pizza" (pode ser "Pizza" com maiúscula)
- ❌ `pizzaSizesResolved.length === 0` (sem tamanhos configurados)
- ❌ `pizzaFlavorsResolved.length === 0` (sem sabores configurados)
- ❌ Erro de JavaScript no console

---

## 🛠️ **POSSÍVEIS CAUSAS**

### **1. Tipo de Produto Incorreto**
```javascript
// Verificar no banco:
SELECT id, name, product_type FROM dishes WHERE product_type LIKE '%pizza%';

// Pode estar como:
- "Pizza" (com P maiúsculo) ❌
- "pizza" (correto) ✅
- NULL ❌
```

**Solução:** Atualizar o `product_type` para `"pizza"` (minúsculo)

---

### **2. Tamanhos ou Sabores Não Configurados**
```javascript
// O PizzaBuilder só abre se houver:
- pizzaSizesResolved.length > 0
- pizzaFlavorsResolved.length > 0
```

**Solução:** Configurar tamanhos e sabores no Admin

---

### **3. Filtro no Cardapio.jsx**
```javascript
// Linha 256-258:
if (d.product_type === 'pizza') {
  if (pizzaSizesResolved.length === 0 || pizzaFlavorsResolved.length === 0) 
    return false; // ❌ Pizza não aparece!
}
```

**Solução:** Garantir que há tamanhos e sabores cadastrados

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

### **No Admin:**
- [ ] Há pelo menos 1 tamanho de pizza cadastrado?
- [ ] Há pelo menos 1 sabor de pizza cadastrado?
- [ ] Os tamanhos estão ativos (`is_active = true`)?
- [ ] Os sabores estão ativos (`is_active = true`)?

### **No Banco de Dados:**
- [ ] `product_type` do prato é exatamente `"pizza"` (minúsculo)?
- [ ] Tabela `pizza_sizes` tem registros?
- [ ] Tabela `pizza_flavors` tem registros?

### **No Console:**
- [ ] Aparece o log "🍕 Clicou no prato"?
- [ ] Aparece o log "✅ É pizza! Abrindo PizzaBuilder..."?
- [ ] Aparece o log "🍕 Renderizando PizzaBuilder"?
- [ ] Há algum erro em vermelho no console?

---

## 🚀 **PRÓXIMOS PASSOS**

1. ✅ **Deploy com logs** (concluído)
2. ⏳ **Aguardar Vercel** (~2 minutos)
3. 🔍 **Testar no ambiente** e coletar logs
4. 📊 **Analisar logs** e identificar causa raiz
5. 🛠️ **Aplicar correção definitiva**

---

## 📞 **INSTRUÇÕES PARA O USUÁRIO**

1. Aguarde 2-3 minutos para o deploy do Vercel
2. Acesse o cardápio
3. Abra o Console (F12)
4. Clique em uma pizza
5. **Copie TODOS os logs** do console
6. Me envie os logs para análise

---

## 💡 **CORREÇÃO RÁPIDA (SE NECESSÁRIO)**

Se o problema for `product_type` com letra maiúscula:

```sql
-- Normalizar product_type para minúsculo
UPDATE dishes 
SET product_type = LOWER(product_type) 
WHERE product_type LIKE '%pizza%';
```

Se o problema for falta de tamanhos/sabores:
1. Admin > Pizzas > Tamanhos → Adicionar pelo menos 1
2. Admin > Pizzas > Sabores → Adicionar pelo menos 1

---

## 🎉 **RESULTADO ESPERADO**

Após a correção:
- ✅ Clicar em pizza abre o PizzaBuilder
- ✅ Modal bonito com animações
- ✅ Seleção de tamanho, sabores, bordas, extras
- ✅ Adicionar ao carrinho funciona

---

**🔧 AGUARDANDO LOGS DO CONSOLE PARA DIAGNÓSTICO PRECISO!**
