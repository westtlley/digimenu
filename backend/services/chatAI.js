/**
 * Serviço de chat com IA (OpenAI) para o assistente do cardápio.
 * No .env do backend use: OPENAI_API_KEY=sk-... ou OPENAI_CHATBOT_KEY=sk-...
 * Sem a chave, a rota de chat retorna fallback e o front usa as regras locais.
 */

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATBOT_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
}

const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo';

/** Extrai step opcional do final da resposta: [STEP:ask_name] */
function parseStep(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\n\[STEP:(\w+)\]\s*$/);
  return match ? match[1] : null;
}

function stripStepFromText(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\n\[STEP:\w+\]\s*$/, '').trim();
}

/**
 * Gera resposta da IA com contexto do estabelecimento
 * @param {string} userMessage - Mensagem do usuário
 * @param {object} context - { storeName, dishesSummary, menuFull, deliveryInfo, paymentOptions, slug }
 * @param {array} history - Últimas mensagens [{ role: 'user'|'assistant', content }]
 * @returns {{ text: string, suggestions?: string[], step?: string } | null }
 */
export async function getAIResponse(userMessage, context = {}, history = []) {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return null;
  }

  const {
    storeName = 'o estabelecimento',
    dishesSummary = '',
    menuFull = '',
    deliveryInfo = '',
    paymentOptions = '',
    slug = ''
  } = context;

  const systemContent = `Você é o assistente virtual de atendimento do estabelecimento "${storeName}". Você está do outro lado do balcão: educado, descontraído e prestativo, como um atendente real.

REGRAS DE PERSONALIDADE:
- Seja sempre educado e descontraído. Use um tom amigável e próximo, sem ser formal demais.
- Se o cliente fugir do assunto (outros temas, piadas fora de contexto) ou for desrespeitoso, responda com gentileza e redirecione: "Sem problemas! Quando quiser, posso te ajudar com o cardápio, pedido ou entrega. O que você prefere?"
- Nunca invente informações. Use apenas o que foi passado no contexto (cardápio, formas de pagamento, regras de entrega).
- Mantenha respostas claras; quando listar opções, pode usar 2 a 4 frases ou listas curtas.

FLUXO DE VENDAS (quando o cliente quiser fazer pedido):
1. Mostrar opções de pratos (use o cardápio do contexto). Se houver categorias, cite-as (ex.: Pizzas, Bebidas, Sobremesas).
2. Para cada prato: mencionar complementos disponíveis (quando houver), adicionais/extras e sugestão de bebidas ou upsell quando fizer sentido.
3. Coletar dados na ordem:
   - Nome do cliente
   - Contato: perguntar se o telefone para o pedido é o mesmo que está falando ou outro (e pedir o número)
   - Endereço completo (rua, número, complemento, bairro, referência se precisar)
   - Informar a taxa de entrega conforme as regras do estabelecimento (use as informações de entrega do contexto)
   - Forma de pagamento (use as opções do contexto)
   - Se for dinheiro: perguntar se precisa de troco e para quanto
4. Ao finalizar: confirmar resumo (itens, endereço, pagamento, troco se houver) e informar que após confirmar o cliente receberá o número do pedido e poderá acompanhar o status.

Quando o cliente pedir "ver opções", "cardápio" ou "o que tem?", liste os pratos/categorias com preços. Quando pedir um prato (ex.: "quero 2 pizzas de calabresa"), confirme e diga que ele pode adicionar ao carrinho pelo botão ou continuar montando pelo chat.

CONTEXTO DO ESTABELECIMENTO:
${menuFull ? `CARDÁPIO:\n${menuFull.slice(0, 3500)}` : dishesSummary ? `Resumo do cardápio: ${dishesSummary.slice(0, 1200)}` : 'Cardápio não informado.'}
${deliveryInfo ? `\nENTREGA/TAXA:\n${deliveryInfo.slice(0, 600)}` : ''}
${paymentOptions ? `\nFORMAS DE PAGAMENTO:\n${paymentOptions.slice(0, 300)}` : ''}

OPCIONAL - Para o sistema saber em qual passo do pedido o cliente está, você pode terminar sua mensagem com exatamente uma destas linhas (sem explicar ao cliente):
[STEP:show_menu] - quando estiver mostrando o cardápio
[STEP:ask_name] - quando pedir o nome
[STEP:ask_contact] - quando pedir o telefone
[STEP:ask_address] - quando pedir o endereço
[STEP:ask_payment] - quando pedir forma de pagamento
[STEP:ask_troco] - quando for dinheiro e pedir troco
[STEP:confirm_order] - ao pedir confirmação final do pedido
Não use STEP em toda mensagem; só quando fizer sentido para o fluxo.`;

  const messages = [
    { role: 'system', content: systemContent },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[chatAI] OpenAI API error:', res.status, err);
      return null;
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const step = parseStep(text);
    text = stripStepFromText(text);
    if (!text) return null;

    const suggestions = step === 'confirm_order'
      ? ['Sim, confirmar pedido', 'Ver resumo', 'Alterar algo']
      : step === 'ask_payment'
        ? ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito']
        : step === 'ask_troco'
          ? ['Preciso de troco', 'Não preciso de troco']
          : ['Ver cardápio', 'Fazer pedido', 'Rastrear pedido', 'Ver horários'];

    return {
      text,
      suggestions,
      ...(step ? { step } : {})
    };
  } catch (err) {
    console.warn('[chatAI] Error:', err.message);
    return null;
  }
}

export function isAIAvailable() {
  return !!getOpenAIKey();
}
