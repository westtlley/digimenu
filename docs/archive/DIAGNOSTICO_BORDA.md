# 🔍 Diagnóstico da Borda da Pizza

## ✅ Verificações Necessárias

### **1. A Borda Está Sendo Selecionada?**

**No Montador de Pizza:**
1. Abra uma pizza no cardápio
2. Selecione um sabor
3. Clique em **"Borda"**
4. Escolha uma borda (ex: Catupiry)
5. **Confirme** a seleção

**Verifique:**
- ✅ A borda aparece na lista de opções?
- ✅ Você consegue selecionar uma borda?
- ✅ O botão "Confirmar" funciona?

---

### **2. A Imagem da Borda Existe?**

**Verificar no servidor:**
- Caminho: `/public/images/pizza-borda.png`
- A imagem deve existir no repositório

**Como verificar:**
1. Abra o DevTools (F12)
2. Vá na aba **Network**
3. Filtre por "pizza-borda"
4. Recarregue a página
5. Veja se a imagem é carregada (status 200) ou se dá erro 404

**Se der 404:**
- A imagem não está no servidor
- Faça upload da imagem para `/public/images/pizza-borda.png`

---

### **3. Os Valores de Configuração Estão Salvos?**

**Verificar no Admin:**
1. Vá em **Admin** → **Configurações** → **Pizza** → **Visual**
2. Role até **"Posicionar Borda na Pizza"**
3. Veja os valores atuais:
   - Raio: deve ser entre 45-55
   - Espessura: deve ser entre 8-24
   - Posição X/Y: pode ser 0
   - Escala: deve ser 1.0

**Se os valores estiverem zerados ou errados:**
1. Ajuste os sliders
2. Clique em **"Salvar"**
3. Aguarde a confirmação
4. Teste novamente

---

### **4. O Modo Premium Está Ativado?**

**Verificar:**
1. No painel de configuração
2. Veja se o **"Modo Premium"** está **ATIVADO** (switch verde)
3. Se não estiver, ative e salve

**Importante:** A borda só aparece se o modo premium estiver ativado!

---

### **5. Verificar no Console do Navegador**

**Abra o DevTools (F12) e veja se há erros:**

```javascript
// Erros comuns:
- "Failed to load resource: pizza-borda.png" → Imagem não encontrada
- "ReferenceError: selectedEdge is not defined" → Erro no código
- "Pattern not found" → Problema com o SVG pattern
```

---

## 🔧 Soluções Rápidas

### **Solução 1: Restaurar Valores Padrão**

1. Vá no painel de configuração
2. Clique em **"Restaurar padrão"**
3. Clique em **"Salvar"**
4. Teste novamente

**Valores padrão:**
- Raio: 50
- Espessura: 16
- Posição X: 0
- Posição Y: 0
- Escala: 1.0

---

### **Solução 2: Verificar Imagem da Borda**

**Se a imagem não carregar:**

1. Verifique se o arquivo existe:
   ```
   /public/images/pizza-borda.png
   ```

2. Se não existir, adicione uma imagem:
   - Formato: PNG
   - Tamanho: 500x500px ou maior
   - Fundo: Transparente ou preto
   - Conteúdo: Borda recheada circular

3. Faça commit e push:
   ```bash
   git add public/images/pizza-borda.png
   git commit -m "add: imagem da borda da pizza"
   git push origin main
   ```

---

### **Solução 3: Limpar Cache**

**No navegador:**
1. Ctrl + Shift + R (hard refresh)
2. Ou limpe o cache completamente
3. Teste novamente

**No Vercel:**
- Aguarde 2-3 minutos após o push
- O deploy pode estar em andamento

---

### **Solução 4: Verificar se a Borda Foi Selecionada**

**No código (DevTools Console):**
```javascript
// Execute no console:
console.log('Borda selecionada:', selectedEdge);
```

**Se retornar `null` ou `undefined`:**
- A borda não foi selecionada
- Volte ao montador e selecione uma borda

---

## 🎯 Teste Passo a Passo

### **1. Teste Básico**
1. ✅ Abra o cardápio
2. ✅ Clique em uma pizza
3. ✅ Selecione um sabor
4. ✅ Clique em "Borda"
5. ✅ Selecione "Catupiry" (ou outra)
6. ✅ Confirme
7. ✅ **A borda deve aparecer na pizza circular**

### **2. Teste de Configuração**
1. ✅ Vá no Admin → Pizza → Visual
2. ✅ Veja o preview da borda
3. ✅ Ajuste o Raio para 50
4. ✅ Ajuste a Espessura para 16
5. ✅ Clique em "Salvar"
6. ✅ Teste no cardápio novamente

### **3. Teste de Imagem**
1. ✅ Abra o DevTools (F12)
2. ✅ Vá em Network
3. ✅ Filtre por "pizza-borda"
4. ✅ Recarregue a página
5. ✅ Veja se a imagem carrega (status 200)

---

## 🐛 Problemas Comuns

### **Problema 1: Borda não aparece**
**Causa:** Modo premium desativado ou borda não selecionada
**Solução:** Ative o modo premium e selecione uma borda

### **Problema 2: Borda desalinhada**
**Causa:** Valores de posição incorretos
**Solução:** Ajuste Posição X/Y no painel de configuração

### **Problema 3: Borda muito grande/pequena**
**Causa:** Raio ou escala incorretos
**Solução:** Ajuste Raio (45-55) ou Escala (0.7-1.4)

### **Problema 4: Borda muito fina/grossa**
**Causa:** Espessura incorreta
**Solução:** Ajuste Espessura (8-24)

### **Problema 5: Imagem não carrega**
**Causa:** Arquivo não existe ou caminho errado
**Solução:** Verifique se `/public/images/pizza-borda.png` existe

---

## 📞 Próximos Passos

Se após todas essas verificações a borda ainda não aparecer:

1. **Envie um print** da tela do montador
2. **Envie um print** do painel de configuração
3. **Envie os logs** do console (F12 → Console)
4. **Informe** qual borda você selecionou

Com essas informações, posso diagnosticar o problema específico! 🔍
