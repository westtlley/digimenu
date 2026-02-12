# 🍕 Borda Dividida em Fatias com Imagem

## ✅ Nova Implementação

A borda agora funciona **exatamente igual aos sabores da pizza**:
- ✅ **Círculo menor** (raio configurável, padrão 48)
- ✅ **Dividido em fatias** (igual ao número de fatias da pizza)
- ✅ **Preenchido com imagem** (mesmo sistema dos sabores)
- ✅ **Rotação por fatia** (cada fatia mostra a imagem rotacionada)

---

## 🎯 Como Funciona

### **1. Círculo Menor**
A borda é um círculo **menor que a pizza**:
- **Raio da pizza**: 50 (viewBox 100x100)
- **Raio da borda**: 45-48 (configurável no painel)
- **Posicionamento**: Centralizado (pode ser ajustado com Offset X/Y)

### **2. Divisão em Fatias**
A borda é dividida em **fatias iguais** ao número de fatias da pizza:
- **Pizza 1 sabor** → Borda 1 fatia (círculo completo)
- **Pizza 2 sabores** → Borda 2 fatias (meio/meto)
- **Pizza 4 sabores** → Borda 4 fatias (quartos)
- **Pizza 6 sabores** → Borda 6 fatias (sextos)
- **Pizza 8 sabores** → Borda 8 fatias (oitavos)

### **3. Preenchimento com Imagem**
Cada fatia da borda é preenchida com a **imagem da borda**:
- Usa o mesmo sistema de **SVG Pattern** dos sabores
- Cada fatia tem sua própria pattern
- A imagem é rotacionada para cada fatia
- Se não houver imagem, usa cor padrão (#f5deb3)

---

## 🖼️ Imagem da Borda

### **Onde Configurar**

#### **Opção 1: Imagem Global (Todas as Bordas)**
- **Admin** → **Configurações** → **Pizza** → **Visual**
- Campo: `edgeImageUrl` (padrão: `/images/pizza-borda.png`)

#### **Opção 2: Imagem por Borda (Específica)**
- **Admin** → **Configurações** → **Pizza** → **Sabores e Bordas**
- Ao criar/editar uma borda, adicione uma **imagem**
- Cada borda pode ter sua própria imagem!

### **Formato da Imagem**
- **Formato**: PNG, JPG, WebP
- **Tamanho**: 500x500px ou maior (recomendado)
- **Fundo**: Transparente ou preto
- **Conteúdo**: Borda recheada circular
- **Qualidade**: Alta resolução para melhor visualização

---

## ⚙️ Configurações do Painel

### **Raio (45-55)**
- **O que faz**: Controla o tamanho do círculo da borda
- **Valor padrão**: 48
- **Aumentar**: Borda maior (mais próxima da borda da pizza)
- **Diminuir**: Borda menor (mais interna)

### **Posição X/Y (-15 a +15)**
- **O que faz**: Move a borda horizontal/verticalmente
- **Valor padrão**: 0 (centralizado)
- **Útil para**: Ajustar alinhamento fino

### **Escala (0.7 a 1.4)**
- **O que faz**: Aumenta/diminui o tamanho geral
- **Valor padrão**: 1.0
- **Útil para**: Ajustar proporção

---

## 🎨 Renderização

### **SVG Pattern por Fatia**
```javascript
{Array.from({ length: slices }).map((_, i) => (
  <pattern 
    id={`edge-slice-${i}`}
    patternContentUnits="objectBoundingBox"
  >
    <image 
      href={edgeImage}
      transform={`rotate(${(360 / slices) * i} 0.5 0.5)`}
    />
  </pattern>
))}
```

### **Paths das Fatias**
```javascript
// Cada fatia é um path SVG
const pathData = `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

<path
  d={pathData}
  fill={`url(#edge-slice-${i})`}
/>
```

---

## 📐 Exemplos Visuais

### **Pizza 1 Sabor (Borda 1 Fatia)**
```
    [Pizza]
  [Borda] ← Círculo completo
```

### **Pizza 2 Sabores (Borda 2 Fatias)**
```
  [Pizza]
  [Meio] [Meio] ← Dividida ao meio
```

### **Pizza 4 Sabores (Borda 4 Fatias)**
```
  [Pizza]
  [1/4] [1/4]
  [1/4] [1/4] ← Dividida em 4
```

### **Pizza 8 Sabores (Borda 8 Fatias)**
```
  [Pizza]
  [1/8] [1/8] [1/8] [1/8]
  [1/8] [1/8] [1/8] [1/8] ← Dividida em 8
```

---

## 🔄 Fluxo Completo

1. **Cliente seleciona pizza** → Abre montador
2. **Seleciona tamanho** → Define número de fatias (maxFlavors)
3. **Seleciona sabores** → Preenche fatias da pizza
4. **Seleciona borda** → Borda aparece dividida em fatias iguais
5. **Cada fatia da borda** → Preenchida com imagem rotacionada
6. **Resultado** → Pizza com borda realista dividida!

---

## 🎯 Vantagens

### **Antes (CSS Gradiente):**
- ❌ Cores fixas (não realista)
- ❌ Sem textura real
- ❌ Não se adapta ao número de fatias

### **Agora (Imagem em Fatias):**
- ✅ **Imagem real** da borda recheada
- ✅ **Textura realista** como os sabores
- ✅ **Adapta-se automaticamente** ao número de fatias
- ✅ **Mesmo sistema** dos sabores (consistente)
- ✅ **Rotação por fatia** (visual perfeito)

---

## 🖼️ Como Adicionar Imagem da Borda

### **Método 1: Imagem Global**
1. Coloque a imagem em `/public/images/pizza-borda.png`
2. A imagem será usada para todas as bordas

### **Método 2: Imagem por Borda**
1. Vá em **Admin** → **Pizza** → **Sabores e Bordas**
2. Edite ou crie uma borda
3. Faça upload da imagem
4. Salve
5. Essa borda usará sua imagem específica

---

## 🎨 Dicas de Imagem

### **Boa Imagem de Borda:**
- ✅ **Circular** ou **anular** (formato de borda)
- ✅ **Alta resolução** (500x500px mínimo)
- ✅ **Fundo transparente** ou preto
- ✅ **Textura realista** (mostra o recheio)
- ✅ **Iluminação** (destaques e sombras)

### **Exemplos:**
- **Catupiry**: Bege cremoso com textura
- **Cheddar**: Laranja/dourado com brilho
- **Chocolate**: Marrom com textura suave
- **Doce de Leite**: Bege claro com caramelo

---

## 🔧 Troubleshooting

### **Borda não aparece:**
- ✅ Verifique se uma borda foi selecionada
- ✅ Verifique se a imagem existe
- ✅ Verifique se o modo premium está ativado

### **Borda não divide em fatias:**
- ✅ Verifique se o número de fatias está correto
- ✅ Verifique se `maxFlavors` está definido

### **Imagem não carrega:**
- ✅ Verifique o caminho da imagem
- ✅ Verifique se o arquivo existe
- ✅ Verifique o formato (PNG, JPG, WebP)

---

## ✅ Status

**Implementação completa!** A borda agora funciona **exatamente igual aos sabores**, com:
- ✅ Círculo menor dividido em fatias
- ✅ Preenchimento com imagem real
- ✅ Rotação por fatia
- ✅ Adaptação automática ao número de fatias
- ✅ Sistema consistente com os sabores

**Teste agora e veja a borda dividida em fatias com imagem real!** 🍕✨
