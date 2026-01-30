# 🍕 Backup - Componentes de Pizza

**Data do Backup:** 30/01/2026

## 📋 Arquivos Incluídos (10 arquivos)

### **Visualização e Efeitos:**
1. **PizzaVisualizationPremium.jsx** - Visualização premium com animações avançadas
2. **PizzaVisualization.jsx** - Visualização básica da pizza
3. **PizzaBuilder.jsx** - Construtor principal (montagem step-by-step)
4. **PizzaVisualizer.jsx** - Visualizador no cardápio público

### **Interface do Cardápio:**
5. **PizzaModal.jsx** - Modal de montagem da pizza
6. **PizzaCustomization.jsx** - Customização e seleção de ingredientes

### **Painel Admin:**
7. **PizzaConfigTab.jsx** - Configuração de tamanhos, sabores, bordas e extras
8. **PizzaVisualizationSettings.jsx** - Habilitar/desabilitar modo premium
9. **PizzaForm.jsx** - Formulário de criação/edição de pizzas
10. **MyPizzasTab.jsx** - Aba de gerenciamento de pizzas salvas

---

## 🎯 Propósito

Este backup contém todos os componentes relacionados ao sistema de pizza:
- Montagem interativa
- Visualização com animações
- Configuração no painel admin
- Experiência do cliente no cardápio

---

## 📁 Localização Original

```
src/components/pizza/
├── PizzaVisualizationPremium.jsx
├── PizzaVisualization.jsx
└── PizzaBuilder.jsx

src/components/menu/
├── PizzaVisualizer.jsx
├── PizzaModal.jsx
└── PizzaCustomization.jsx

src/components/admin/
├── PizzaConfigTab.jsx
├── PizzaVisualizationSettings.jsx
├── PizzaForm.jsx
└── MyPizzasTab.jsx
```

---

## ⚠️ Importante

- Este é um backup estático dos arquivos
- Para restaurar, copie os arquivos de volta para suas pastas originais
- Não delete esta pasta sem verificar se os originais estão funcionando

---

## 🔧 Como Restaurar

```bash
# Restaurar componentes de pizza
cp backup-pizza-components/PizzaVisualizationPremium.jsx src/components/pizza/
cp backup-pizza-components/PizzaVisualization.jsx src/components/pizza/
cp backup-pizza-components/PizzaBuilder.jsx src/components/pizza/

# Restaurar componentes do menu
cp backup-pizza-components/PizzaVisualizer.jsx src/components/menu/
cp backup-pizza-components/PizzaModal.jsx src/components/menu/
cp backup-pizza-components/PizzaCustomization.jsx src/components/menu/

# Restaurar componentes do admin
cp backup-pizza-components/PizzaConfigTab.jsx src/components/admin/
cp backup-pizza-components/PizzaVisualizationSettings.jsx src/components/admin/
cp backup-pizza-components/PizzaForm.jsx src/components/admin/
cp backup-pizza-components/MyPizzasTab.jsx src/components/admin/
```
