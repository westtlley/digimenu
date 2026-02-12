# 🔧 Solução para Problema com Node.js/npm

## Problema Identificado

O PowerShell está encontrando um arquivo `npm` em `C:\WINDOWS\system32` antes do npm correto do Node.js em `C:\Program Files\nodejs\`.

## ✅ Soluções

### Opção 1: Usar os Scripts PowerShell (Recomendado)

Criei dois scripts para facilitar:

**Para rodar o Frontend:**
```powershell
.\rodar-frontend.ps1
```

**Para rodar o Backend:**
```powershell
.\rodar-backend.ps1
```

### Opção 2: Usar o Caminho Completo do npm

**Frontend:**
```powershell
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

**Backend:**
```powershell
cd "C:\Users\Wesley Figueiredo\Downloads\digimenu\backend"
& "C:\Program Files\nodejs\npm.cmd" run dev
```

### Opção 3: Corrigir o PATH (Permanente)

1. Abra as **Variáveis de Ambiente** do Windows:
   - Pressione `Win + R`
   - Digite `sysdm.cpl` e pressione Enter
   - Vá na aba **Avançado**
   - Clique em **Variáveis de Ambiente**

2. Na seção **Variáveis do sistema**, encontre `Path` e clique em **Editar**

3. Certifique-se de que `C:\Program Files\nodejs\` está **ANTES** de `C:\WINDOWS\system32` na lista

4. Se não estiver, mova `C:\Program Files\nodejs\` para o topo da lista

5. Clique em **OK** em todas as janelas

6. **Reinicie o PowerShell/Terminal** para aplicar as mudanças

### Opção 4: Criar um Alias no PowerShell

Adicione ao seu perfil do PowerShell (`$PROFILE`):

```powershell
function npm {
    & "C:\Program Files\nodejs\npm.cmd" $args
}
```

Para editar o perfil:
```powershell
notepad $PROFILE
```

## 🧪 Verificar se Está Funcionando

Execute:
```powershell
node --version
& "C:\Program Files\nodejs\npm.cmd" --version
```

Ambos devem retornar versões sem erros.

## 📝 Nota

O Node.js está instalado corretamente (v24.12.0) e o npm também (v11.6.2). O problema é apenas a ordem do PATH no PowerShell.
