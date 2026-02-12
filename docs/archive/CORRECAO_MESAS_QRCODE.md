# ✅ Correção: Mesas e QR Code Não Aparecendo

## 🐛 Problema Identificado

As funções de **Mesas e QR Code** não estavam aparecendo no menu do sistema porque o módulo `tables` não estava incluído na lista de módulos permitidos automaticamente.

## ✅ Correções Aplicadas

### 1. Atualizado `usePermission.jsx`

Adicionado `tables` e `inventory` à lista de módulos avançados disponíveis para todos os planos pagos:

```javascript
// Novos módulos avançados - disponíveis para todos os planos pagos
if (['affiliates', 'lgpd', '2fa', 'tables', 'inventory'].includes(module)) {
  const plan = (subscriberData?.plan || '').toLowerCase();
  return ['basic', 'pro', 'premium', 'ultra'].includes(plan);
}
```

### 2. Atualizado `SharedSidebar.jsx`

Atualizada a função `hasModuleAccess` local para incluir os mesmos módulos:

```javascript
// Novos módulos avançados - disponíveis para todos os planos pagos
if (['affiliates', 'lgpd', '2fa', 'tables', 'inventory'].includes(module)) {
  const planLower = (plan || '').toLowerCase();
  return ['basic', 'pro', 'premium', 'ultra'].includes(planLower);
}
```

## 📍 Localização no Menu

O item **"Mesas e QR Code"** aparece em:
- **Menu**: 🍽️ RESTAURANTE > Mesas e QR Code
- **Ícone**: QR Code
- **Módulo**: `tables`

## ✅ Verificações Realizadas

- ✅ Componente `TablesTab.jsx` existe e está correto
- ✅ Import correto em `Admin.jsx`
- ✅ Case configurado em `Admin.jsx`
- ✅ Item de menu configurado em `SharedSidebar.jsx`
- ✅ Permissões atualizadas em ambos os arquivos

## 🚀 Como Testar

1. Faça login como master ou assinante com plano pago (basic, pro, premium, ultra)
2. Acesse `/admin`
3. Verifique se aparece no menu:
   - **🍽️ RESTAURANTE** > **Mesas e QR Code**
4. Clique no item e verifique se o componente renderiza corretamente

## 📝 Módulos Agora Disponíveis

Os seguintes módulos estão disponíveis para todos os planos pagos:
- ✅ `affiliates` - Programa de Afiliados
- ✅ `lgpd` - Conformidade LGPD
- ✅ `2fa` - Autenticação 2FA
- ✅ `tables` - Mesas e QR Code
- ✅ `inventory` - Gestão de Estoque

---

**Status**: ✅ Correções Aplicadas
**Data**: Hoje
**Próxima Ação**: Testar no navegador
