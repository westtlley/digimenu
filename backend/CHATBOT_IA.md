# Assistente do cardápio com IA (OpenAI)

O chatbot do cardápio pode usar **OpenAI** para respostas inteligentes. Sem a chave, o app continua usando as regras locais (FAQ, horário, entrega, pedido, rastreio).

## Configuração

1. Crie uma chave de API em [OpenAI API Keys](https://platform.openai.com/api-keys).
2. No **backend**, crie ou edite o arquivo `.env` na pasta `backend/` e adicione:

```env
OPENAI_API_KEY=sk-sua-chave-aqui
```

3. (Opcional) Para usar outro modelo:

```env
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Padrão: `gpt-3.5-turbo`.

4. Reinicie o backend.

## Comportamento

- **Com `OPENAI_API_KEY`:** cada mensagem do cliente é enviada para a rota `POST /api/public/chat`; o backend chama a OpenAI com contexto (nome da loja, resumo do cardápio) e devolve a resposta. O frontend exibe texto e sugestões.
- **Sem chave ou em erro:** o frontend usa as regras locais (horário, entrega, pagamento, rastrear pedido, recomendar pratos, adicionar ao carrinho).

## Rota (backend)

- `POST /api/public/chat`  
- Body: `{ message, slug?, storeName?, dishesSummary?, history? }`  
- Resposta: `{ text, suggestions? }` ou 503 se a IA estiver indisponível.

A chave **nunca** é enviada ao frontend; apenas o backend chama a API da OpenAI.
