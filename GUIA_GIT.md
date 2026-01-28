# 📚 Guia Completo de Comandos Git para Atualizar o Projeto no GitHub

Este guia contém todos os comandos necessários para gerenciar e atualizar o projeto no GitHub.

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Comandos Básicos](#comandos-básicos)
3. [Atualizar Projeto no GitHub](#atualizar-projeto-no-github)
4. [Trabalhar com Branches](#trabalhar-com-branches)
5. [Resolver Conflitos](#resolver-conflitos)
6. [Comandos Úteis](#comandos-úteis)
7. [Fluxo de Trabalho Recomendado](#fluxo-de-trabalho-recomendado)

---

## 🔧 Configuração Inicial

### Verificar se o Git está instalado
```bash
git --version
```

### Configurar seu nome e email (apenas na primeira vez)
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

### Verificar configurações
```bash
git config --list
```

### Clonar um repositório existente
```bash
git clone https://github.com/westtlley/digimenu.git
cd digimenu
```

---

## 📝 Comandos Básicos

### Ver status dos arquivos
```bash
git status
```

### Ver diferenças nos arquivos modificados
```bash
git diff
```

### Ver histórico de commits
```bash
git log
```

### Ver histórico simplificado
```bash
git log --oneline
```

### Ver últimas 10 alterações
```bash
git log -10 --oneline
```

---

## 🚀 Atualizar Projeto no GitHub

### **Fluxo Completo (Recomendado)**

#### 1. Verificar o status atual
```bash
git status
```

#### 2. Adicionar todos os arquivos modificados
```bash
git add .
```

**OU adicionar arquivos específicos:**
```bash
git add src/components/admin/DishesTab.jsx
git add src/components/admin/outro-arquivo.jsx
```

#### 3. Verificar o que será commitado
```bash
git status
```

#### 4. Criar um commit com mensagem descritiva
```bash
git commit -m "feat: Descrição clara do que foi implementado"
```

**Exemplos de mensagens de commit:**
```bash
# Nova funcionalidade
git commit -m "feat: Adicionar sistema de busca de pratos"

# Correção de bug
git commit -m "fix: Corrigir erro ao salvar complementos"

# Melhoria
git commit -m "refactor: Melhorar layout do DishesTab"

# Documentação
git commit -m "docs: Atualizar README com novas funcionalidades"

# Estilo/Formatação
git commit -m "style: Formatar código do DishesTab"

# Testes
git commit -m "test: Adicionar testes para DishesTab"
```

#### 5. Enviar para o GitHub
```bash
git push origin main
```

**OU se estiver em outra branch:**
```bash
git push origin nome-da-branch
```

---

## 🌿 Trabalhar com Branches

### Criar uma nova branch
```bash
git checkout -b nome-da-branch
```

**OU (Git 2.23+):**
```bash
git switch -c nome-da-branch
```

### Listar todas as branches
```bash
git branch
```

### Mudar para uma branch
```bash
git checkout nome-da-branch
```

**OU (Git 2.23+):**
```bash
git switch nome-da-branch
```

### Deletar uma branch local
```bash
git branch -d nome-da-branch
```

### Deletar uma branch remota
```bash
git push origin --delete nome-da-branch
```

### Atualizar branch local com mudanças do GitHub
```bash
git pull origin main
```

---

## ⚠️ Resolver Conflitos

### Atualizar branch local antes de fazer push
```bash
git pull origin main
```

### Se houver conflitos:
1. Git mostrará os arquivos em conflito
2. Abra os arquivos e resolva os conflitos manualmente
3. Procure por marcadores como:
   ```
   <<<<<<< HEAD
   Seu código
   =======
   Código do GitHub
   >>>>>>> branch-name
   ```
4. Remova os marcadores e mantenha o código correto

### Após resolver conflitos:
```bash
git add .
git commit -m "fix: Resolver conflitos de merge"
git push origin main
```

---

## 🛠️ Comandos Úteis

### Desfazer mudanças não commitadas
```bash
# Desfazer mudanças em arquivo específico
git restore nome-do-arquivo.jsx

# Desfazer todas as mudanças não commitadas
git restore .
```

### Desfazer último commit (mantendo mudanças)
```bash
git reset --soft HEAD~1
```

### Desfazer último commit (removendo mudanças)
```bash
git reset --hard HEAD~1
```

### Ver diferenças entre commits
```bash
git diff HEAD~1 HEAD
```

### Ver arquivos de um commit específico
```bash
git show commit-hash
```

### Adicionar arquivo ao último commit (sem criar novo commit)
```bash
git add arquivo-esquecido.jsx
git commit --amend --no-edit
```

### Renomear último commit
```bash
git commit --amend -m "Nova mensagem de commit"
```

### Ver quem modificou cada linha
```bash
git blame nome-do-arquivo.jsx
```

### Ignorar arquivos (adicionar ao .gitignore)
```bash
# Criar/editar .gitignore
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
```

---

## 📦 Comandos Avançados

### Criar um backup da branch atual
```bash
git branch backup-$(date +%Y%m%d)
```

### Ver todas as branches (incluindo remotas)
```bash
git branch -a
```

### Sincronizar branches remotas
```bash
git fetch origin
```

### Ver diferenças entre branch local e remota
```bash
git diff main origin/main
```

### Fazer merge de uma branch na main
```bash
git checkout main
git merge nome-da-branch
git push origin main
```

### Criar tag de versão
```bash
git tag -a v1.0.0 -m "Versão 1.0.0"
git push origin v1.0.0
```

### Ver todas as tags
```bash
git tag
```

---

## 🔄 Fluxo de Trabalho Recomendado

### **Para atualizações diárias:**

```bash
# 1. Verificar status
git status

# 2. Adicionar mudanças
git add .

# 3. Criar commit
git commit -m "feat: Descrição das mudanças"

# 4. Atualizar do GitHub (se necessário)
git pull origin main

# 5. Enviar para o GitHub
git push origin main
```

### **Para trabalhar em nova funcionalidade:**

```bash
# 1. Criar nova branch
git checkout -b feature/nova-funcionalidade

# 2. Fazer suas mudanças e commits
git add .
git commit -m "feat: Implementar nova funcionalidade"

# 3. Enviar branch para GitHub
git push origin feature/nova-funcionalidade

# 4. Voltar para main e fazer merge
git checkout main
git pull origin main
git merge feature/nova-funcionalidade
git push origin main

# 5. Deletar branch local (opcional)
git branch -d feature/nova-funcionalidade
```

### **Para atualizar projeto local com GitHub:**

```bash
# 1. Verificar se há mudanças remotas
git fetch origin

# 2. Atualizar branch local
git pull origin main

# OU fazer merge manualmente
git merge origin/main
```

---

## 📌 Convenções de Mensagens de Commit

Use prefixos padronizados para facilitar a organização:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `refactor:` - Refatoração de código
- `style:` - Mudanças de formatação/estilo
- `docs:` - Documentação
- `test:` - Testes
- `chore:` - Tarefas de manutenção
- `perf:` - Melhorias de performance
- `ci:` - Configuração de CI/CD

**Exemplos:**
```bash
git commit -m "feat: Adicionar sistema de busca avançada"
git commit -m "fix: Corrigir erro ao salvar pratos sem categoria"
git commit -m "refactor: Reorganizar estrutura do DishesTab"
git commit -m "style: Ajustar espaçamento dos cards mobile"
git commit -m "docs: Atualizar guia de instalação"
```

---

## 🚨 Solução de Problemas Comuns

### **Erro: "Your branch is ahead of 'origin/main' by X commits"**
```bash
# Significa que você tem commits locais não enviados
git push origin main
```

### **Erro: "Your branch is behind 'origin/main' by X commits"**
```bash
# Significa que o GitHub tem commits que você não tem
git pull origin main
```

### **Erro: "Failed to push some refs"**
```bash
# Atualizar primeiro e depois fazer push
git pull origin main
# Resolver conflitos se houver
git push origin main
```

### **Esqueceu de adicionar arquivo ao commit**
```bash
git add arquivo-esquecido.jsx
git commit --amend --no-edit
git push origin main --force
```

### **Quer desfazer último push (CUIDADO!)**
```bash
# Apenas se tiver certeza absoluta!
git reset --hard HEAD~1
git push origin main --force
```

---

## 📱 Comandos Rápidos (Copy & Paste)

### **Atualização rápida completa:**
```bash
git add . && git commit -m "feat: Atualizar projeto" && git push origin main
```

### **Ver status e diferenças:**
```bash
git status && git diff
```

### **Atualizar do GitHub:**
```bash
git pull origin main
```

### **Enviar para GitHub:**
```bash
git add . && git commit -m "feat: Sua mensagem aqui" && git push origin main
```

---

## 🔐 Autenticação

### **Se pedir usuário/senha:**
- Use seu **Personal Access Token** do GitHub (não sua senha)
- Ou configure SSH keys para autenticação automática

### **Configurar SSH (recomendado):**
```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "seu.email@exemplo.com"

# Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# Adicionar no GitHub: Settings > SSH and GPG keys > New SSH key
```

---

## 📞 Ajuda

### Ver ajuda de qualquer comando
```bash
git help comando
# Exemplo: git help push
```

### Ver todas as opções de um comando
```bash
git comando --help
# Exemplo: git commit --help
```

---

## ✅ Checklist Antes de Fazer Push

- [ ] Verificar status: `git status`
- [ ] Revisar mudanças: `git diff`
- [ ] Adicionar arquivos: `git add .`
- [ ] Criar commit descritivo: `git commit -m "mensagem"`
- [ ] Atualizar do GitHub: `git pull origin main`
- [ ] Resolver conflitos (se houver)
- [ ] Enviar para GitHub: `git push origin main`
- [ ] Verificar no GitHub se tudo foi enviado corretamente

---

**💡 Dica:** Sempre faça `git pull` antes de `git push` para evitar conflitos!

**⚠️ Atenção:** Use `--force` apenas quando tiver certeza absoluta do que está fazendo!

---

*Última atualização: Janeiro 2025*
