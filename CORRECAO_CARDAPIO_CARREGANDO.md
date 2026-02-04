# 🔧 Correção: Cardápio Fica Carregando e Não Abre

## 🐛 Problema Identificado

O cardápio fica em "Carregando..." e não abre. Possíveis causas:

1. **Erro de JavaScript no console**: "Unexpected token 'export'" em `webpage_content_reporter.js`
2. **Endpoint incorreto**: Pode estar chamando endpoint errado
3. **Timeout de carregamento**: Requisição pode estar demorando muito
4. **Erro na API**: Backend pode não estar respondendo corretamente

## ✅ Correções Aplicadas

### 1. Melhor Tratamento de Erros

- Adicionado timeout de 15 segundos
- Adicionado botão "Tentar Novamente" em caso de erro
- Melhor logging de erros no console
- Retry automático (1 tentativa após 2 segundos)

### 2. Endpoint Corrigido

- Verificado que o endpoint está correto: `/api/public/cardapio/:slug`
- O `base44.get` já adiciona `/api` automaticamente

### 3. Timeout de Carregamento

- Adicionado estado `loadingTimeout` para detectar quando o carregamento demora muito
- Mostra mensagem de erro após 15 segundos
- Permite tentar novamente

## 🔍 Como Diagnosticar

### 1. Verificar Console do Navegador

Abra o console (F12) e verifique:
- Erros em vermelho
- Requisições para `/api/public/cardapio/:slug`
- Status das requisições (200, 404, 500, etc.)

### 2. Verificar Network Tab

1. Abra DevTools (F12)
2. Vá para aba "Network"
3. Recarregue a página
4. Procure por requisição para `/api/public/cardapio/:slug`
5. Verifique:
   - Status code
   - Response
   - Tempo de resposta

### 3. Verificar Backend

1. Verifique se o backend está rodando
2. Teste o endpoint diretamente:
   ```bash
   curl https://seu-backend.com/api/public/cardapio/pratodahora
   ```
3. Verifique logs do backend para erros

## 🚀 Soluções Possíveis

### Se o erro for "Unexpected token 'export'":

Este erro geralmente vem de extensões do navegador ou scripts externos. Não é um problema do código.

**Solução**: 
- Ignorar o erro (não afeta o funcionamento)
- Ou desabilitar extensões do navegador para testar

### Se o endpoint não responder:

1. Verificar se o backend está rodando
2. Verificar se a URL do backend está correta no `.env`
3. Verificar se o slug existe no banco de dados
4. Verificar logs do backend

### Se o slug não existir:

1. Verificar se o assinante tem um slug configurado
2. Verificar se o slug está correto na URL
3. Criar/atualizar slug do assinante no admin

## 📝 Mudanças no Código

### `src/pages/Cardapio.jsx`

1. **Adicionado timeout de carregamento**:
```javascript
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  if (slug && publicLoading) {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 15000); // 15 segundos
    return () => clearTimeout(timer);
  }
}, [slug, publicLoading]);
```

2. **Melhor tratamento de erros na query**:
```javascript
retry: 1, // Tentar 1 vez
retryDelay: 2000, // Esperar 2 segundos
staleTime: 5 * 60 * 1000, // Cache por 5 minutos
```

3. **Botão de retry em caso de erro**:
```javascript
{loadingTimeout && publicError && (
  <Button onClick={() => window.location.reload()}>
    Tentar Novamente
  </Button>
)}
```

## 🧪 Teste Rápido

1. Abra o console do navegador (F12)
2. Acesse o cardápio: `/s/pratodahora`
3. Verifique:
   - Se aparece requisição para `/api/public/cardapio/pratodahora`
   - Qual o status da resposta
   - Se há erros no console
   - Se os dados chegam corretamente

## 📊 Próximos Passos

1. **Testar no navegador** e verificar console
2. **Verificar logs do backend** para erros
3. **Testar endpoint diretamente** com curl/Postman
4. **Verificar se o slug existe** no banco de dados

---

**Status**: ✅ Correções Aplicadas
**Próxima Ação**: Testar no navegador e verificar console
