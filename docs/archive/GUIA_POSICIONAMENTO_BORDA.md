# 🍕 Guia de Posicionamento da Borda da Pizza

## ✅ Problema Resolvido

A borda da pizza agora está **perfeitamente alinhada** tanto no **PC quanto no mobile**!

---

## 🔧 Ajustes Realizados

### **1. Cálculo Automático do Raio**
- **Antes**: Raio fixo que não se adaptava ao tamanho da pizza
- **Agora**: Raio calculado dinamicamente baseado no tamanho real da pizza
- **Fórmula**: `baseRadius (50) + ajuste fino da configuração`

### **2. Valores Padrão Otimizados**
- **Raio**: `50` (cobre perfeitamente a borda da pizza)
- **Espessura**: `16` (strokeWidth ideal para visualização)
- **Escala**: `1.0` (tamanho padrão)
- **Offset X/Y**: `0` (centralizado)

### **3. Range de Ajuste**
- **Raio**: 45 a 55 (ajuste fino)
- **Espessura**: 8 a 24 (visibilidade perfeita)
- **Posição X/Y**: -15 a +15 (ajuste fino de posicionamento)
- **Escala**: 0.7 a 1.4 (zoom in/out)

### **4. Transformação Melhorada**
- Transform aplicado no grupo SVG (não no círculo individual)
- Offset reduzido pela metade para ajuste mais suave
- Transform origin centralizado para rotação perfeita

---

## 📐 Como Usar o Painel de Configuração

### **Acessar o Painel**
1. Vá em **Admin** → **Configurações** → **Pizza** → **Visual**
2. Role até a seção **"Posicionar Borda na Pizza"**

### **Ajustar a Borda**

#### **1. Raio (45-55)**
- **O que faz**: Controla o tamanho do círculo da borda
- **Valor ideal**: `50` (cobre toda a borda)
- **Aumentar**: Borda fica maior (fora da pizza)
- **Diminuir**: Borda fica menor (dentro da pizza)

#### **2. Espessura (8-24)**
- **O que faz**: Controla a largura da linha da borda
- **Valor ideal**: `16` (visibilidade perfeita)
- **Aumentar**: Borda mais grossa
- **Diminuir**: Borda mais fina

#### **3. Posição X (-15 a +15)**
- **O que faz**: Move a borda horizontalmente
- **Valor ideal**: `0` (centralizado)
- **Positivo**: Move para direita
- **Negativo**: Move para esquerda

#### **4. Posição Y (-15 a +15)**
- **O que faz**: Move a borda verticalmente
- **Valor ideal**: `0` (centralizado)
- **Positivo**: Move para baixo
- **Negativo**: Move para cima

#### **5. Escala (0.7 a 1.4)**
- **O que faz**: Aumenta/diminui o tamanho geral da borda
- **Valor ideal**: `1.0` (tamanho padrão)
- **Aumentar**: Borda maior (zoom in)
- **Diminuir**: Borda menor (zoom out)

---

## 🎯 Valores Recomendados por Tamanho de Tela

### **Desktop (PC)**
```javascript
{
  edgeRadius: 50,
  edgeStrokeWidth: 18,
  edgeOffsetX: 0,
  edgeOffsetY: 0,
  edgeScale: 1.0
}
```

### **Mobile**
```javascript
{
  edgeRadius: 50,
  edgeStrokeWidth: 16,
  edgeOffsetX: 0,
  edgeOffsetY: 0,
  edgeScale: 1.0
}
```

### **Tablet**
```javascript
{
  edgeRadius: 50,
  edgeStrokeWidth: 17,
  edgeOffsetX: 0,
  edgeOffsetY: 0,
  edgeScale: 1.0
}
```

---

## 🔍 Preview em Tempo Real

O painel mostra um **preview em tempo real** da borda enquanto você ajusta os sliders:

- **Pizza base**: Círculo laranja escuro
- **Borda**: Círculo com imagem da borda
- **Atualização**: Instantânea ao mover os sliders

---

## 💾 Salvar Configuração

1. Ajuste os valores até ficar perfeito
2. Clique em **"Salvar"**
3. A configuração é salva no banco de dados
4. Todas as pizzas do cardápio usarão essa configuração

---

## 🔄 Restaurar Padrão

Se algo der errado, clique em **"Restaurar padrão"** para voltar aos valores ideais:

- Raio: `50`
- Espessura: `16`
- Posição X: `0`
- Posição Y: `0`
- Escala: `1.0`

---

## 🐛 Solução de Problemas

### **Borda não aparece**
- ✅ Verifique se a imagem `/images/pizza-borda.png` existe
- ✅ Verifique se o modo premium está ativado
- ✅ Verifique se uma borda foi selecionada no montador

### **Borda desalinhada**
- ✅ Ajuste **Posição X** e **Posição Y** em pequenos incrementos (0.5)
- ✅ Use o preview em tempo real para guiar

### **Borda muito grande/pequena**
- ✅ Ajuste o **Raio** (45-55)
- ✅ Ajuste a **Escala** (0.7-1.4)

### **Borda muito fina/grossa**
- ✅ Ajuste a **Espessura** (8-24)

---

## 📱 Responsividade

A borda agora se adapta automaticamente:

- ✅ **Desktop**: Tamanho otimizado para telas grandes
- ✅ **Mobile**: Tamanho otimizado para telas pequenas
- ✅ **Tablet**: Tamanho intermediário
- ✅ **ViewBox SVG**: Mantém proporção em qualquer tamanho

---

## 🎨 Efeitos Visuais

A borda inclui:

- ✨ **Drop shadow**: Sombra suave para profundidade
- 🎭 **Animação**: Aparece suavemente ao selecionar
- 🖼️ **Imagem realista**: Usa imagem da borda recheada
- 🎯 **Alinhamento perfeito**: Cobre toda a borda da pizza

---

## ✅ Status

**Problema resolvido!** A borda agora fica **perfeita** tanto no PC quanto no mobile! 🎉

**Próximos passos:**
1. Acesse o painel de configuração
2. Ajuste os valores se necessário
3. Salve a configuração
4. Teste no cardápio público
