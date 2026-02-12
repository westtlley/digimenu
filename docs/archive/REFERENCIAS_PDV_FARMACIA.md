# Referências PDV - Farmácia Econômica do Trabalhador

Documento de referência baseado no PDV da Farmácia Econômica do Trabalhador para guiar melhorias no PDV do DigiMenu.

---

## 1. Funções e Atalhos (Teclas de Função)

### Barra principal (Footer)

| Tecla | Função | Descrição |
|-------|--------|-----------|
| **F2** | Menu de Vendas | Abre menu com Suprimento, Sangria, Reimpressão, Fechamento, etc. |
| **F3** | Calculadora | Calculadora para o operador |
| **F4** | Fechamento | Fechamento de caixa / relatório |
| **F5** | Orçamento | Pesquisar/criar orçamento (cotações) |
| **F6** | Cliente | Pesquisar cliente |
| **F7** | Produto | Pesquisar produto |
| **F8** | Cancelar Item | Remove item da venda atual |
| **F9** | Cancel C. Aberto | Cancelar cupom/venda em tela |
| **F10** | Tabela de preços | (em algumas versões) |
| **F11** | Recebimento | Receber pagamento / finalizar venda |
| **F12** | PBM's | Programas de Benefícios (farmácia) |

### Menu de Vendas (F2) - Subfunções

| Tecla | Função | Ícone | Descrição |
|-------|--------|-------|-----------|
| **F2** | Suprimento | 💰+ | Entrada de dinheiro no caixa |
| **F3** | Sangria | 💰- | Retirada de dinheiro do caixa |
| **F4** | Reimpressão Venda | 📄🔍 | Reimprimir cupom/nota de venda anterior |
| **F5** | Fechamento Caixa | 🔒 | Fechar caixa e gerar relatório |
| **F6** | Abertura Caixa | 🔓 | Abrir caixa (desabilitado quando já aberto) |
| **F7** | Cancelar Venda | ❌ | Cancelar venda inteira |
| **ESC** | Sair | 🚪 | Fechar menu |

### Atalhos com Alt

| Atalho | Função | Descrição |
|--------|--------|-----------|
| **Alt + B** | Capturar peso balança | Pesa produto em balança integrada |
| **Alt + C** | Capturar comanda | Entrada via comanda/código |
| **Alt + D** | Descontos/Acréscimos | Aplicar desconto ou acréscimo na venda |
| **Alt + G** | Abrir gaveta | Abre gaveta de dinheiro |
| **Alt + I** | Observação no item | Adicionar observação no item atual |
| **Alt + K** | Kit de produtos | Venda de kit |
| **Alt + N** | CPF/CNPJ no cupom | Incluir documento fiscal no cupom |
| **Alt + O** | Observação no cupom | Observação geral na venda |
| **Alt + P** | Alterar preço | Alterar preço de venda do item |
| **Alt + R** | Consulta de produto | Consultar produto |
| **Alt + T** | Administrativo TEF | Funções TEF (cartão) |
| **\*** ou **X** | Alterar quantidade | Alterar qtd do item |

---

## 2. Estrutura do Header

```
┌─────────────────────────────────────────────────────────────────────┐
│ [PDV NFC-e]     FARMACIA ECONOMICA DO TRABALHADOR     27/01 20:09   │
│                                                    OP: ERLANE  CX: 1 │
└─────────────────────────────────────────────────────────────────────┘
```

- **Esquerda:** PDV + NFC-e (indica emissão de nota fiscal eletrônica)
- **Centro:** Nome do estabelecimento
- **Direita:** Data/hora, Operador (OP), Número do Caixa (CX)
- **Status:** Barra "** CAIXA LIVRE **" ou "Caixa Fechado"

---

## 3. Formato da Comanda / Cupom

### Estrutura visual (área de impressão)

```
┌──────────────────────────────────┐
│   **** CUPOM / COMANDA ****      │  ← Topo recortado (estilo papel)
│                                  │
│   [Lista de itens]               │
│   1. Produto A         R$ 10,00  │
│   2. Produto B         R$ 15,00  │
│   ...                            │
│                                  │
│   ─────────────────────          │
│   Subtotal            R$ 25,00   │
│   Total Geral         R$ 25,00   │
└──────────────────────────────────┘
```

### Campos obrigatórios no cupom

- Código/número do pedido
- Data e hora
- Cliente
- Itens (código, descrição, qtd, valor unit., valor total)
- Subtotal
- Desconto/Acréscimo (se houver)
- Total
- Formas de pagamento
- Troco (se dinheiro)
- CPF/CNPJ (quando informado)
- Observações

### Formato de impressão

- **Largura:** 80mm (térmica)
- **Fonte:** Courier / monospace
- **Layout:** Texto alinhado à esquerda, valores à direita
- **Quebra:** Texto com quebra automática (não cortar)

---

## 4. Formato Fechamento de Caixa

### Relatório de Fechamento

```
** RELATORIO DE FECHAMENTO **
--------------------------------

OPERADOR: ERLANE
CAIXA: 1
DH INICIAL: 27/01/2026 09:31:41
DH FINAL: (CAIXA ABERTO) ou 27/01/2026 20:10:00

--------------------------------
MOVIMENTAÇÕES
--------------------------------
(+) ABERTURA DE CAIXA    1    100,00
(+) VENDA (VF)          35    711,88
(=) SALDO EM CAIXA              811,88

--------------------------------
FORMA DE PAGAMENTO
--------------------------------
C. CREDITO      5    149,99
C. DEBITO       7    165,00
DINHEIRO       20    447,39
PIX             4     49,50
TOTAL                  811,88

--------------------------------
VENDAS CANCELADAS
--------------------------------
VENDA           0      0,00

CANCELAMENTO EM TELA
VENDA           2     42,00

--------------------------------
TROCAS
--------------------------------
(vazio)

--------------------------------
ADICIONAIS
--------------------------------
TROCO          225,05
DESCONTO         0,00
ACRESCIMO        0,00
QTDE CUPONS      35

--------------------------------
[Monitor] [Imprimir] [Fechar] [Sair]
```

### Botões do modal

- **Monitor:** Visualizar na tela
- **Imprimir:** Imprimir relatório
- **Fechar:** Fechar modal
- **Sair:** Sair do fechamento

---

## 5. Nota Fiscal (NFC-e)

### Indicação no PDV

- Logo **NFC-e** (Nota Fiscal de Consumidor Eletrônica) no header
- Indica que o sistema emite documento fiscal eletrônico

### Dados típicos da NFC-e

- Dados do emitente (CNPJ, razão social, endereço)
- Número da NFC-e
- Data/hora de emissão
- Itens com código, descrição, NCM, CFOP, qtd, valor
- Totais e impostos
- Formas de pagamento
- Código de barras / QR Code para consulta
- Chave de acesso (44 dígitos)

### Integração

- Envio para SEFAZ (estado)
- Geração de XML
- Armazenamento e consulta pelo consumidor

---

## 6. Área de Produto / Venda

### Campos de entrada

| Campo | Descrição |
|-------|-----------|
| Código | Código de barras ou código interno |
| Quantidade | Qtd do item (padrão 1) |
| Valor Unitário | Preço unitário |
| Valor Total | Qtd × Valor Unit. |

### Áreas de exibição

- **Esquerda:** Cupom/comanda em tempo real (itens da venda)
- **Direita:** Branding, campos de entrada
- **Inferior:** Subtotal, Total Geral, Mensagens ("Passe o Produto...", "Caixa Fechado")

---

## 7. Sugestões para o DigiMenu PDV

Com base nas referências:

1. **Atalhos de teclado** – Implementar F2–F11 e Alt+ para funções principais
2. **Menu de Vendas** – Suprimento, Sangria, Reimpressão, Fechamento, Cancelar
3. **Comanda/Cupom** – Layout 80mm, fonte monospace, quebra de texto
4. **Header** – Data/hora, operador, nº do caixa, status
5. **Fechamento** – Relatório com movimentações, formas de pagamento, totais
6. **Botão Imprimir** – Em modais de relatório e cupom
7. **NFC-e** – Preparar estrutura para futura integração fiscal (SEFAZ)
