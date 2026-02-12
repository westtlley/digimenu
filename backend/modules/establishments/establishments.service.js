/**
 * Establishments Service - Lógica de negócio de estabelecimentos/assinantes
 * Centraliza toda a lógica de gerenciamento de estabelecimentos
 */

import * as repo from '../../db/repository.js';
import { logger } from '../../utils/logger.js';
import { getPlanInfo } from '../../utils/plans.js';
import { generatePasswordTokenForSubscriber } from '../auth/auth.service.js';
import { isValidPlan, normalizeSlug, canEditEstablishment } from './establishments.utils.js';
import { usePostgreSQL, FRONTEND_URL, getDb, getSaveDatabaseDebounced } from '../../config/appConfig.js';

/**
 * Lista todos os assinantes (apenas master)
 */
export async function listSubscribers() {
  const db = getDb();
  let subscribers = [];
  if (usePostgreSQL) {
    subscribers = await repo.listSubscribers();
  } else if (db?.subscribers) {
    subscribers = db.subscribers;
  }

  // Garantir que todos os assinantes retornados têm setup_url se tiverem token
  const subscribersWithTokens = subscribers.map(sub => {
    if (!sub.setup_url && sub.password_token) {
      const baseUrl = FRONTEND_URL || 'http://localhost:5173';
      sub.setup_url = `${baseUrl}/definir-senha?token=${sub.password_token}`;
    }
    return sub;
  });

  return subscribersWithTokens;
}

/**
 * Cria um novo assinante
 */
export async function createSubscriber(subscriberData) {
  if (!subscriberData?.email || String(subscriberData.email).trim() === '') {
    throw new Error('Email é obrigatório');
  }

  // Validar plano
  if (subscriberData.plan && !isValidPlan(subscriberData.plan)) {
    throw new Error(`Plano inválido: ${subscriberData.plan}. Planos válidos: free, basic, pro, ultra, admin, custom`);
  }

  // Se for plano custom, garantir que tem permissões definidas
  if (subscriberData.plan === 'custom' && (!subscriberData.permissions || Object.keys(subscriberData.permissions).length === 0)) {
    throw new Error('Plano custom requer permissões definidas');
  }

  logger.log('📝 Criando assinante:', {
    email: subscriberData.email,
    plan: subscriberData.plan,
    hasPermissions: !!subscriberData.permissions
  });

  const db = getDb();
  const saveDatabaseDebounced = getSaveDatabaseDebounced();
  let subscriber;
  if (usePostgreSQL) {
    subscriber = await repo.createSubscriber(subscriberData);
  } else {
    // Fallback JSON - apenas para desenvolvimento
    if (!db || !db.subscribers) {
      throw new Error('Banco de dados não inicializado');
    }

    // Verificar se já existe
    const existingIndex = db.subscribers.findIndex(s => s.email === subscriberData.email);

    const slug = normalizeSlug(subscriberData.slug);
    const linked = (subscriberData.linked_user_email != null && String(subscriberData.linked_user_email || '').trim())
      ? String(subscriberData.linked_user_email).trim()
      : null;

    const newSub = {
      id: existingIndex >= 0 ? db.subscribers[existingIndex].id : Date.now().toString(),
      email: subscriberData.email,
      name: subscriberData.name,
      plan: subscriberData.plan || 'basic',
      status: subscriberData.status || 'active',
      expires_at: subscriberData.expires_at || null,
      permissions: subscriberData.permissions || {},
      whatsapp_auto_enabled: subscriberData.whatsapp_auto_enabled !== undefined ? subscriberData.whatsapp_auto_enabled : true,
      slug,
      linked_user_email: linked,
      created_at: existingIndex >= 0 ? db.subscribers[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Atualizar existente
      db.subscribers[existingIndex] = newSub;
    } else {
      // Criar novo
      db.subscribers.push(newSub);
    }

    if (saveDatabaseDebounced) saveDatabaseDebounced(db);
    subscriber = newSub;
  }

  // Gerar token de senha automaticamente para novos assinantes
  let passwordTokenData = null;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'establishments.service.js:105',message:'[H3] Starting password token generation',data:{subscriberEmail:subscriber.email,subscriberId:subscriber.id,isNewSubscriber:!subscriberData.id},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    const isNewSubscriber = !subscriberData.id; // Se não tem ID, é novo

    if (isNewSubscriber) {
      passwordTokenData = generatePasswordTokenForSubscriber(
        subscriber.email,
        subscriber.id || subscriber.email
      );

      // Atualizar assinante com token (não bloqueante - executa em background)
      if (usePostgreSQL) {
        // Executar em background sem bloquear a resposta
        (async () => {
          try {
            const { query } = await import('../../db/postgres.js');
            const identifier = subscriber.id || subscriber.email;
            if (identifier) {
              const whereClause = subscriber.id ? 'WHERE id = $3' : 'WHERE email = $3';
              await query(
                `UPDATE subscribers SET password_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP ${whereClause}`,
                [passwordTokenData.token, passwordTokenData.expires_at, identifier]
              );
              logger.log('💾 [createSubscriber] Token salvo no PostgreSQL para:', subscriber.email);
            }
          } catch (error) {
            logger.warn('⚠️ [createSubscriber] Erro ao salvar token (não crítico):', error.message);
          }
        })();
        // Não aguardar - continua imediatamente
      } else if (db && db.subscribers) {
        const subIndex = db.subscribers.findIndex(s =>
          s.email === subscriber.email || (subscriber.id && (s.id === subscriber.id || s.id === String(subscriber.id)))
        );
        if (subIndex >= 0) {
          db.subscribers[subIndex].password_token = passwordTokenData.token;
          db.subscribers[subIndex].token_expires_at = passwordTokenData.expires_at;
          db.subscribers[subIndex].updated_at = new Date().toISOString();

          subscriber.password_token = passwordTokenData.token;
          subscriber.token_expires_at = passwordTokenData.expires_at;

          logger.log('💾 [createSubscriber] Token salvo no JSON para:', subscriber.email);

          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
        } else {
          logger.warn('⚠️ [createSubscriber] Assinante não encontrado após criação:', subscriber.email);
        }
      }

      logger.log('🔑 Token de senha gerado automaticamente para:', subscriber.email);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'establishments.service.js:159',message:'[H3] Password token generated successfully',data:{subscriberEmail:subscriber.email},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
  } catch (tokenError) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/4f86e4d7-f8a1-4c85-8a5d-50b822226133',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'establishments.service.js:162',message:'[H3] Error generating password token',data:{errorMessage:tokenError.message},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    logger.warn('⚠️ Erro ao gerar token de senha (não crítico):', tokenError.message);
    // Não falhar a criação do assinante se o token falhar
  }

  // Adicionar setup_url se tiver token
  if (passwordTokenData) {
    subscriber.setup_url = passwordTokenData.setup_url;
    subscriber.password_token = passwordTokenData.token;
    subscriber.token_expires_at = passwordTokenData.expires_at;
  } else if (subscriber.password_token) {
    const baseUrl = FRONTEND_URL || 'http://localhost:5173';
    subscriber.setup_url = `${baseUrl}/definir-senha?token=${subscriber.password_token}`;
  }

  return subscriber;
}

/**
 * Atualiza um assinante existente
 */
export async function updateSubscriber(id, updateData, currentUser) {
  const db = getDb();
  const saveDatabaseDebounced = getSaveDatabaseDebounced();
  const idVal = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;

  // Assinante (dono) só pode alterar o próprio — campos permitidos: name, slug, phone, cnpj_cpf, notes
  if (!currentUser?.is_master) {
    let sub = null;
    if (usePostgreSQL && repo.getSubscriberById) {
      sub = await repo.getSubscriberById(idVal);
    } else if (db?.subscribers) {
      sub = db.subscribers.find(s => s.id == idVal || String(s.id) === String(idVal));
    }
    if (!sub) {
      throw new Error('Assinante não encontrado');
    }
    if (!canEditEstablishment(currentUser, sub.email)) {
      throw new Error('Só é possível editar seu próprio link');
    }
    const allowedForOwner = ['name', 'slug', 'phone', 'cnpj_cpf', 'notes'];
    const filtered = {};
    for (const key of allowedForOwner) {
      if (updateData[key] !== undefined) filtered[key] = updateData[key];
    }
    updateData = filtered;
  }

  let updated;
  if (usePostgreSQL) {
    updated = await repo.updateSubscriber(idVal, updateData);
  } else if (db && db.subscribers) {
    const idx = db.subscribers.findIndex(s => s.id == idVal || String(s.id) === String(idVal));
    if (idx === -1) {
      throw new Error('Assinante não encontrado');
    }
    const existing = db.subscribers[idx];
    const toMerge = { ...updateData };
    if (updateData.send_whatsapp_commands !== undefined) {
      toMerge.whatsapp_auto_enabled = !!updateData.send_whatsapp_commands;
    }
    const merged = { ...existing, ...toMerge, id: existing.id, updated_at: new Date().toISOString() };
    db.subscribers[idx] = merged;
    if (typeof saveDatabaseDebounced === 'function') saveDatabaseDebounced(db);
    updated = merged;
  } else {
    throw new Error('Assinante não encontrado');
  }

  if (!updated) {
    throw new Error('Assinante não encontrado');
  }

  const out = { ...updated, send_whatsapp_commands: updated.whatsapp_auto_enabled };
  logger.log('✅ [PUT /subscribers/:id] Assinante atualizado:', id);
  return out;
}

/**
 * Deleta um assinante por slug
 */
export async function deleteSubscriberBySlug(slug) {
  if (!usePostgreSQL) {
    throw new Error('Deleção de subscriber requer PostgreSQL');
  }

  const { query } = await import('../../db/postgres.js');

  // 1. Buscar subscriber pelo slug
  const subscriberResult = await query(
    'SELECT * FROM subscribers WHERE slug = $1',
    [slug]
  );

  if (subscriberResult.rows.length === 0) {
    return {
      success: false,
      message: `Nenhum subscriber encontrado com o slug "${slug}"`,
      slug
    };
  }

  const subscriber = subscriberResult.rows[0];
  logger.log(`⚠️ Subscriber encontrado:`, subscriber);

  // 2. Deletar todas as entidades do subscriber
  logger.log(`  → Deletando entidades do subscriber ${subscriber.email}...`);
  const entitiesResult = await query(
    'DELETE FROM entities WHERE subscriber_email = $1',
    [subscriber.email]
  );
  logger.log(`  ✓ ${entitiesResult.rowCount} entidades deletadas`);

  // 3. Deletar o subscriber
  logger.log(`  → Deletando subscriber ${subscriber.email}...`);
  await query(
    'DELETE FROM subscribers WHERE email = $1',
    [subscriber.email]
  );
  logger.log(`  ✓ Subscriber deletado`);

  logger.log('✅ Deleção concluída!');

  return {
    success: true,
    message: `Subscriber "${subscriber.name}" deletado com sucesso!`,
    deleted_subscriber: {
      email: subscriber.email,
      name: subscriber.name,
      slug: subscriber.slug,
      plan: subscriber.plan,
      status: subscriber.status
    },
    entities_deleted: entitiesResult.rowCount
  };
}

/**
 * Obtém informações de um plano
 */
export function getPlanInfoData(plan) {
  return getPlanInfo(plan);
}

/**
 * Obtém lista de planos disponíveis
 */
export async function getAvailablePlans() {
  const { getAvailablePlans } = await import('../../utils/plans.js');
  const plans = getAvailablePlans();
  return plans.map(plan => getPlanInfo(plan));
}
