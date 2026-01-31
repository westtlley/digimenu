# Melhorias e Sugestões - Modo Pizza

## Implementadas nesta versão

### 1. Configuração do tamanho da borda
- **Onde:** Admin > Pizzas > Visualização
- Ajuste **espessura** (6-20) e **raio** (40-55) para a borda cobrir melhor a pizza
- A borda fica mais nítida e bem posicionada

### 2. Fluxo sequencial de montagem
- **Ordem:** Sabores → Borda → Extras → Observações
- Borda só habilita após selecionar pelo menos 1 sabor
- Extras só habilitam após escolher borda (ou "Sem borda")

### 3. Limite de extras por tamanho
- **Onde:** Admin > Pizzas > Tamanhos > Editar
- Campo "Máx. Extras" (0-10) em cada tamanho
- Ex: Pizza P pode ter 2 extras, G pode ter 5

### 4. Categorias por quantidade de sabores
- **Máx. Sabores** limitado a 1-4 por tamanho
- Pizza 1 sabor, 2 sabores, 3 ou 4 sabores

### 5. Visualização em raios (fatias)
- Pizza dividida em **fatias radiais** (como pizza real)
- 2 sabores = 2 metades | 3 sabores = 3 fatias | 4 sabores = 4 quadrantes
- Não mais divisão vertical

---

## Sugestões futuras

### UX e interface
- **Preview em tempo real** ao ajustar borda nas configurações
- **Tooltip** nos campos de config explicando o efeito
- **Atalhos** no mobile (ex: swipe entre etapas)
- **Indicador de progresso** mais visual no fluxo

### Visualização
- **Zoom** na pizza ao tocar (mobile)
- **Rotação** da pizza para ver todos os sabores
- **Animação** ao adicionar cada sabor
- **Modo escuro** para a tela de montagem

### Configurações
- **Imagem da borda por tipo** (Catupiry, Cheddar com imagens diferentes)
- **Posição da borda** (mais interna/externa)
- **Opacidade** da borda
- **Cores padrão** por categoria de sabor

### Negócio
- **Combo de borda** (ex: Catupiry + Bacon)
- **Promoções** por combinação (ex: 2 sabores tradicionais com desconto)
- **Recomendações** ("Clientes que pediram X também pediram Y")
- **Favoritos** - salvar pizza montada para recompra rápida

### Técnico
- **Cache** das imagens de sabores para carregamento mais rápido
- **Lazy load** na lista de sabores (muitos itens)
- **PWA** - funcionar offline no cardápio
- **A/B test** de layouts para medir conversão
