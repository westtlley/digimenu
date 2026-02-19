/**
 * Serviço de chat com IA (OpenAI) para o assistente do cardápio.
 * No .env do backend use: OPENAI_API_KEY=sk-... ou OPENAI_CHATBOT_KEY=sk-...
 * Sem a chave, a rota de chat retorna fallback e o front usa as regras locais.
 */

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_CHATBOT_KEY || '';
  return typeof key === 'string' ? key.trim() : '';
}

function isOffensive(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const bad = ['idiota', 'imbecil', 'burro', 'estupido', 'retardado', 'porra', 'caralho', 'merda', 'viado', 'filho da puta', 'fdp', 'vai se fuder', 'vsf', 'arrombado', 'bosta', 'pau no cu', 'corno', 'lixo', 'inutil'];
  return bad.some((w) => t.includes(w));
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
 * @param {object} context - { storeName, dishesSummary, menuFull, deliveryInfo, paymentOptions, slug, storeAddress, storeWhatsapp, storeHours, storeSlogan, storeInstagram, storeFacebook }
 * @param {array} history - Últimas mensagens [{ role: 'user'|'assistant', content }]
 * @returns {{ text: string, suggestions?: string[], step?: string } | null }
 */
export async function getAIResponse(userMessage, context = {}, history = []) {
  if (isOffensive(userMessage)) {
    return {
      text: 'Prefiro manter nossa conversa cordial. 😊 Em que posso te ajudar com o cardápio ou pedido?',
      suggestions: ['Ver cardápio', 'Fazer pedido', 'Ver horários'],
    };
  }

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
    slug = '',
    storeAddress = '',
    storeWhatsapp = '',
    storeHours = '',
    storeSlogan = '',
    storeInstagram = '',
    storeFacebook = ''
  } = context;

  const storeInfoLines = [];
  if (storeAddress) storeInfoLines.push(`Endereço: ${storeAddress}`);
  if (storeWhatsapp) storeInfoLines.push(`WhatsApp: ${storeWhatsapp} (use para contato direto)`);
  if (storeHours) storeInfoLines.push(`Horário de funcionamento: ${storeHours}`);
  if (storeSlogan) storeInfoLines.push(`Slogan/descrição: ${storeSlogan}`);
  if (storeInstagram) storeInfoLines.push(`Instagram: ${storeInstagram}`);
  if (storeFacebook) storeInfoLines.push(`Facebook: ${storeFacebook}`);
  const storeInfoBlock = storeInfoLines.length ? storeInfoLines.join('\n') : 'Dados da loja não informados.';

  const systemContent = `Você é o assistente virtual do "${storeName}". Educado, natural e focado em ajudar com pedidos e informações do restaurante.

REGRAS OBRIGATÓRIAS:
1. DIÁLOGO: Respostas curtas. Uma pergunta por vez. Nunca envie várias informações de uma vez.
2. FOCO: Responda qualquer pergunta, mas SEMPRE redirecione para o restaurante (cardápio, pedido, horários). Ex.: "Posso ajudar com o cardápio ou fazer um pedido?"
3. OFENSAS: Se o cliente for desrespeitoso ou ofensivo, responda com educação: "Prefiro manter nossa conversa cordial. Em que posso te ajudar com o cardápio ou pedido?"
4. Use APENAS as informações do contexto. Nunca invente endereços, telefones, horários ou preços.

O QUE VOCÊ PODE FAZER:
1. **Cardápio e pedidos**: Mostrar pratos, preços, complementos, recomendações e auxiliar no fluxo de pedido.
2. **Informações do restaurante**: Endereço, WhatsApp, telefone, horário de funcionamento, redes sociais — use o bloco DADOS DA LOJA.
3. **Entrega e pagamento**: Taxas, pedido mínimo, zonas de entrega, formas de pagamento (PIX, dinheiro, cartão).
4. **Rastreio**: Explicar como acompanhar o pedido pelo app/site.
5. **FAQ e dúvidas gerais**: Qualquer pergunta relacionada ao estabelecimento.

FLUXO DE VENDAS (quando o cliente quiser fazer pedido):
1. Mostrar opções do cardápio (use CARDÁPIO abaixo). Cite categorias quando existirem.
2. Para cada prato: mencione complementos e extras disponíveis, sugira bebidas quando fizer sentido.
3. Coletar dados na ordem: nome → telefone → endereço completo → informar taxa de entrega → forma de pagamento → troco (se dinheiro).
4. Ao finalizar: confirmar resumo e informar que receberá número do pedido para rastreamento.

Seja conversacional: respostas curtas, uma informação por vez. Ao terminar qualquer resposta, sugira próximo passo (ex.: "Quer ver o cardápio?").

DADOS DA LOJA (use para responder perguntas sobre endereço, contato, horários, redes sociais):
${storeInfoBlock}

CARDÁPIO:
${menuFull ? menuFull.slice(0, 4000) : dishesSummary ? dishesSummary.slice(0, 1500) : 'Cardápio não informado.'}

ENTREGA E TAXA:
${deliveryInfo || 'Conforme combinar com o cliente.'}

FORMAS DE PAGAMENTO:
${paymentOptions || 'PIX, Dinheiro, Cartão de crédito, Cartão de débito.'}

OPCIONAL - Se quiser que o sistema mostre sugestões contextuais, termine sua mensagem com exatamente uma destas linhas (não mostre ao cliente):
[STEP:show_menu] - mostrando cardápio
[STEP:ask_name] - pediu o nome
[STEP:ask_contact] - pediu telefone
[STEP:ask_address] - pediu endereço
[STEP:ask_payment] - pediu forma de pagamento
[STEP:ask_troco] - dinheiro e pediu troco
[STEP:confirm_order] - pediu confirmação final
Use STEP apenas quando fizer sentido para o fluxo.`;

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
        max_tokens: 900,
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
