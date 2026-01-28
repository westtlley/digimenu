# 🔐 Como Gerar JWT_SECRET

## O que é JWT_SECRET?

O `JWT_SECRET` é uma chave secreta usada para **assinar e verificar** tokens JWT (JSON Web Tokens). É como uma "senha mestre" que garante que os tokens não foram falsificados.

## ⚠️ IMPORTANTE

- **Você mesmo cria** essa chave
- Deve ser **aleatória e segura** (mínimo 32 caracteres)
- **Nunca compartilhe** ou version no Git
- Use uma chave **diferente** para cada ambiente (dev, produção)

---

## 🎲 Métodos para Gerar

### Método 1: Node.js (Recomendado)

```bash
# No terminal, execute:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Isso vai gerar uma string de 128 caracteres (64 bytes em hexadecimal).

**Exemplo de saída:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

### Método 2: OpenSSL

```bash
# Windows (PowerShell)
openssl rand -hex 64

# Linux/Mac
openssl rand -hex 64
```

### Método 3: Online (use com cuidado)

Sites como:
- https://randomkeygen.com/
- https://www.lastpass.com/pt/features/password-generator

**⚠️ Atenção**: Use apenas se confiar no site. Prefira métodos locais.

### Método 4: Python

```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

---

## 📝 Como Usar

1. **Gere a chave** usando um dos métodos acima
2. **Copie a chave gerada**
3. **Cole no arquivo** `backend/.env`:

```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

4. **Salve o arquivo**

---

## ✅ Validação

O sistema valida automaticamente:
- ✅ Mínimo de 32 caracteres
- ✅ Não pode ser "your-secret-key" (padrão inseguro)
- ✅ Obrigatório em produção

Se a chave for inválida, o servidor **não vai iniciar** e mostrará um erro.

---

## 🔄 Diferentes Ambientes

Use chaves **diferentes** para cada ambiente:

**Desenvolvimento** (`backend/.env`):
```env
JWT_SECRET=chave-dev-aleatoria-123...
```

**Produção** (servidor):
```env
JWT_SECRET=chave-producao-super-secreta-456...
```

**⚠️ NUNCA** use a mesma chave em dev e produção!

---

## 🎯 Exemplo Completo

```bash
# 1. Gerar chave
$ node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8

# 2. Copiar e colar no backend/.env
JWT_SECRET=7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8

# 3. Pronto! ✅
```

---

## ❓ FAQ

**P: Posso usar uma senha simples?**
R: ❌ Não! Use sempre uma chave aleatória longa.

**P: E se eu perder a chave?**
R: Todos os tokens existentes serão invalidados. Usuários precisarão fazer login novamente.

**P: Posso mudar depois?**
R: Sim, mas invalidará todos os tokens ativos.

**P: Quantos caracteres preciso?**
R: Mínimo 32, mas recomendo 64+ para máxima segurança.

---

**Dica**: Salve a chave em um gerenciador de senhas (LastPass, 1Password, etc.) para não perder!
