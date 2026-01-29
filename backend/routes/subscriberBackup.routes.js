/**
 * Rotas de backup para assinantes
 * Permite importar e exportar dados do próprio negócio
 */
import express from 'express';
import { 
  createEntity, 
  updateEntity
} from '../db/repository.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/subscriber-backup/import
 * Importa backup de dados do assinante
 * 
 * Aceita arquivo JSON com estrutura:
 * {
 *   data: {
 *     dishes: [...],
 *     categories: [...],
 *     complement_groups: [...],
 *     store: {...}
 *   }
 * }
 */
router.post('/import', async (req, res) => {
  try {
    const { backupData, mode = 'merge' } = req.body;
    const userId = req.user.id;
    
    if (!backupData || !backupData.data) {
      return res.status(400).json({ 
        error: 'Arquivo de backup inválido. Estrutura esperada: { data: { dishes, categories, complement_groups, store } }' 
      });
    }

    const { data } = backupData;
    const results = {
      dishes: { created: 0, updated: 0, errors: 0 },
      categories: { created: 0, updated: 0, errors: 0 },
      complement_groups: { created: 0, updated: 0, errors: 0 },
      store: { updated: false, error: null }
    };

    logger.log(`📥 Iniciando importação de backup para usuário ${userId} (modo: ${mode})`);

    // 1. IMPORTAR CATEGORIAS (primeiro, pois pratos dependem delas)
    if (data.categories && Array.isArray(data.categories)) {
      logger.log(`📂 Importando ${data.categories.length} categorias...`);
      
      for (const category of data.categories) {
        try {
          // Remover campos que não devem ser importados
          const cleanCategory = {
            name: category.name,
            order: category.order || 0,
            user_id: userId
          };

          if (mode === 'merge' && category.id) {
            // Tenta atualizar categoria existente
            try {
              await updateEntity('Category', category.id, cleanCategory);
              results.categories.updated++;
            } catch {
              // Se não existir, cria nova
              await createEntity('Category', cleanCategory);
              results.categories.created++;
            }
          } else {
            // Sempre cria nova
            await createEntity('Category', cleanCategory);
            results.categories.created++;
          }
        } catch (error) {
          logger.error(`❌ Erro ao importar categoria "${category.name}":`, error.message);
          results.categories.errors++;
        }
      }
    }

    // 2. IMPORTAR GRUPOS DE COMPLEMENTOS
    if (data.complement_groups && Array.isArray(data.complement_groups)) {
      logger.log(`🍔 Importando ${data.complement_groups.length} grupos de complementos...`);
      
      for (const group of data.complement_groups) {
        try {
          const cleanGroup = {
            name: group.name,
            options: group.options || [],
            order: group.order || 0,
            required: group.required || false,
            max_selections: group.max_selections || 1,
            user_id: userId
          };

          if (mode === 'merge' && group.id) {
            try {
              await updateEntity('ComplementGroup', group.id, cleanGroup);
              results.complement_groups.updated++;
            } catch {
              await createEntity('ComplementGroup', cleanGroup);
              results.complement_groups.created++;
            }
          } else {
            await createEntity('ComplementGroup', cleanGroup);
            results.complement_groups.created++;
          }
        } catch (error) {
          logger.error(`❌ Erro ao importar grupo "${group.name}":`, error.message);
          results.complement_groups.errors++;
        }
      }
    }

    // 3. IMPORTAR PRATOS
    if (data.dishes && Array.isArray(data.dishes)) {
      logger.log(`🍽️ Importando ${data.dishes.length} pratos...`);
      
      for (const dish of data.dishes) {
        try {
          const cleanDish = {
            name: dish.name,
            description: dish.description || '',
            price: dish.price || 0,
            category_id: dish.category_id,
            image_url: dish.image_url || '',
            available: dish.available !== false,
            discount_price: dish.discount_price || null,
            product_type: dish.product_type || 'dish',
            complement_groups: dish.complement_groups || [],
            user_id: userId
          };

          if (mode === 'merge' && dish.id) {
            try {
              await updateEntity('Dish', dish.id, cleanDish);
              results.dishes.updated++;
            } catch {
              await createEntity('Dish', cleanDish);
              results.dishes.created++;
            }
          } else {
            await createEntity('Dish', cleanDish);
            results.dishes.created++;
          }
        } catch (error) {
          logger.error(`❌ Erro ao importar prato "${dish.name}":`, error.message);
          results.dishes.errors++;
        }
      }
    }

    // 4. IMPORTAR CONFIGURAÇÕES DA LOJA
    if (data.store && mode === 'merge') {
      logger.log(`🏪 Importando configurações da loja...`);
      
      try {
        const cleanStore = {
          store_name: data.store.store_name,
          description: data.store.description,
          whatsapp: data.store.whatsapp,
          address: data.store.address,
          logo_url: data.store.logo_url,
          banner_url: data.store.banner_url,
          theme_color: data.store.theme_color,
          is_open: data.store.is_open,
          opening_hours: data.store.opening_hours,
          delivery_fee: data.store.delivery_fee,
          min_order_value: data.store.min_order_value
        };

        // Store usa user_id como identificador, então precisamos buscar pelo email do request
        await updateEntity('Store', userId, cleanStore);
        results.store.updated = true;
      } catch (error) {
        logger.error(`❌ Erro ao importar configurações da loja:`, error.message);
        results.store.error = error.message;
      }
    }

    // 5. RESUMO
    logger.log('\n📋 RESUMO DA IMPORTAÇÃO:');
    logger.log(`  Categorias: ${results.categories.created} criadas, ${results.categories.updated} atualizadas, ${results.categories.errors} erros`);
    logger.log(`  Complementos: ${results.complement_groups.created} criados, ${results.complement_groups.updated} atualizados, ${results.complement_groups.errors} erros`);
    logger.log(`  Pratos: ${results.dishes.created} criados, ${results.dishes.updated} atualizados, ${results.dishes.errors} erros`);
    logger.log(`  Loja: ${results.store.updated ? '✅ Atualizada' : '❌ Não atualizada'}`);

    const totalErrors = results.dishes.errors + results.categories.errors + results.complement_groups.errors;
    
    if (totalErrors === 0) {
      logger.log('✅ Importação concluída com sucesso!');
    } else {
      logger.log(`⚠️ Importação concluída com ${totalErrors} erros`);
    }

    res.json({
      success: true,
      message: 'Importação concluída',
      results
    });

  } catch (error) {
    logger.error('❌ Erro fatal na importação:', error);
    res.status(500).json({ 
      error: 'Erro ao importar backup: ' + error.message 
    });
  }
});

/**
 * POST /api/subscriber-backup/validate
 * Valida arquivo de backup antes de importar
 */
router.post('/validate', async (req, res) => {
  try {
    const { backupData } = req.body;
    
    if (!backupData || !backupData.data) {
      return res.status(400).json({ 
        valid: false,
        error: 'Arquivo de backup inválido',
        details: 'Estrutura esperada: { data: { dishes, categories, complement_groups, store } }'
      });
    }

    const { data } = backupData;
    const validation = {
      valid: true,
      warnings: [],
      stats: {
        dishes: Array.isArray(data.dishes) ? data.dishes.length : 0,
        categories: Array.isArray(data.categories) ? data.categories.length : 0,
        complement_groups: Array.isArray(data.complement_groups) ? data.complement_groups.length : 0,
        has_store: !!data.store
      }
    };

    // Verificar campos obrigatórios
    if (data.dishes && Array.isArray(data.dishes)) {
      const dishesWithoutName = data.dishes.filter(d => !d.name);
      if (dishesWithoutName.length > 0) {
        validation.warnings.push(`${dishesWithoutName.length} pratos sem nome serão ignorados`);
      }
    }

    if (data.categories && Array.isArray(data.categories)) {
      const categoriesWithoutName = data.categories.filter(c => !c.name);
      if (categoriesWithoutName.length > 0) {
        validation.warnings.push(`${categoriesWithoutName.length} categorias sem nome serão ignoradas`);
      }
    }

    // Avisos gerais
    if (validation.stats.dishes === 0 && validation.stats.categories === 0) {
      validation.warnings.push('Nenhum dado encontrado para importar');
    }

    if (backupData.subscriber && backupData.subscriber.email) {
      validation.warnings.push(`Backup original de: ${backupData.subscriber.email}`);
    }

    res.json(validation);

  } catch (error) {
    res.status(500).json({ 
      valid: false,
      error: 'Erro ao validar backup: ' + error.message 
    });
  }
});

export default router;
