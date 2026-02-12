# DigiMenu – Responsividade e Uso Mobile

Guia das adaptações para **mobile** e **PWA/app**, garantindo que todas as funções e sessões funcionem bem em celulares e em versão app.

---

## Meta e viewport (index.html)

- **viewport:** `width=device-width, initial-scale=1.0, viewport-fit=cover`  
  - `viewport-fit=cover` para aproveitar a tela inteira em dispositivos com notch.
- **theme-color:** definido para light e dark (barra de status do navegador).
- **mobile-web-app-capable:** `yes` para comportamento de app quando instalado (PWA).

---

## Safe area (notch e barra de gestos)

Classes em `Layout.jsx`:

- `.safe-top` – `padding-top: env(safe-area-inset-top)`
- `.safe-bottom` – `padding-bottom: env(safe-area-inset-bottom)`
- `.safe-left` / `.safe-right` / `.safe-x` / `.safe-y`

Uso típico: barras fixas no topo ou na base (headers, botão “Ver Comanda”, rodapés de modais, etc.).

---

## Áreas de toque (touch targets)

- Mínimo: **44×44px** para botões e links principais.
- No Tailwind: `min-h-touch min-w-touch` (44px em `tailwind.config.js`).
- Onde foi aplicado:
  - Hambúrguer e fechar do menu (Admin, PainelAssinante, GestorPedidos, SharedSidebar, AdminSidebar).
  - Fechar de Dialog e Sheet.
  - Fechar da comanda mobile no PDV.
  - Botão “Entrar” no Login e “Finalizar Venda” no PDV (mobile).

---

## Sidebars em mobile (drawer)

- **Admin** e **PainelAssinante:**  
  - Sidebar em `fixed` + `-translate-x-full` quando fechado.  
  - Overlay ao abrir; ao escolher item ou fechar, a sidebar some.  
  - Botão de abrir com `min-h-touch min-w-touch` e `aria-label="Abrir menu"`.
- **GestorPedidos:**  
  - Menu lateral em drawer (esquerda) com os modos: Início, Quadros, Entregadores, Resumo, Ajustes.  
  - Rodapé do drawer com `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- **SharedSidebar / AdminSidebar:**  
  - Em mobile, botão “Fechar” (ChevronLeft ou X) com área de toque adequada.

---

## Dialog e Sheet (modais)

- **Dialog (ui/dialog.jsx):**
  - `max-h-[85dvh]` e `overflow-y-auto` para não cortar conteúdo em telas pequenas.
  - `w-[calc(100%-1rem)]` e `mx-2` em mobile.
  - Botão fechar com `min-h-touch min-w-touch`.
- **Sheet (ui/sheet.jsx):**
  - Lados: `w-[min(320px,85vw)]` em mobile.
  - Variante `bottom`: `pb-[max(0.5rem,env(safe-area-inset-bottom))]`.
  - Botão fechar com área de toque mínima.

---

## Páginas e layouts

- **min-h-screen min-h-screen-mobile** nos containers principais de:  
  Admin, PainelAssinante, GestorPedidos, PDV, Assinantes, Login, Cozinha.  
  - Em `Layout.jsx`, `min-h-screen-mobile` usa `100dvh` em `max-width: 768px` para melhor comportamento com barra de endereço.
- **overflow-x: hidden** em `html, body` para evitar scroll horizontal.

---

## PDV em mobile

- Grade de produtos: `grid-cols-2 sm:grid-cols-3` (já responsivo).
- Comanda: **oculta** em `lg:`; em mobile:
  - Barra fixa inferior **“Ver Comanda (N)”** com safe-area no `padding-bottom`.
  - Modal fullscreen da comanda com fechar em área de toque e rodapé com `pb-[max(1rem,env(safe-area-inset-bottom))]`.
  - Botão “Finalizar Venda” com `min-h-[48px]`.

---

## Cardápio público

- Já utiliza `MobileDishCard`, `MobileCategoryAccordion`, `MobileFloatingActions`, `MobileFilterChips`, `MobileBottomSheet`, etc.
- Sem alterações adicionais de estrutura nesta etapa.

---

## Assinantes, Entregador, Cozinha

- **Assinantes:** lista em cards (`motion.div`), não tabela; já adequada para mobile.
- **Entregador:** fluxo e modais pensados para uso em campo; `showMobileMenu` e drawers já existentes.
- **Cozinha:** layout simples com header e lista; `min-h-screen-mobile` aplicado.

---

## Breakpoint extra (Tailwind)

- **xs: 375px** para ajustes em telas muito pequenas (ex.: iPhone SE).

---

## Checklist para novas telas

1. Usar `min-h-screen min-h-screen-mobile` no container principal.
2. Em barras fixas (topo/rodapé), usar `.safe-bottom` ou `.safe-top` (ou `pb-[env(safe-area-inset-bottom)]` quando fizer sentido).
3. Botões e links principais: `min-h-touch min-w-touch` ou `min-h-[48px]` onde for botão de ação.
4. Sidebars em mobile: drawer + overlay e fechar ao selecionar ou no botão de fechar.
5. Modais: `max-h-[85dvh] overflow-y-auto` e botão fechar com área de toque adequada.
6. Em listas densas, preferir cards/accordion em mobile em vez de tabelas.

---

*Atualizado no contexto da adaptação mobile e PWA do DigiMenu.*
