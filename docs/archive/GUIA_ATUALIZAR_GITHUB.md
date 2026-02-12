# Guia de Atualização no GitHub

Este guia mostra como atualizar o projeto no GitHub usando comandos Git.

## Pré-requisitos

- Git instalado no seu computador
- Acesso ao repositório GitHub
- Terminal/PowerShell aberto na pasta do projeto

## Passo a Passo

### 1. Verificar o status atual

```powershell
git status
```

Este comando mostra quais arquivos foram modificados, adicionados ou removidos.

### 2. Adicionar todos os arquivos modificados

```powershell
git add .
```

Ou para adicionar arquivos específicos:

```powershell
git add src/pages/Garcom.jsx
git add src/pages/index.jsx
git add src/pages/Login.jsx
```

### 3. Criar um commit com mensagem descritiva

```powershell
git commit -m "feat: Adiciona app do garçom para gestão de comandas"
```

**Boas práticas para mensagens de commit:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `refactor:` - Refatoração de código
- `style:` - Mudanças de formatação/estilo
- `docs:` - Documentação
- `chore:` - Tarefas de manutenção

### 4. Enviar para o GitHub

```powershell
git push origin main
```

Se você estiver em outra branch (não main):

```powershell
git push origin nome-da-branch
```

### 5. Verificar se foi enviado

Acesse o repositório no GitHub e verifique se as alterações aparecem.

## Comandos Úteis

### Ver histórico de commits
```powershell
git log --oneline
```

### Ver diferenças antes de commitar
```powershell
git diff
```

### Desfazer mudanças não commitadas
```powershell
git restore .
```

### Desfazer último commit (mantendo alterações)
```powershell
git reset --soft HEAD~1
```

### Criar nova branch
```powershell
git checkout -b nome-da-branch
```

### Trocar de branch
```powershell
git checkout nome-da-branch
```

### Ver branches
```powershell
git branch
```

## Fluxo Completo Resumido

```powershell
# 1. Verificar status
git status

# 2. Adicionar arquivos
git add .

# 3. Criar commit
git commit -m "Descrição das mudanças"

# 4. Enviar para GitHub
git push origin main
```

## Resolução de Problemas

### Erro: "Your branch is ahead of origin"
Significa que você tem commits locais que não foram enviados. Execute:
```powershell
git push origin main
```

### Erro: "Please commit your changes"
Você precisa fazer commit antes de fazer push:
```powershell
git add .
git commit -m "Sua mensagem"
git push origin main
```

### Erro: "Updates were rejected"
Alguém atualizou o repositório antes de você. Execute:
```powershell
git pull origin main
git push origin main
```

### Conflitos de merge
Se houver conflitos após `git pull`:
1. Resolva os conflitos nos arquivos
2. Adicione os arquivos resolvidos: `git add .`
3. Complete o merge: `git commit`
4. Envie: `git push origin main`

## Dicas

- Sempre faça `git status` antes de commitar para ver o que será incluído
- Use mensagens de commit descritivas
- Faça commits frequentes com mudanças relacionadas
- Mantenha a branch main sempre atualizada com `git pull`
