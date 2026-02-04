# 🎨 Guia de Componentes UX e Design

Este guia documenta os novos componentes de UX e design implementados no sistema.

## 📚 Índice

1. [Design System](#design-system)
2. [Skeleton Loaders](#skeleton-loaders)
3. [Animações](#animações)
4. [Tooltips Contextuais](#tooltips-contextuais)
5. [Onboarding Interativo](#onboarding-interativo)

---

## 🎨 Design System

### Tokens Centralizados

Todos os tokens de design estão centralizados em `src/styles/designTokens.js`:

```javascript
import { designTokens } from '@/styles/designTokens';

// Cores
const primaryColor = designTokens.colors.primary[500];

// Espaçamento
const padding = designTokens.spacing.md;

// Tipografia
const fontSize = designTokens.typography.fontSize.lg;
```

### Uso em Componentes

```jsx
import { designTokens } from '@/styles/designTokens';

function MyComponent() {
  return (
    <div style={{ 
      padding: designTokens.spacing.lg,
      color: designTokens.colors.primary[500],
      borderRadius: designTokens.borderRadius.lg
    }}>
      Conteúdo
    </div>
  );
}
```

---

## 💀 Skeleton Loaders

### EnhancedSkeleton

Skeleton loader melhorado com shimmer effect:

```jsx
import { EnhancedSkeleton } from '@/components/ui/EnhancedSkeleton';

<EnhancedSkeleton className="h-10 w-full" variant="default" />
```

### SkeletonCard

Card completo com skeleton:

```jsx
import { SkeletonCard } from '@/components/ui/EnhancedSkeleton';

<SkeletonCard showImage={true} />
```

### SkeletonList

Lista com múltiplos itens:

```jsx
import { SkeletonList } from '@/components/ui/EnhancedSkeleton';

<SkeletonList count={5} />
```

### SkeletonGrid

Grid com skeleton cards:

```jsx
import { SkeletonGrid } from '@/components/ui/EnhancedSkeleton';

<SkeletonGrid count={6} cols={3} />
```

### SkeletonTable

Tabela com skeleton:

```jsx
import { SkeletonTable } from '@/components/ui/EnhancedSkeleton';

<SkeletonTable rows={5} cols={4} />
```

---

## ✨ Animações

### StaggerAnimation

Animações de entrada escalonadas para listas:

```jsx
import { StaggerAnimation } from '@/components/ui/StaggerAnimation';

<StaggerAnimation staggerDelay={0.05}>
  {items.map(item => (
    <div key={item.id}>{item.name}</div>
  ))}
</StaggerAnimation>
```

### RippleEffect

Efeito ripple ao clicar:

```jsx
import { RippleEffect, RippleButton } from '@/components/ui/RippleEffect';

// Em qualquer elemento
<RippleEffect color="rgba(255, 255, 255, 0.5)">
  <div className="p-4 bg-blue-500 text-white">
    Clique aqui
  </div>
</RippleEffect>

// Botão com ripple
<RippleButton onClick={handleClick}>
  Clique
</RippleButton>
```

---

## 💡 Tooltips Contextuais

### ContextualTooltip

Tooltip com ícone informativo:

```jsx
import { ContextualTooltip } from '@/components/ui/ContextualTooltip';

<ContextualTooltip 
  content="Este campo é obrigatório"
  icon="info"
  variant="default"
>
  <label>Nome</label>
</ContextualTooltip>
```

### FieldTooltip

Tooltip específico para campos de formulário:

```jsx
import { FieldTooltip } from '@/components/ui/ContextualTooltip';

<FieldTooltip
  label="Email"
  description="Digite seu email para login"
  required={true}
  error={errors.email}
/>
```

---

## 🎯 Onboarding Interativo

### OnboardingTour

Tour interativo para guiar novos usuários:

```jsx
import { OnboardingTour } from '@/components/ui/OnboardingTour';

const steps = [
  {
    title: 'Bem-vindo!',
    content: 'Este é o painel de controle',
    position: { left: '50%', top: '50%' }
  },
  {
    title: 'Criar Prato',
    content: 'Clique aqui para adicionar um novo prato',
    target: {
      left: 100,
      top: 200,
      width: 200,
      height: 50
    },
    position: { left: '300px', top: '250px' }
  }
];

<OnboardingTour
  steps={steps}
  storageKey="admin_onboarding"
  onComplete={() => console.log('Onboarding completo!')}
  skipable={true}
/>
```

### useOnboarding Hook

Hook para facilitar o controle do onboarding:

```jsx
import { useOnboarding } from '@/components/ui/OnboardingTour';

const { isActive, start, complete, reset } = useOnboarding(
  steps,
  'my_onboarding_key'
);

// Iniciar
start();

// Completar
complete();

// Resetar (para testar novamente)
reset();
```

---

## 🎨 Exemplos Práticos

### Lista com Animações

```jsx
import { StaggerAnimation } from '@/components/ui/StaggerAnimation';
import { SkeletonList } from '@/components/ui/EnhancedSkeleton';

function DishList({ dishes, loading }) {
  if (loading) {
    return <SkeletonList count={6} />;
  }

  return (
    <StaggerAnimation staggerDelay={0.05}>
      {dishes.map(dish => (
        <DishCard key={dish.id} dish={dish} />
      ))}
    </StaggerAnimation>
  );
}
```

### Formulário com Tooltips

```jsx
import { FieldTooltip } from '@/components/ui/ContextualTooltip';

function DishForm() {
  return (
    <form>
      <FieldTooltip
        label="Nome do Prato"
        description="Digite o nome que aparecerá no cardápio"
        required={true}
      />
      <input type="text" />

      <FieldTooltip
        label="Preço"
        description="Preço em reais (R$)"
        required={true}
        error={errors.price}
      />
      <input type="number" />
    </form>
  );
}
```

### Botão com Ripple

```jsx
import { RippleButton } from '@/components/ui/RippleEffect';

function ActionButton() {
  return (
    <RippleButton
      onClick={handleAction}
      className="px-4 py-2 bg-orange-500 text-white rounded"
    >
      Salvar
    </RippleButton>
  );
}
```

---

## 📝 Notas Importantes

1. **Performance**: As animações usam `framer-motion` que é otimizado para performance
2. **Acessibilidade**: Todos os componentes seguem padrões de acessibilidade
3. **Temas**: Os componentes se adaptam automaticamente ao tema claro/escuro
4. **Responsividade**: Todos os componentes são responsivos por padrão

---

## 🔗 Referências

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Radix UI Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip)
- [Design Tokens](src/styles/designTokens.js)
