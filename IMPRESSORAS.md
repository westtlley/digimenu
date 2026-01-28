# 🖨️ Impressoras: identificação e formato

## Como o sistema identifica e usa impressoras

Hoje a impressão usa **`window.print()`** (diálogo de impressão do navegador). O usuário escolhe a impressora no diálogo. A “identificação” de impressoras no frontend é limitada pelo que o browser expõe.

---

## O que já existe

- **PrinterConfig** (Admin / Painel → Impressora): `printer_name`, `printer_type` (térmica/laser), `paper_width` (58mm/80mm), margens, `font_size`, `line_spacing`, etc.
- **Comandas**: `printOrdersInQueue` (Gestor) e `printComanda` (PrinterConfig, PDV) abrem uma janela, escrevem HTML e chamam `window.print()`.
- O **formato** é controlado por CSS: `@page { size: 80mm auto; margin: ... }`, `font-size`, `line-height`, `pre` para texto.

Ou seja: **formato adequado** = o que está no PrinterConfig (largura 58/80mm, margens, fonte). A **impressora** em si é escolhida pelo usuário no diálogo do sistema.

---

## Identificação automática de impressoras (avançado)

Para o sistema **escolher sozinho** uma impressora (ex. térmica da cozinha), é preciso sair do `window.print()` e usar uma destas alternativas:

### 1. **Escolher impressora no `window.print()`**

O `window.print()` sempre abre o diálogo. Não dá para pular o diálogo e mandar direto para uma impressora só por JavaScript no browser, por segurança.

### 2. **Web Print (navegador + driver)**

- O usuário define a impressora padrão do sistema (ou a “térmica”) como padrão.
- O app usa `window.print()`; o diálogo já vem com essa impressora selecionada.  
Isso é o mais simples e já é possível hoje, configurando no SO.

### 3. **Plugin / extensão (ex. em ambiente fechado)**

- Uma extensão ou app nativo (Electron, PWA com APIs nativas) pode:
  - Listar impressoras (ex. via `navigator` se existir API, ou via bridge para o SO).
  - Enviar para uma impressora específica sem abrir o diálogo.  
Isso exige desenvolver e instalar esse componente no cliente.

### 4. **Servidor de impressão (backend)**

- Backend (Node, etc.) com acesso ao SO:
  - Lista impressoras (ex. `lpstat -p` no Linux, `wmic` no Windows, ou libs como `node-printer`).
  - Envia via fila de impressão do SO (ex. `lp`, `lpr`, ou lib que abstrai isso).
- O frontend chama uma API: “imprimir comanda X na impressora Y”.
- **Formato**: o backend gera o conteúdo (texto, HTML ou comando ESC/POS para térmicas) e envia para a fila.  
Isso exige backend na mesma rede (ou com acesso) às impressoras.

---

## Formato adequado (o que já dá para controlar)

| Uso | Onde | Como |
|-----|------|------|
| Comanda térmica 58mm | PrinterConfig: `paper_width: 58mm` | `@page { size: 58mm auto }` + `font-size`/`line-height` |
| Comanda térmica 80mm | PrinterConfig: `paper_width: 80mm` | `@page { size: 80mm auto }` |
| Comanda em A4/laser | `printer_type: laser` + `paper_width` em A4 (se existir opção) | `@page { size: A4 }` e margens em mm |

O `PrinterConfig` já guarda `paper_width`, `margin_*`, `font_size`, `line_spacing`. O próximo passo é garantir que **todos** os fluxos de impressão (Gestor, PDV, etc.) usem esses campos ao montar o HTML/CSS. Assim o **formato** fica adequado; a **impressora** continua sendo a que o usuário escolhe no diálogo (ou a padrão do sistema).

---

## Resumo prático

1. **Formato**:  
   - Usar sempre `PrinterConfig` (largura, margens, fonte, espaçamento).  
   - Ajustar `@page` e estilos em `printComanda` / `printOrdersInQueue` para respeitar esses valores.

2. **Impressora “fixa” sem diálogo**:  
   - Ou o usuário deixa a térmica como **impressora padrão** e usa `window.print()`.  
   - Ou é preciso **backend com acesso às impressoras** (e possivelmente um pequeno serviço/plugin no ponto de venda) para enviar direto para uma impressora.

3. **Listar impressoras no frontend**:  
   - Não existe API estável no browser para isso.  
   - Dá para fazer só no **backend** (lpstat, wmic, node-printer, etc.) e expor uma rota, por exemplo: `GET /api/printers` → o Admin poderia mostrar uma lista e salvar a “impressora preferida” no `PrinterConfig` para o backend usar ao imprimir.

Se quiser, o próximo passo é: (a) garantir que todas as impressões usam `PrinterConfig` para o formato e (b) esboçar a rota `GET /api/printers` e o fluxo de “imprimir na impressora X” no backend.
