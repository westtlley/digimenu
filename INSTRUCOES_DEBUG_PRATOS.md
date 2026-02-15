# 🔧 CORREÇÃO APLICADA: Debug de Pratos no Painel

## ✅ O que foi feito

Adicionei logs de debug no `DishesTab.jsx` para identificar por que os pratos não aparecem no painel.

## 🔍 O que descobri

O código filtra pratos com `product_type === 'pizza'` na linha 883:

```javascript
const safeDishes = dishes.filter(d => d.product_type !== 'pizza');
```

**Isso significa:**
- ✅ Pratos normais (`product_type === 'preparado'` ou `null` ou `undefined`) → Aparecem
- ❌ Pratos do tipo pizza (`product_type === 'pizza'`) → **NÃO** aparecem (vão para aba "Pizzas")

## 📋 Como testar agora

### 1. Recarregue a página do painel
```
http://localhost:5173/painel-assinante?tab=dishes
```
ou
```
http://localhost:5173/admin?tab=dishes
```

### 2. Abra o Console do navegador (F12)

Procure pelas seguintes mensagens:

```javascript
🍽️ [DishesTab] Dados brutos: {
  total_dishes: X,
  dishes_sample: [...]
}

🍽️ [DishesTab] Após filtro de pizza: {
  total_safe_dishes: Y,
  removed_pizzas: Z
}
```

### 3. Analise os resultados

**Cenário A: `total_dishes: 0`**
- ❌ Nenhum prato está chegando do backend
- **Causa**: Problema de contexto/autenticação ou backend
- **Solução**: Verificar se o usuário está logado corretamente

**Cenário B: `total_dishes: X` mas `total_safe_dishes: 0` e `removed_pizzas: X`**
- ❌ Todos os pratos são do tipo "pizza"
- **Causa**: Os pratos foram cadastrados com `product_type: 'pizza'`
- **Solução**: Alterar pratos para `product_type: 'preparado'` ou criar na aba "Pizzas"

**Cenário C: `total_dishes: X` e `total_safe_dishes: X` e `removed_pizzas: 0`**
- ✅ Pratos estão chegando e não são pizzas
- **Causa**: Outro problema (filtros, categorias, etc.)
- **Solução**: Verificar filtros e categorias

## 🛠️ Soluções por Cenário

### Se os pratos são do tipo "pizza" mas você quer vê-los na aba "Pratos"

Você tem 3 opções:

#### Opção 1: Mover pratos para aba "Pizzas"
```
No painel → Navegue para aba "Pizzas"
```
Os pratos do tipo pizza aparecem lá.

#### Opção 2: Alterar product_type no banco de dados
Altere manualmente no banco:
```sql
UPDATE entities
SET data = jsonb_set(data, '{product_type}', '"preparado"')
WHERE entity_type = 'Dish'
AND data->>'product_type' = 'pizza';
```

#### Opção 3: Remover o filtro temporariamente (apenas para teste)
Comente a linha 888 do DishesTab.jsx:
```javascript
// const safeDishes = dishes.filter(d => d.product_type !== 'pizza');
const safeDishes = dishes; // Mostra todos os pratos
```

## 📊 Exemplo de Output Esperado

### Caso Normal (Pratos Normais)
```
🍽️ [DishesTab] Dados brutos: {
  total_dishes: 5,
  dishes_sample: [
    { id: '1', name: 'Tigela Nordestina', product_type: 'preparado' },
    { id: '2', name: 'Arroz de Polenta', product_type: 'preparado' },
    { id: '3', name: 'Costela', product_type: 'preparado' }
  ]
}

🍽️ [DishesTab] Após filtro de pizza: {
  total_safe_dishes: 5,
  removed_pizzas: 0
}
```

### Caso Problemático (Pratos são Pizzas)
```
🍽️ [DishesTab] Dados brutos: {
  total_dishes: 5,
  dishes_sample: [
    { id: '1', name: 'Tigela Nordestina', product_type: 'pizza' },
    { id: '2', name: 'Arroz de Polenta', product_type: 'pizza' },
    { id: '3', name: 'Costela', product_type: 'pizza' }
  ]
}

🍽️ [DishesTab] Após filtro de pizza: {
  total_safe_dishes: 0,
  removed_pizzas: 5
}
```

## 🎯 Próximos Passos

1. **Teste agora**: Recarregue o painel e verifique o console
2. **Compartilhe o log**: Me mostre o que apareceu no console
3. **Aplicar solução**: Baseado no log, aplicarei a correção adequada

---

## ⚠️ Nota Importante

O sistema DigiMenu separa pratos normais de pizzas porque pizzas têm um editor especial com sabores, bordas, tamanhos, etc. Se você cadastrou pratos normais mas eles estão com `product_type: 'pizza'`, precisamos corrigir isso no banco de dados.

---

**Criado em:** 15/02/2026
**Status:** Aguardando teste do usuário
