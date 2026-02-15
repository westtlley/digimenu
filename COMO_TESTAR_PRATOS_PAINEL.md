# 🔍 INSTRUÇÕES DE TESTE - Pratos no Painel

## ⚠️ IMPORTANTE: Limpar Cache Primeiro

Antes de testar, LIMPE O CACHE do navegador:

### Opção 1: Hard Reload
```
Ctrl + Shift + R (Chrome/Edge)
ou
Ctrl + F5
```

### Opção 2: Limpar Cache Manualmente
```
1. F12 (abrir DevTools)
2. Clique com botão direito no ícone de Reload
3. Selecione "Empty Cache and Hard Reload"
```

## 📋 Passo a Passo para Testar

### PASSO 1: Faça Login
Acesse e faça login como assinante:
```
http://localhost:5173/s/temporodaneta/login
```

### PASSO 2: Vá para o Painel
Depois de logar, clique em "Painel" ou acesse diretamente:
```
http://localhost:5173/s/temporodaneta/PainelAssinante
```

### PASSO 3: Clique na Aba "Pratos"
No menu lateral esquerdo, clique em:
```
🍽️ Pratos (ou "Restaurante" → "Pratos")
```

Ou acesse diretamente:
```
http://localhost:5173/s/temporodaneta/PainelAssinante?tab=dishes
```

### PASSO 4: Abra o Console
```
Pressione F12
Clique na aba "Console"
```

### PASSO 5: Procure por estas mensagens
```javascript
📦 [adminMenuService] Buscando pratos admin...
⚠️ [adminMenuService] Rota admin falhou, tentando fallback público
✅ [adminMenuService] Dados públicos como fallback: X pratos
🍽️ [DishesTab] Dados brutos: {...}
```

## 🚫 O que NÃO fazer

❌ NÃO acesse `/assinantes` (lista de assinantes)
❌ NÃO use `/admin` se você não é master
❌ NÃO esqueça de limpar o cache

## ✅ O que você DEVE ver

Se funcionar:
1. ✅ Lista de pratos no painel
2. ✅ Mensagens de log no console
3. ✅ Tigela nordestina, Arroz de panela, Costela, etc.

Se NÃO funcionar:
1. ❌ "Você ainda não cadastrou nenhum prato"
2. ❌ Nenhuma mensagem de log
3. ❌ Erros 404 no console

## 📸 Me envie Screenshot

Se não funcionar, me envie screenshot de:
1. A página que você está vendo (URL na barra)
2. O console (F12 → Console)
3. A aba Network (F12 → Network → filtrar por "Dish")

---

**Lembre-se: LIMPE O CACHE antes de testar!**
