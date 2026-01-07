# 🔍 Diagnóstico - Página em Branco

## ✅ Verificações Realizadas

- ✅ Backend rodando na porta 3000
- ✅ Frontend rodando na porta 5173
- ✅ Servidores respondendo corretamente

## 🔧 Passos para Diagnosticar

### 1. Abra o Console do Navegador

1. Abra o navegador (Chrome, Edge, Firefox)
2. Acesse: `http://localhost:5173`
3. Pressione `F12` para abrir as Ferramentas de Desenvolvedor
4. Vá na aba **Console**
5. **Verifique se há erros em vermelho**

### 2. Verifique a Aba Network

1. Na aba **Network** (Rede)
2. Recarregue a página (`Ctrl + R` ou `F5`)
3. Verifique se há requisições falhando (em vermelho)
4. Verifique se o arquivo `main.jsx` está sendo carregado

### 3. Verifique a Aba Elements/Inspector

1. Na aba **Elements** (Chrome) ou **Inspector** (Firefox)
2. Procure pelo elemento `<div id="root"></div>`
3. Verifique se há conteúdo dentro dele

## 🐛 Problemas Comuns e Soluções

### Problema 1: Erro "Cannot find module" ou "Failed to resolve"

**Solução:**
```powershell
# Pare os servidores (Ctrl + C)
# Limpe o cache e reinstale
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu"
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
& "C:\Program Files\nodejs\npm.cmd" install
```

### Problema 2: Erro de CORS

**Solução:** O backend já está configurado com CORS. Se ainda houver erro, verifique se o backend está rodando.

### Problema 3: Página completamente em branco

**Possíveis causas:**
- Erro JavaScript bloqueando a renderização
- Problema com React Router
- Erro no ThemeProvider

**Solução:** Verifique o console do navegador para ver o erro específico.

### Problema 4: Erro "localStorage is not defined"

**Solução:** Isso não deve acontecer no navegador, mas se acontecer, pode ser um problema de SSR. Não é o caso aqui.

## 📋 Checklist de Verificação

- [ ] Console do navegador aberto (F12)
- [ ] Acessou `http://localhost:5173`
- [ ] Verificou erros no Console
- [ ] Verificou a aba Network
- [ ] Verificou se o elemento `#root` tem conteúdo
- [ ] Backend está rodando em `http://localhost:3000`
- [ ] Frontend está rodando em `http://localhost:5173`

## 🚀 Teste Rápido

Abra o PowerShell e execute:

```powershell
# Testar backend
Invoke-WebRequest -Uri "http://localhost:3000/api/health" | Select-Object -ExpandProperty Content

# Testar frontend
Invoke-WebRequest -Uri "http://localhost:5173" | Select-Object StatusCode
```

Ambos devem retornar sucesso.

## 📞 Próximos Passos

**Se você encontrar erros no console, copie e cole a mensagem de erro completa aqui.**

Os erros mais comuns são:
- `Uncaught ReferenceError: ...`
- `Failed to resolve import ...`
- `Cannot read property ... of undefined`
- `TypeError: ...`
