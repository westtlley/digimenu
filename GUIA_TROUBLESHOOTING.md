# 🛠️ Guia de Troubleshooting - DigiMenu

## 🚨 Problema: "Nada Aparece" / Página em Branco

### Passo 1: Verificar se os Servidores Estão Rodando

**Backend:**
```powershell
# Em um terminal PowerShell
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu\backend"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Você deve ver:
```
🚀 Servidor rodando na porta 3000
📡 API disponível em http://localhost:3000/api
💚 Health check: http://localhost:3000/api/health
```

**Frontend:**
```powershell
# Em outro terminal PowerShell
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu"
& "C:\Program Files\nodejs\nnpm.cmd" run dev
```

Você deve ver:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Passo 2: Abrir o Navegador

1. Abra o navegador (Chrome, Edge ou Firefox)
2. Acesse: **http://localhost:5173**
3. Pressione **F12** para abrir o Console

### Passo 3: Verificar Erros no Console

No Console do navegador, procure por:
- ❌ Mensagens em **vermelho**
- ⚠️ Avisos em **amarelo**

**Erros comuns:**

#### Erro 1: "Failed to fetch" ou "Network error"
**Causa:** Backend não está rodando ou CORS bloqueado
**Solução:** 
- Verifique se o backend está rodando
- Verifique se a porta 3000 está livre

#### Erro 2: "Cannot find module '@/...'"
**Causa:** Problema com aliases do Vite
**Solução:**
```powershell
# Pare o servidor (Ctrl + C)
# Limpe o cache
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
# Reinicie
& "C:\Program Files\nodejs\npm.cmd" run dev
```

#### Erro 3: "Uncaught ReferenceError: apiClient is not defined"
**Causa:** Problema com o apiClient
**Solução:** Já foi corrigido, mas se aparecer, reinicie o servidor

#### Erro 4: "Cannot read property '...' of undefined"
**Causa:** Componente tentando acessar propriedade inexistente
**Solução:** Verifique qual componente está causando o erro

#### Erro 5: "Uncaught SyntaxError: Unexpected token 'export'" em `webpage_content_reporter.js` (Admin quebrado / menu some)
**Causa:** **Não é código do DigiMenu.** É script **injetado por extensão do navegador** (tradutor, antivírus, SEO, acessibilidade, etc.). Essas extensões injetam JS que usa `export` em um contexto que não suporta ES Modules → o JavaScript para de executar e o React não termina de montar a aplicação.
**Sintomas:** menu não aparece, seções somem, Admin renderiza “pela metade”.
**Solução (recomendada):** Abrir o Admin em **aba anônima** (sem extensões) ou desativar extensões nesse domínio. Se o erro sumir e os menus voltarem, está confirmado.
**Observação:** Erros de WebSocket no console (ex.: `socket.io` falhou) **não** são a causa — só afetam realtime/notificações; a API e o cardápio podem funcionar normalmente.

### Passo 4: Verificar a Aba Network

1. Na aba **Network** (Rede)
2. Recarregue a página (`F5`)
3. Verifique:
   - ✅ `main.jsx` está carregando? (Status 200)
   - ✅ `index.css` está carregando? (Status 200)
   - ❌ Algum arquivo com Status 404?

### Passo 5: Verificar o Elemento Root

1. Na aba **Elements** (Chrome) ou **Inspector** (Firefox)
2. Procure por `<div id="root"></div>`
3. Clique nele e verifique:
   - Está vazio? → Erro de renderização
   - Tem conteúdo? → Problema de CSS ou layout

## 🔧 Soluções Rápidas

### Solução 1: Limpar Cache e Reinstalar

```powershell
# Pare todos os servidores (Ctrl + C em cada terminal)

# Frontend
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu"
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
& "C:\Program Files\nodejs\npm.cmd" install

# Backend
cd backend
& "C:\Program Files\nodejs\npm.cmd" install
```

### Solução 2: Verificar Portas

```powershell
# Verificar se as portas estão em uso
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5173"
```

Se estiverem em uso por outro processo, você pode:
- Parar o processo que está usando a porta
- Ou mudar a porta no código

### Solução 3: Usar o Arquivo de Teste

Abra o arquivo `teste-simples.html` no navegador para verificar se as conexões estão funcionando.

## 📋 Checklist Completo

- [ ] Backend rodando na porta 3000
- [ ] Frontend rodando na porta 5173
- [ ] Navegador acessando http://localhost:5173
- [ ] Console do navegador aberto (F12)
- [ ] Sem erros no Console
- [ ] Arquivos carregando na aba Network
- [ ] Elemento #root tem conteúdo na aba Elements

## 🆘 Se Nada Funcionar

1. **Copie TODOS os erros do Console** (mensagens em vermelho)
2. **Tire um print da aba Network** mostrando os arquivos que falharam
3. **Envie essas informações** para análise

## 📞 Informações Úteis para Enviar

Quando pedir ajuda, inclua:
- ✅ Versão do Node.js: `node --version`
- ✅ Versão do npm: `& "C:\Program Files\nodejs\npm.cmd" --version`
- ✅ Erros do Console (copie e cole)
- ✅ Screenshot da aba Network
- ✅ O que você vê na tela (branco? erro? algo parcial?)
