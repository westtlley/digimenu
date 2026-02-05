/**
 * Serviço de chat com IA (OpenAI) para o assistente do cardápio.
 * Configure OPENAI_API_KEY no .env do backend.
 * Sem a chave, a rota de chat retorna fallback e o front usa as regras locais.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-3.5-turbo';

/**
 * Gera resposta da IA com contexto do estabelecimento
 * @param {string} userMessage - Mensagem do usuário
 * @param {object} context - { storeName, dishesSummary, slug }
 * @param {array} history - Últimas mensagens [{ role: 'user'|'assistant', content }]
 * @returns {{ text: string, suggestions?: string[] } | null } - null se IA indisponível
 */
export async function getAIResponse(userMessage, context = {}, history = []) {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.trim()) {
    return null;
  }

  const { storeName = 'o estabelecimento', dishesSummary = '', slug = '' } = context;

  const systemContent = `Você é o assistente virtual de um restaurante/loja (${storeName}). 
Responda de forma curta, amigável e em português.
Você pode: ajudar com o cardápio, horários, entrega, pagamento e pedidos.
Não invente informações que não foram passadas. Se não souber, sugira que o cliente veja o cardápio ou entre em contato.
Mantenha respostas objetivas (1 a 3 frases quando possível).
${dishesSummary ? `Resumo do cardápio atual: ${dishesSummary.slice(0, 800)}.` : ''}`;

  const messages = [
    { role: 'system', content: systemContent },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('[chatAI] OpenAI API error:', res.status, err);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return {
      text,
      suggestions: ['Ver cardápio', 'Fazer pedido', 'Falar no WhatsApp']
    };
  } catch (err) {
    console.warn('[chatAI] Error:', err.message);
    return null;
  }
}

export function isAIAvailable() {
  return !!(OPENAI_API_KEY && OPENAI_API_KEY.trim());
}
