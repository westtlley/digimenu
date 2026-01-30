/**
 * Script para criar o demo interativo: demo-pizzaria
 * Popula com dados de exemplo para demonstração
 * 
 * Uso:
 *   node -r dotenv/config scripts/seed-demo-pizzaria.js
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurado. O demo requer PostgreSQL.');
  process.exit(1);
}

const repo = await import('../db/repository.js');

const DEMO_EMAIL = 'demo@pizzaria.com';
const DEMO_SLUG = 'demo-pizzaria';

async function seedDemo() {
  console.log('🍕 Criando demo-pizzaria...\n');

  try {
    // 1. Verificar se já existe
    let subscriber = await repo.getSubscriberByEmail(DEMO_EMAIL);
    
    if (!subscriber) {
      console.log('📝 Criando subscriber...');
      subscriber = await repo.createSubscriber({
        email: DEMO_EMAIL,
        name: 'Pizzaria Demo',
        slug: DEMO_SLUG,
        plan: 'ultra',
        status: 'active',
        expires_at: null, // Sem expiração
        permissions: {
          store: ['view', 'update'],
          dishes: ['view', 'create', 'update', 'delete'],
          categories: ['view', 'create', 'update', 'delete'],
          orders: ['view', 'create', 'update', 'delete'],
          dashboard: ['view'],
          whatsapp: ['view'],
          pizza_config: ['view', 'update']
        }
      });
      console.log('✅ Subscriber criado:', subscriber.email);
    } else {
      console.log('✅ Subscriber já existe:', subscriber.email);
    }

    const subEmail = subscriber.email;

    // 2. Criar loja
    console.log('\n🏪 Criando loja...');
    const stores = await repo.listEntitiesForSubscriber('Store', subEmail);
    if (stores.length === 0) {
      await repo.createEntity('Store', subEmail, {
        name: 'Pizzaria Demo',
        logo: 'https://res.cloudinary.com/dcg8jvmho/image/upload/v1706721234/pizza-logo.png',
        slogan: 'A melhor pizza da cidade!',
        whatsapp: '11999887766',
        address: 'Rua das Pizzas, 123 - Centro',
        opening_time: '18:00',
        closing_time: '23:00',
        working_days: [0, 1, 2, 3, 4, 5, 6],
        is_open: true,
        accepting_orders: true,
        primary_color: '#e63946',
        enable_premium_pizza_visualization: true
      });
      console.log('✅ Loja criada');
    }

    // 3. Criar categorias
    console.log('\n📂 Criando categorias...');
    const categories = await repo.listEntitiesForSubscriber('Category', subEmail);
    if (categories.length === 0) {
      await repo.createEntity('Category', subEmail, { name: 'Pizzas', order: 1, is_active: true });
      await repo.createEntity('Category', subEmail, { name: 'Bebidas', order: 2, is_active: true });
      await repo.createEntity('Category', subEmail, { name: 'Sobremesas', order: 3, is_active: true });
      console.log('✅ Categorias criadas');
    }

    // 4. Tamanhos de pizza
    console.log('\n📏 Criando tamanhos de pizza...');
    const sizes = await repo.listEntitiesForSubscriber('PizzaSize', subEmail);
    if (sizes.length === 0) {
      await repo.createEntity('PizzaSize', subEmail, {
        name: 'Pequena',
        slices: 4,
        max_flavors: 2,
        price_tradicional: 35.00,
        price_premium: 40.00,
        order: 1,
        is_active: true
      });
      await repo.createEntity('PizzaSize', subEmail, {
        name: 'Média',
        slices: 6,
        max_flavors: 2,
        price_tradicional: 50.00,
        price_premium: 60.00,
        order: 2,
        is_active: true
      });
      await repo.createEntity('PizzaSize', subEmail, {
        name: 'Grande',
        slices: 8,
        max_flavors: 3,
        price_tradicional: 65.00,
        price_premium: 75.00,
        order: 3,
        is_active: true
      });
      console.log('✅ Tamanhos criados');
    }

    // 5. Sabores de pizza
    console.log('\n🍕 Criando sabores...');
    const flavors = await repo.listEntitiesForSubscriber('PizzaFlavor', subEmail);
    if (flavors.length === 0) {
      const flavorsList = [
        { name: 'Margherita', category: 'tradicional', order: 1 },
        { name: 'Calabresa', category: 'tradicional', order: 2 },
        { name: 'Frango com Catupiry', category: 'tradicional', order: 3 },
        { name: 'Portuguesa', category: 'tradicional', order: 4 },
        { name: 'Quatro Queijos', category: 'premium', order: 5 },
        { name: 'Pepperoni', category: 'premium', order: 6 },
        { name: 'Lombinho', category: 'premium', order: 7 },
        { name: 'Camarão', category: 'premium', order: 8 }
      ];
      
      for (const flavor of flavorsList) {
        await repo.createEntity('PizzaFlavor', subEmail, {
          ...flavor,
          description: `Deliciosa pizza de ${flavor.name}`,
          is_active: true
        });
      }
      console.log('✅ Sabores criados');
    }

    // 6. Bordas
    console.log('\n🧀 Criando bordas...');
    const edges = await repo.listEntitiesForSubscriber('PizzaEdge', subEmail);
    if (edges.length === 0) {
      await repo.createEntity('PizzaEdge', subEmail, {
        name: 'Catupiry',
        price: 8.00,
        order: 1,
        is_active: true
      });
      await repo.createEntity('PizzaEdge', subEmail, {
        name: 'Cheddar',
        price: 10.00,
        order: 2,
        is_active: true
      });
      console.log('✅ Bordas criadas');
    }

    // 7. Extras
    console.log('\n✨ Criando extras...');
    const extras = await repo.listEntitiesForSubscriber('PizzaExtra', subEmail);
    if (extras.length === 0) {
      await repo.createEntity('PizzaExtra', subEmail, {
        name: 'Bacon Extra',
        price: 5.00,
        order: 1,
        is_active: true
      });
      await repo.createEntity('PizzaExtra', subEmail, {
        name: 'Azeitonas',
        price: 3.00,
        order: 2,
        is_active: true
      });
      console.log('✅ Extras criados');
    }

    // 8. Criar alguns pratos
    console.log('\n🍽️ Criando pratos...');
    const dishes = await repo.listEntitiesForSubscriber('Dish', subEmail);
    if (dishes.length === 0) {
      const cats = await repo.listEntitiesForSubscriber('Category', subEmail);
      const pizzaCat = cats.find(c => c.name === 'Pizzas');
      const bebidaCat = cats.find(c => c.name === 'Bebidas');
      
      // Pizza pronta (Monte Sua Pizza)
      await repo.createEntity('Dish', subEmail, {
        name: 'Monte Sua Pizza',
        description: 'Escolha o tamanho, sabores, borda e extras!',
        price: 35.00,
        category_id: pizzaCat?.id,
        product_type: 'pizza',
        is_active: true,
        order: 1
      });

      // Bebidas
      await repo.createEntity('Dish', subEmail, {
        name: 'Coca-Cola 2L',
        description: 'Refrigerante Coca-Cola 2 litros',
        price: 12.00,
        category_id: bebidaCat?.id,
        product_type: 'simple',
        is_active: true,
        order: 1
      });

      await repo.createEntity('Dish', subEmail, {
        name: 'Guaraná Antarctica 2L',
        description: 'Refrigerante Guaraná 2 litros',
        price: 10.00,
        category_id: bebidaCat?.id,
        product_type: 'simple',
        is_active: true,
        order: 2
      });

      console.log('✅ Pratos criados');
    }

    // 9. Zona de entrega
    console.log('\n🚚 Criando zona de entrega...');
    const zones = await repo.listEntitiesForSubscriber('DeliveryZone', subEmail);
    if (zones.length === 0) {
      await repo.createEntity('DeliveryZone', subEmail, {
        name: 'Centro',
        fee: 5.00,
        min_order: 30.00,
        delivery_time: '40-50 min',
        is_active: true
      });
      console.log('✅ Zona criada');
    }

    console.log('\n🎉 Demo criado com sucesso!');
    console.log(`\n🔗 Acesse: https://digimenu-chi.vercel.app/s/${DEMO_SLUG}`);
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log(`🔑 Slug: ${DEMO_SLUG}\n`);

  } catch (error) {
    console.error('\n❌ Erro ao criar demo:', error);
    throw error;
  }
}

seedDemo().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
