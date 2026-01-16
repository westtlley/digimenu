# 💾 Sistema de Persistência de Dados

## Problema Resolvido

Anteriormente, o backend usava um banco de dados em memória, o que causava perda de todos os dados (pratos, categorias, configurações, etc.) sempre que o servidor reiniciava, especialmente em deploys no Render.

## Solução Implementada

Foi implementado um sistema de persistência usando arquivos JSON que:

1. **Salva automaticamente** os dados após cada modificação (criação, atualização, deleção)
2. **Carrega os dados** automaticamente quando o servidor inicia
3. **Salva periodicamente** a cada 30 segundos como backup
4. **Salva ao encerrar** o servidor (SIGTERM/SIGINT)

## Como Funciona

### Estrutura de Arquivos

```
backend/
  db/
    data/
      database.json  # Arquivo onde os dados são salvos
    persistence.js   # Módulo de persistência
```

### Funcionalidades

- **`loadDatabase()`**: Carrega dados do arquivo `database.json` ao iniciar
- **`saveDatabase(db)`**: Salva os dados imediatamente
- **`saveDatabaseDebounced(db, delay)`**: Salva com delay para evitar muitas escritas

### Segurança

- Senhas não são salvas em texto plano
- Tokens de autenticação não são persistidos
- Dados sensíveis são filtrados antes de salvar

## Configuração no Render

O sistema funciona automaticamente. Certifique-se de que:

1. O diretório `backend/db/data/` existe (é criado automaticamente)
2. O arquivo `database.json` está sendo criado e mantido entre deploys

### Importante para Render

No Render, o sistema de arquivos é **persistente** entre deploys, então os dados serão mantidos. O arquivo `database.json` será salvo no sistema de arquivos do Render e não será perdido em novos deploys.

## Backup Recomendado

Para maior segurança, recomenda-se:

1. Fazer backup periódico do arquivo `database.json`
2. Considerar migrar para um banco de dados real (PostgreSQL, MongoDB) no futuro
3. Implementar sistema de backup automático

## Próximos Passos

Para produção em larga escala, considere migrar para:
- **PostgreSQL** (recomendado para dados relacionais)
- **MongoDB** (recomendado para dados flexíveis)
- **SQLite** (alternativa leve e simples)
