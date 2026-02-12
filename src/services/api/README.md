# Serviços de API

Este diretório contém serviços organizados por domínio para comunicação com o backend.

## Estrutura

- **`auth.service.js`** - Autenticação e autorização
- **`users.service.js`** - Usuários e colaboradores
- **`establishments.service.js`** - Estabelecimentos/Assinantes
- **`menus.service.js`** - Menus e cardápios (admin e público)
- **`orders.service.js`** - Pedidos
- **`common.service.js`** - Funções comuns e utilitários

## Princípios

1. **Backend é fonte única de verdade** - Serviços apenas fazem chamadas HTTP, sem lógica de negócio
2. **Tratamento de erro centralizado** - Erros são propagados para componentes tratarem
3. **Tipos de resposta consistentes** - Todos os serviços retornam dados no mesmo formato
4. **Documentação clara** - Cada função documenta parâmetros e retorno

## Uso

```javascript
import { authService } from '@/services/api/auth.service';
import { ordersService } from '@/services/api/orders.service';

// Autenticação
const user = await authService.login(email, password);

// Pedidos
const orders = await ordersService.list({ status: 'new' });
```
