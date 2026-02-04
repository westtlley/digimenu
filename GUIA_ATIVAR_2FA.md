# 🔐 Guia para Ativar 2FA para Assinantes

## 📋 Visão Geral

O 2FA (Autenticação de Dois Fatores) adiciona uma camada extra de segurança às contas de assinantes. Cada assinante precisa ativar manualmente o 2FA através do painel admin.

## ✅ Migração Executada

A migração do banco de dados foi executada com sucesso. Os índices e estruturas necessárias para 2FA, Afiliados e LGPD foram criados.

## 🚀 Como Ativar 2FA para Assinantes

### Opção 1: Ativação Manual pelo Assinante (Recomendado)

1. **Assinante faz login** no painel admin (`/painelassinante`)
2. **Navega para** "Sistema" > "Autenticação 2FA"
3. **Clica em** "Ativar 2FA"
4. **Escaneia o QR Code** com app autenticador (Google Authenticator, Microsoft Authenticator, Authy, etc.)
5. **Digita o código** de 6 dígitos do app
6. **Salva os códigos de backup** em local seguro
7. **2FA ativado!** ✅

### Opção 2: Admin Master Pode Verificar Status

1. **Admin Master faz login** no painel (`/admin`)
2. **Navega para** "Sistema" > "Autenticação 2FA"
3. **Visualiza** quais assinantes têm 2FA ativado
4. **Pode desativar** 2FA se necessário (apenas em casos excepcionais)

## 📱 Apps Autenticadores Recomendados

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (iOS/Android/Desktop)

## 🔒 Segurança

- **Códigos de Backup**: Cada ativação gera 10 códigos de backup únicos
- **Armazenamento**: Guarde os códigos de backup em local seguro (gerenciador de senhas, cofre)
- **Perda do App**: Use os códigos de backup para recuperar acesso
- **Desativação**: Apenas o próprio usuário ou admin master pode desativar

## ⚠️ Importante

- **Não ative 2FA automaticamente** - cada assinante deve fazer isso manualmente
- **Códigos de backup são únicos** - não podem ser recuperados depois
- **2FA é opcional** - mas altamente recomendado para segurança

## 🛠️ Troubleshooting

### Assinante não consegue ativar 2FA

1. Verificar se o app autenticador está instalado
2. Verificar se o QR Code foi escaneado corretamente
3. Verificar se o código de 6 dígitos está correto
4. Tentar novamente com um novo QR Code

### Assinante perdeu acesso ao app autenticador

1. Usar um dos 10 códigos de backup salvos
2. Se não tiver códigos de backup, contatar admin master
3. Admin master pode desativar 2FA temporariamente

## 📊 Status da Migração

A migração `add_advanced_features.sql` foi executada e criou:

- ✅ Índices para `User2FA` (user_email, enabled)
- ✅ Índices para `Affiliate` (affiliate_code, status)
- ✅ Índices para `Referral` (affiliate_id, order_id, status)
- ✅ Índices para `LGPDRequest` (customer_email, status)
- ✅ Índices para `Customer` (lgpd_deleted, lgpd_exported)

## 🎯 Próximos Passos

1. **Informar assinantes** sobre a disponibilidade do 2FA
2. **Enviar email** com instruções de ativação
3. **Monitorar** taxa de adoção do 2FA
4. **Oferecer suporte** para dúvidas sobre ativação

---

**Nota**: O 2FA é uma funcionalidade de segurança importante. Encoraje todos os assinantes a ativarem para proteger suas contas.
