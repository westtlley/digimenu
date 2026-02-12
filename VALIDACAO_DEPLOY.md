# ✅ Validação de Deploy - DigiMenu SaaS

Este documento lista os passos para validar que o deploy foi realizado com sucesso.

## 🔍 Checklist de Validação

### 1. Backend (Render)

#### 1.1 Health Check
- [ ] Endpoint `/api/health` retorna status 200
- [ ] Resposta contém informações do servidor
- [ ] Logs do Render não mostram erros críticos

#### 1.2 Banco de Dados
- [ ] Conexão com PostgreSQL está ativa
- [ ] Tabelas principais existem (users, subscribers, entities)
- [ ] Migrations foram aplicadas

#### 1.3 Autenticação
- [ ] Endpoint `/api/auth/login` funciona
- [ ] Endpoint `/api/auth/me` retorna dados do usuário
- [ ] JWT_SECRET está configurado (não usa padrão)

#### 1.4 Variáveis de Ambiente
- [ ] `DATABASE_URL` configurada
- [ ] `JWT_SECRET` configurada (mínimo 32 caracteres)
- [ ] `FRONTEND_URL` configurada
- [ ] `CORS_ORIGINS` configurada
- [ ] `CLOUDINARY_*` configuradas (se usar upload de imagens)

### 2. Frontend (Vercel)

#### 2.1 Build
- [ ] Build completa sem erros
- [ ] Arquivos estáticos gerados em `dist/`
- [ ] Variáveis de ambiente estão disponíveis

#### 2.2 Variáveis de Ambiente
- [ ] `VITE_API_BASE_URL` configurada
- [ ] URL aponta para o backend no Render
- [ ] Outras variáveis opcionais configuradas (Google Maps, etc.)

#### 2.3 Acesso
- [ ] Site carrega sem erros no console
- [ ] Não há erros de CORS
- [ ] Imagens e assets carregam corretamente

### 3. Fluxos Core

#### 3.1 Cardápio Público
- [ ] Acessar `/s/:slug` carrega o cardápio
- [ ] Produtos são exibidos
- [ ] Categorias são exibidas
- [ ] Imagens dos produtos carregam

#### 3.2 Autenticação
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Google OAuth funciona (se configurado)
- [ ] Token é armazenado corretamente

#### 3.3 Criação de Pedido
- [ ] Pedido pode ser criado via cardápio público
- [ ] Pedido aparece no gestor de pedidos
- [ ] WebSocket atualiza pedidos em tempo real

#### 3.4 Validações de Limites
- [ ] Limite de produtos é respeitado
- [ ] Limite de pedidos por dia é respeitado
- [ ] Limite de usuários é respeitado
- [ ] Mensagens de erro são claras

#### 3.5 Permissões
- [ ] Usuário sem permissão recebe erro 403
- [ ] Master tem acesso a tudo
- [ ] Mensagens de erro indicam plano atual

### 4. Testes de Integração

#### 4.1 Backend → Frontend
- [ ] API responde corretamente
- [ ] CORS está configurado
- [ ] Erros são tratados adequadamente

#### 4.2 Frontend → Backend
- [ ] Requisições são enviadas corretamente
- [ ] Headers de autenticação são incluídos
- [ ] Erros são exibidos ao usuário

### 5. Monitoramento

#### 5.1 Logs
- [ ] Logs do Render mostram requisições
- [ ] Erros 500 são logados com detalhes
- [ ] Erros 400 são logados como warnings

#### 5.2 Performance
- [ ] Tempo de resposta < 2s para requisições normais
- [ ] Build do frontend < 5 minutos
- [ ] Cold start do backend < 30s

## 🚨 Problemas Comuns e Soluções

### Backend não inicia
- **Causa:** Variáveis de ambiente faltando
- **Solução:** Verificar todas as variáveis obrigatórias no Render

### CORS Error
- **Causa:** `CORS_ORIGINS` não inclui a URL do frontend
- **Solução:** Adicionar URL do frontend em `CORS_ORIGINS`

### Database Connection Failed
- **Causa:** `DATABASE_URL` incorreta ou banco não acessível
- **Solução:** Verificar formato da URL e conectividade

### Frontend não carrega
- **Causa:** `VITE_API_BASE_URL` não configurada
- **Solução:** Configurar variável no Vercel

### Erros 500 em produção
- **Causa:** Erros não tratados ou variáveis faltando
- **Solução:** Verificar logs do Render e corrigir erros

## 📊 Comandos de Validação

### Backend
```bash
# Health check
curl https://seu-backend.onrender.com/api/health

# Teste de autenticação
curl -X POST https://seu-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'

# Teste de cardápio público
curl https://seu-backend.onrender.com/api/public/cardapio/seu-slug
```

### Frontend
```bash
# Verificar build
npm run build

# Verificar variáveis
echo $VITE_API_BASE_URL

# Teste local
npm run dev
```

## ✅ Critérios de Sucesso

- [ ] Backend online e respondendo
- [ ] Frontend online e carregando
- [ ] Cardápio público funciona
- [ ] Autenticação funciona
- [ ] Pedidos podem ser criados
- [ ] Validações de limites funcionam
- [ ] Permissões funcionam
- [ ] Erros são tratados adequadamente
- [ ] Logs são claros e úteis

## 📝 Notas

- Todos os testes devem ser executados em **produção**
- Testes devem validar que o **backend é a única fonte de verdade**
- Frontend apenas consome e renderiza dados
- Validações de limites e permissões são feitas apenas no backend
