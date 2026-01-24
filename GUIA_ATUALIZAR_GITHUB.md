# Passo a passo: como atualizar o projeto no GitHub

Use estes comandos no **PowerShell** ou no **Terminal** (pasta do projeto).

---

## 1. Abrir a pasta do projeto

```powershell
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu"
```

*(Ajuste o caminho se a pasta do projeto for outra.)*

---

## 2. Ver o que foi alterado

```powershell
git status
```

- ** modified: ** = arquivo modificado  
- ** Untracked ** = arquivo novo ainda não versionado  

---

## 3. Adicionar os arquivos

**Tudo de uma vez:**

```powershell
git add .
```

**Só alguns arquivos:**

```powershell
git add src/api/apiClient.js src/pages/Cardapio.jsx
```

---

## 4. Fazer o commit

```powershell
git commit -m "sua mensagem descrevendo a alteração"
```

Exemplos de mensagem:

- `fix: corrige erro no cardápio`
- `feat: adiciona tela de Colaboradores`
- `fix: corrige TypeError o.filter is not a function`

---

## 5. Enviar para o GitHub

```powershell
git push origin main
```

Se o repositório usar outra branch (por exemplo `master`):

```powershell
git push origin master
```

---

## Comandos em sequência (copiar e colar)

Quando você só quer enviar **todas** as alterações:

```powershell
cd "c:\Users\Wesley Figueiredo\Downloads\digimenu"
git add .
git commit -m "descrição da alteração"
git push origin main
```

*(Troque `"descrição da alteração"` pela mensagem que fizer sentido.)*

---

## Se der erro de autenticação

- **GitHub com HTTPS:** o Windows pode pedir usuário e senha.  
  Em “senha”, use um **Personal Access Token** (não a senha da conta):  
  GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.

- **“Updates were rejected” / conflito:** alguém pode ter alterado o `main` no GitHub. Puxe as mudanças e depois envie de novo:

  ```powershell
  git pull origin main
  git push origin main
  ```

---

## Resumo dos comandos

| Ação            | Comando                    |
|-----------------|----------------------------|
| Ver alterações  | `git status`               |
| Adicionar tudo  | `git add .`                |
| Registrar       | `git commit -m "mensagem"` |
| Enviar pro GitHub | `git push origin main`  |
