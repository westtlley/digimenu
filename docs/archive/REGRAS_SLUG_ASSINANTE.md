# 📋 Regras de Slug para Assinantes

## 🔗 O que é o Slug?

O **slug** é o identificador único do link do cardápio do restaurante. Exemplo:
- Slug: `meu-restaurante`
- URL do cardápio: `/s/meu-restaurante`

## ✅ Regras de Validação

### 1. Formato do Slug

- **Apenas letras minúsculas, números e hífen**
- **Não pode começar ou terminar com hífen**
- **Não pode ter espaços ou caracteres especiais**
- **Normalização automática**: espaços viram hífens, maiúsculas viram minúsculas

**Exemplos válidos:**
- ✅ `meu-restaurante`
- ✅ `pizzaria-123`
- ✅ `cafe-da-manha`

**Exemplos inválidos:**
- ❌ `Meu Restaurante` (espaços e maiúsculas - será normalizado)
- ❌ `restaurante_123` (underscore não permitido)
- ❌ `-restaurante` (começa com hífen)
- ❌ `restaurante-` (termina com hífen)

### 2. Unicidade (Slug Único)

**⚠️ REGRA CRÍTICA: Cada slug só pode ser usado por UM assinante**

- ✅ **Slug disponível**: Pode ser usado
- ❌ **Slug já em uso**: Não pode ser usado por outro assinante
- ✅ **Mesmo assinante**: Pode manter ou trocar para o mesmo slug (atualização)

### 3. Validação no Backend

O sistema valida automaticamente:

1. **Ao criar assinante**:
   - Verifica se o slug já existe
   - Se existir, retorna erro: `"Slug 'X' já está em uso por outro restaurante"`

2. **Ao atualizar assinante**:
   - Verifica se o novo slug já existe em OUTRO assinante
   - Permite manter o mesmo slug (atualização do próprio assinante)
   - Se outro assinante já usa, retorna erro

## 🔄 O que acontece quando um assinante troca o slug?

### Cenário: Assinante troca de `restaurante-antigo` para `restaurante-novo`

1. **Validação**: Sistema verifica se `restaurante-novo` está disponível
2. **Atualização**: Se disponível, slug é atualizado no banco
3. **Slug antigo**: Fica disponível para outros assinantes usarem
4. **URLs antigas**: Links antigos (`/s/restaurante-antigo`) **NÃO funcionam mais**

### ✅ IMPORTANTE: Dados NÃO são Perdidos!

**🎉 BOA NOTÍCIA: Todos os dados são preservados quando o slug muda!**

Os dados estão vinculados ao **`subscriber_email`** (email do assinante), **NÃO ao slug**. Isso significa:

- ✅ **Pratos**: Continuam salvos e acessíveis
- ✅ **Pedidos**: Histórico completo preservado
- ✅ **Clientes**: Base de clientes mantida
- ✅ **Categorias**: Todas as categorias preservadas
- ✅ **Configurações**: Loja, horários, etc. mantidos
- ✅ **Promoções e Cupons**: Todos preservados

**O slug é apenas um identificador da URL do cardápio público. A troca de slug não afeta os dados!**

### ⚠️ IMPORTANTE: URLs Antigas

**Quando um assinante troca o slug:**
- ❌ URLs antigas (`/s/slug-antigo`) **param de funcionar**
- ✅ Nova URL (`/s/slug-novo`) funciona imediatamente
- ⚠️ **Não há redirecionamento automático** da URL antiga para a nova
- ✅ **Todos os dados permanecem acessíveis** pela nova URL

**Recomendações:**
- ⚠️ **Evite trocar o slug** se já compartilhou o link com clientes
- 📱 **Comunique a mudança** aos clientes se necessário trocar
- 🔗 **Atualize QR codes** e materiais impressos se o slug mudar
- ✅ **Não se preocupe com perda de dados** - tudo é preservado!

## 🚫 O que acontece quando dois assinantes tentam usar o mesmo slug?

### Tentativa 1: Primeiro assinante cria `pizzaria-roma`
- ✅ Slug disponível → Cadastro realizado com sucesso
- ✅ URL `/s/pizzaria-roma` funciona para este assinante

### Tentativa 2: Segundo assinante tenta criar `pizzaria-roma`
- ❌ **Erro**: `"Slug 'pizzaria-roma' já está em uso por outro restaurante"`
- ❌ Cadastro/atualização **bloqueada**
- ✅ Deve escolher outro slug (ex: `pizzaria-roma-2`, `pizzaria-roma-centro`)

## 🛡️ Proteções Implementadas

### 1. Constraint UNIQUE no Banco de Dados
```sql
ALTER TABLE subscribers ADD COLUMN slug VARCHAR(100) UNIQUE;
```
- PostgreSQL garante que não haverá slugs duplicados
- Tentativa de inserir slug duplicado gera erro de banco

### 2. Validação no Backend (Repository)
- `createSubscriber`: Verifica se slug existe antes de criar
- `updateSubscriber`: Verifica se slug existe em OUTRO assinante antes de atualizar
- Retorna erro amigável se slug já estiver em uso

### 3. Normalização Automática
- Espaços → hífens
- Maiúsculas → minúsculas
- Caracteres especiais → removidos
- Exemplo: `"Meu Restaurante!"` → `"meu-restaurante"`

## 📝 Exemplos Práticos

### Exemplo 1: Criar Assinante com Slug Disponível
```javascript
// Request
{
  email: "restaurante@email.com",
  name: "Meu Restaurante",
  slug: "meu-restaurante"  // ✅ Disponível
}

// Resultado: ✅ Assinante criado
// URL: /s/meu-restaurante
```

### Exemplo 2: Tentar Usar Slug Já Existente
```javascript
// Request
{
  email: "outro@email.com",
  name: "Outro Restaurante",
  slug: "meu-restaurante"  // ❌ Já existe!
}

// Resultado: ❌ Erro
// "Slug 'meu-restaurante' já está em uso por outro restaurante"
```

### Exemplo 3: Assinante Trocar Slug
```javascript
// Assinante atual tem slug: "restaurante-antigo"

// Request (update)
{
  slug: "restaurante-novo"  // ✅ Disponível
}

// Resultado: ✅ Slug atualizado
// URL antiga: /s/restaurante-antigo → ❌ Não funciona mais
// URL nova: /s/restaurante-novo → ✅ Funciona
```

### Exemplo 4: Assinante Tentar Trocar para Slug de Outro
```javascript
// Assinante A tem slug: "pizzaria-roma"
// Assinante B tenta trocar para "pizzaria-roma"

// Request (update do Assinante B)
{
  slug: "pizzaria-roma"  // ❌ Já usado pelo Assinante A
}

// Resultado: ❌ Erro
// "Slug 'pizzaria-roma' já está em uso por outro restaurante"
```

## 🔍 Como Verificar se um Slug Está Disponível?

### Via API (Backend)
```javascript
// Endpoint: GET /api/public/cardapio/:slug
// Se retornar 404 → Slug disponível
// Se retornar 200 → Slug já está em uso
```

### Via Frontend
- Ao digitar o slug no formulário, o sistema pode verificar em tempo real
- Mostrar feedback visual se slug está disponível ou não

## ⚙️ Configuração Técnica

### Banco de Dados
- **Constraint**: `UNIQUE` na coluna `slug` da tabela `subscribers`
- **Tipo**: `VARCHAR(100)`
- **Permite NULL**: Sim (assinante pode não ter slug)

### Backend
- **Validação**: `backend/db/repository.js`
  - `createSubscriber()`: Verifica antes de criar
  - `updateSubscriber()`: Verifica antes de atualizar
- **Função**: `getSubscriberBySlug(slug)` busca assinante por slug

### Frontend
- **Normalização**: `src/pages/Assinantes.jsx`
  - Função `normalizeSlug()` normaliza o slug
  - Função `validateSlug()` valida formato

## 🎯 Boas Práticas

1. **Escolha um slug único e memorável**
   - Ex: nome do restaurante + localização
   - Evite slugs genéricos como `restaurante`, `pizzaria`

2. **Evite trocar o slug**
   - Se já compartilhou o link, trocar quebra os links antigos
   - Considere criar novo assinante se precisar de slug diferente
   - **Mas lembre-se**: Se precisar trocar, seus dados estarão seguros!

3. **Comunique mudanças**
   - Se precisar trocar, avise clientes
   - Atualize QR codes e materiais impressos
   - Informe que a nova URL terá todos os dados preservados

4. **Teste antes de publicar**
   - Verifique se o slug está disponível
   - Teste a URL antes de compartilhar

5. **Tranquilidade sobre dados**
   - Saiba que seus dados estão seguros mesmo ao trocar o slug
   - O sistema usa `subscriber_email` como identificador principal
   - Slug é apenas para URLs públicas

## 🐛 Troubleshooting

### Erro: "Slug já está em uso"
**Causa**: Outro assinante já está usando este slug.

**Solução**:
1. Escolha outro slug
2. Adicione sufixo (ex: `-2`, `-centro`, `-norte`)
3. Use nome mais específico

### Erro: "Slug inválido"
**Causa**: Slug contém caracteres não permitidos.

**Solução**:
- Use apenas letras minúsculas, números e hífen
- Não comece ou termine com hífen
- Remova espaços e caracteres especiais

### URL antiga não funciona mais
**Causa**: Assinante trocou o slug.

**Solução**:
- Use a nova URL com o novo slug
- Atualize links compartilhados
- Considere manter o slug antigo se possível
- **Boa notícia**: Todos os seus dados estão preservados na nova URL!

## 📊 Como os Dados são Vinculados?

### Identificador Principal: `subscriber_email`

Todos os dados do sistema são vinculados ao **email do assinante** (`subscriber_email`), não ao slug:

- **Tabela `entities`**: Pratos, categorias, loja, etc. → `subscriber_email`
- **Tabela `customers`**: Clientes cadastrados → `subscriber_email`
- **Tabela `orders`**: Pedidos realizados → `owner_email` (que é o `subscriber_email`)
- **Tabela `users`**: Usuários/colaboradores → `subscriber_email`

### O Slug é Apenas para URLs

O slug é usado apenas para:
- ✅ Criar a URL pública do cardápio: `/s/:slug`
- ✅ Identificar o assinante na URL pública
- ✅ Buscar o `subscriber_email` baseado no slug

**Quando o slug muda:**
1. Sistema busca o assinante pelo novo slug
2. Obtém o `subscriber_email` do assinante
3. Busca todos os dados usando o `subscriber_email`
4. **Resultado**: Todos os dados aparecem normalmente na nova URL!

### Exemplo Prático

```javascript
// Assinante: restaurante@email.com
// Slug antigo: "restaurante-antigo"
// Slug novo: "restaurante-novo"

// Dados no banco (NÃO mudam):
entities: [
  { id: 1, entity_type: 'Dish', subscriber_email: 'restaurante@email.com', ... },
  { id: 2, entity_type: 'Category', subscriber_email: 'restaurante@email.com', ... }
]

// Antes da troca:
GET /s/restaurante-antigo
→ Busca subscriber por slug "restaurante-antigo"
→ Encontra: { email: "restaurante@email.com", slug: "restaurante-antigo" }
→ Busca entities com subscriber_email = "restaurante@email.com"
→ Retorna todos os pratos ✅

// Depois da troca:
GET /s/restaurante-novo
→ Busca subscriber por slug "restaurante-novo"
→ Encontra: { email: "restaurante@email.com", slug: "restaurante-novo" }
→ Busca entities com subscriber_email = "restaurante@email.com"
→ Retorna todos os pratos ✅ (MESMOS DADOS!)
```

**Conclusão**: Os dados nunca são perdidos porque estão vinculados ao email, não ao slug!