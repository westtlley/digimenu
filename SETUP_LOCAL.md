# 🖥️ Configuração Local - DigiMenu

## Problema: "Sistema não localiza login nem cardápio"

Isso geralmente acontece quando:

1. **Backend na nuvem (Render) está dormindo** – plano gratuito desliga após inatividade; a primeira requisição pode demorar 30–60 segundos.
2. **Frontend apontando para backend remoto com CORS** – o Render pode bloquear requisições vindas de `localhost`.
3. **Backend local não está rodando** – ao usar API local, é preciso ter o backend em execução.

---

## Opção A: Rodar tudo localmente (recomendado para desenvolvimento)

### 1. Configurar o backend

```powershell
cd backend
```

Crie o arquivo `backend/.env` com:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=seu-jwt-secret-minimo-32-caracteres-12345678
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/digimenu
```

> **PostgreSQL:** precisa estar instalado e rodando. Crie o banco:  
> `createdb digimenu` (ou via pgAdmin).

### 2. Iniciar o backend

```powershell
cd backend
npm install
npm run dev
```

O backend deve subir em `http://localhost:3000`.

### 3. Apontar o frontend para o backend local

No `.env` na raiz do projeto:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 4. Iniciar o frontend

```powershell
npm run dev
```

Acesse: `http://localhost:5173`

### 5. URLs principais

| Onde | URL |
|------|-----|
| **Login admin (master)** | http://localhost:5173/login/admin |
| **Cardápio de um restaurante** | http://localhost:5173/s/SEU-SLUG |
| **Login do restaurante (dono/colaborador)** | http://localhost:5173/s/SEU-SLUG/login |
| **Assinar (cadastro)** | http://localhost:5173/assinar |

> `SEU-SLUG` é o link do estabelecimento, ex.: `raiz-maranhense`.  
> Para criar: cadastre em `/assinar`, defina a senha e use o slug configurado no painel.

---

## Opção B: Usar backend na nuvem (Render)

O `.env` já está apontando para o Render:

```env
VITE_API_BASE_URL=https://digimenu-backend-3m6t.onrender.com/api
```

O que pode ocorrer:

- **Cold start:** nas primeiras requisições, espere até 1 minuto.
- **CORS:** se o backend estiver configurado para o frontend em produção, requisições de `localhost` podem ser bloqueadas. Nesse caso, use a **Opção A**.

---

## Comandos rápidos (PowerShell)

```powershell
# Backend
.\rodar-backend.ps1

# Frontend (em outro terminal)
.\rodar-frontend.ps1
```

---

## Resumo rápido

1. Rodar backend local: `cd backend && npm run dev`
2. `.env`: `VITE_API_BASE_URL=http://localhost:3000/api`
3. Acessar: http://localhost:5173/login/admin ou http://localhost:5173/s/seu-slug
