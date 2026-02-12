# Cardápio: próximos passos (Chatbot, Joguinho, Design)

Itens planejados para o cardápio, a implementar em etapas.

---

## 1. Chatbot para pedidos

**Objetivo:** o cliente poder montar o pedido via chat (ex. “1 x-tudo, 2 coca”).

**Opções de implementação:**

- **A) Regras (regex/NLP simples)**  
  - Interpretar frases como “quero 2 x-tudo” ou “1 pizza mussarela grande” e mapear para pratos/categorias.  
  - Exige lista de sinônimos e de pratos; boa para cardápios pequenos.

- **B) Botões guiados**  
  - O “chat” mostra categorias e pratos como botões; o usuário clica e vai montando o pedido.  
  - Mais simples e previsível; funciona bem em mobile.

- **C) IA (LLM)**  
  - Enviar o cardápio (categorias, pratos, preços) + mensagem do usuário para uma API (OpenAI, etc.) e interpretar a resposta como itens do pedido.  
  - Mais flexível, mas custo de API e necessidade de moderar respostas.

**Sugestão:** começar com **(B)** (fluxo guiado por botões) e, em uma segunda fase, adicionar **(A)** para aceitar também texto livre com regras simples.

**Onde no código:** novo componente `CardapioChatbot.jsx` (ou `ChatbotPedido.jsx`), acionado por um botão flutuante no canto do cardápio; ao final, os itens vão para o mesmo `useCart` e `CartModal`.

---

## 2. Joguinho enquanto espera

**Objetivo:** entretenimento rápido na tela (ex. após o pedido ser enviado ou enquanto aguarda).

**Ideias:**

- **Mini-jogo da memória** (virar cartas e achar pares de pratos/emojis).
- **Perguntas sobre o restaurante** (ex. “Em que ano abrimos?”) com 2–3 alternativas.
- **Quiz de pratos** (mostrar imagem e escolher o nome).
- **Jogo do “ache o ingrediente”** (cliques em um grid).

**Onde no código:**  
- Componente `MiniGameWhileWait.jsx` (ou `CardapioMinigame.jsx`).  
- Exibido em um modal ou em uma “tela de aguarde” após enviar o pedido, com botão “Fechar” ou “Ver meu pedido”.

**Detalhe:** usar CSS/JS puro ou lib leve (ex. apenas `framer-motion` que já existe) para não pesar o bundle.

---

## 3. Melhorias de design do cardápio

**Objetivo:** deixar o cardápio mais profissional e coerente com a identidade da loja.

**Sugestões:**

- **Tipografia:**  
  - Títulos com fontes mais marcantes (ex. `font-display` do Tailwind ou Google Fonts).  
  - Hierarquia clara: nome do prato > descrição > preço.

- **Cards de pratos:**  
  - Cantos, sombras e hovers padronizados.  
  - Imagem com `aspect-ratio` e `object-fit` consistentes; fallback quando não houver foto.

- **Cores e tema:**  
  - Usar de forma sistemática `primaryColor` (e variáveis de tema) em botões, destaques e ícones.  
  - Evitar mistura de muitos accent colors.

- **Espaçamento e grid:**  
  - Grid responsivo (1 col mobile, 2–3 em tablet, 3–4 em desktop).  
  - Padding e gaps uniformes entre seções.

- **Microinterações:**  
  - Transições suaves ao filtrar categorias, ao abrir modais e ao adicionar ao carrinho (já há `framer-motion`).

- **Acessibilidade:**  
  - Contraste de texto/fundo, `alt` em imagens, botões e links com área de toque adequada.

**Onde no código:**  
- `Cardapio.jsx`, `DishSkeleton`, `PromotionBanner`, `CartModal` e componentes de prato (ex. em `NewDishModal` ou onde os cards são renderizados).  
- Revisar classes Tailwind e variáveis CSS em `Layout.jsx` / tema.

---

## Ordem sugerida

1. **Design** – ajustes visuais e de layout (impacto alto, esforço médio).  
2. **Chatbot (versão guiada)** – botões para montar o pedido (impacto alto, esforço médio).  
3. **Joguinho** – um único minijogo simples (impacto médio, esforço médio).  
4. **Chatbot (texto livre)** – regras ou IA para interpretar mensagens (impacto alto, esforço maior).

Se quiser, podemos detalhar a implementação de um desses itens no código (por exemplo: estrutura do `CardapioChatbot` e integração com o carrinho).
