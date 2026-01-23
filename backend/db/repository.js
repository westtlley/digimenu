import { query } from './postgres.js';

/**
 * Repositório genérico para entidades
 * Suporta multi-tenancy com isolamento por subscriber_email
 */

// Obter subscriber_email do usuário atual
// Master em modo suporte: user._contextForSubscriber = email do assinante
function getSubscriberEmail(user) {
  if (user?._contextForSubscriber && user?.is_master) {
    return user._contextForSubscriber;
  }
  if (user?.is_master) {
    return null; // Master só vê seus próprios (subscriber_email IS NULL)
  }
  return user?.subscriber_email || user?.email;
}

/**
 * Listar entidades de um assinante por subscriber_email (usado em getFullSubscriberProfile).
 * Considera: coluna subscriber_email e, se NULL, data->>'owner_email' (legado).
 */
export async function listEntitiesForSubscriber(entityType, subscriberEmail, orderBy = null) {
  try {
    let sql = `
      SELECT id, data, created_at, updated_at
      FROM entities
      WHERE entity_type = $1
        AND (
          subscriber_email = $2
          OR (subscriber_email IS NOT NULL AND LOWER(TRIM(subscriber_email)) = LOWER(TRIM($2)))
          OR (subscriber_email IS NULL AND (data->>'owner_email') = $2)
        )
    `;
    const params = [entityType, subscriberEmail];
    if (orderBy) {
      const direction = orderBy.startsWith('-') ? 'DESC' : 'ASC';
      const field = orderBy.replace(/^-/, '');
      sql += ` ORDER BY data->>$${params.length + 1} ${direction} NULLS LAST`;
      params.push(field);
    } else {
      sql += ` ORDER BY created_at DESC`;
    }
    const result = await query(sql, params);
    return result.rows.map(row => ({
      id: row.id.toString(),
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error) {
    console.error(`Erro ao listar ${entityType} para assinante:`, error);
    throw error;
  }
}

// Listar entidades com paginação
export async function listEntities(entityType, filters = {}, orderBy = null, user = null, pagination = {}) {
  try {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;
    const subscriberEmail = getSubscriberEmail(user);
    
    // Query principal com paginação
    let sql = `
      SELECT id, data, created_at, updated_at
      FROM entities
      WHERE entity_type = $1
    `;
    const params = [entityType];
    
    // Filtro por assinante (multi-tenancy)
    if (subscriberEmail) {
      sql += ` AND subscriber_email = $${params.length + 1}`;
      params.push(subscriberEmail);
    } else if (user?.is_master) {
      // Master: apenas seus próprios (subscriber_email IS NULL)
      sql += ` AND subscriber_email IS NULL`;
    } else {
      sql += ` AND subscriber_email IS NULL`;
    }
    
    // Aplicar filtros do JSONB
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value], index) => {
        if (value === 'null' || value === null) {
          sql += ` AND (data->>$${params.length + 1} IS NULL OR data->>$${params.length + 1} = 'null')`;
          params.push(key);
        } else {
          sql += ` AND data->>$${params.length + 1} = $${params.length + 2}`;
          params.push(key, String(value));
        }
      });
    }
    
    // Query de contagem (para total)
    let countSql = `
      SELECT COUNT(*) as total
      FROM entities
      WHERE entity_type = $1
    `;
    const countParams = [entityType];
    
    if (subscriberEmail) {
      countSql += ` AND subscriber_email = $${countParams.length + 1}`;
      countParams.push(subscriberEmail);
    } else if (user?.is_master) {
      countSql += ` AND subscriber_email IS NULL`;
    } else {
      countSql += ` AND subscriber_email IS NULL`;
    }
    
    // Aplicar mesmos filtros na contagem
    if (Object.keys(filters).length > 0) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value === 'null' || value === null) {
          countSql += ` AND (data->>$${countParams.length + 1} IS NULL)`;
          countParams.push(key);
        } else {
          countSql += ` AND data->>$${countParams.length + 1} = $${countParams.length + 2}`;
          countParams.push(key, String(value));
        }
      });
    }
    
    // Ordenação
    if (orderBy) {
      const direction = orderBy.startsWith('-') ? 'DESC' : 'ASC';
      const field = orderBy.replace(/^-/, '');
      sql += ` ORDER BY data->>$${params.length + 1} ${direction}`;
      params.push(field);
    } else {
      sql += ` ORDER BY created_at DESC`;
    }
    
    // ✅ PAGINAÇÃO
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    // Executar queries em paralelo
    const [result, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Converter JSONB para objetos normais
    const items = result.rows.map(row => ({
      id: row.id.toString(),
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    
    // Retornar com paginação
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error(`Erro ao listar ${entityType}:`, error);
    throw error;
  }
}

// Obter entidade por ID
export async function getEntityById(entityType, id, user = null) {
  try {
    const subscriberEmail = getSubscriberEmail(user);
    
    let sql = `
      SELECT id, data, created_at, updated_at
      FROM entities
      WHERE entity_type = $1 AND id = $2
    `;
    const params = [entityType, parseInt(id)];
    
    if (subscriberEmail) {
      sql += ` AND subscriber_email = $${params.length + 1}`;
      params.push(subscriberEmail);
    } else if (user?.is_master) {
      sql += ` AND subscriber_email IS NULL`;
    } else {
      sql += ` AND subscriber_email IS NULL`;
    }
    
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id.toString(),
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error(`Erro ao obter ${entityType} ${id}:`, error);
    throw error;
  }
}

// Criar entidade
// options.forSubscriberEmail: força subscriber_email na row (quando assinante e temos subscriber)
export async function createEntity(entityType, data, user = null, options = {}) {
  try {
    const subscriberEmail = options.forSubscriberEmail ?? getSubscriberEmail(user);
    
    const sql = `
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ($1, $2, $3)
      RETURNING id, data, created_at, updated_at
    `;
    
    const result = await query(sql, [
      entityType,
      JSON.stringify(data),
      subscriberEmail
    ]);
    
    const row = result.rows[0];
    return {
      id: row.id.toString(),
      ...data,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error(`Erro ao criar ${entityType}:`, error);
    throw error;
  }
}

// Atualizar entidade
export async function updateEntity(entityType, id, data, user = null) {
  try {
    const subscriberEmail = getSubscriberEmail(user);
    
    // Buscar entidade existente
    const existing = await getEntityById(entityType, id, user);
    if (!existing) {
      throw new Error('Entidade não encontrada');
    }
    
    // Mesclar dados
    const updatedData = {
      ...existing,
      ...data,
      id: existing.id // Manter ID original
    };
    delete updatedData.created_at;
    delete updatedData.updated_at;
    
    const sql = `
      UPDATE entities
      SET data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE entity_type = $2 AND id = $3
      ${subscriberEmail ? `AND subscriber_email = $4` : 'AND (subscriber_email = $4 OR subscriber_email IS NULL)'}
      RETURNING id, data, created_at, updated_at
    `;
    
    const params = [
      JSON.stringify(updatedData),
      entityType,
      parseInt(id)
    ];
    
    if (subscriberEmail) {
      params.push(subscriberEmail);
    } else {
      params.push(null);
    }
    
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      throw new Error('Entidade não encontrada ou sem permissão');
    }
    
    const row = result.rows[0];
    return {
      id: row.id.toString(),
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error(`Erro ao atualizar ${entityType} ${id}:`, error);
    throw error;
  }
}

// Deletar entidade
export async function deleteEntity(entityType, id, user = null) {
  try {
    const subscriberEmail = getSubscriberEmail(user);
    
    let sql = `
      DELETE FROM entities
      WHERE entity_type = $1 AND id = $2
    `;
    const params = [entityType, parseInt(id)];
    
    if (subscriberEmail) {
      sql += ` AND subscriber_email = $3`;
      params.push(subscriberEmail);
    } else {
      sql += ` AND subscriber_email IS NULL`;
    }
    
    const result = await query(sql, params);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Erro ao deletar ${entityType} ${id}:`, error);
    throw error;
  }
}

// Criar múltiplas entidades
export async function createEntitiesBulk(entityType, items, user = null) {
  try {
    const subscriberEmail = getSubscriberEmail(user);
    
    if (items.length === 0) {
      return [];
    }
    
    const values = items.map((item, index) => {
      const baseIndex = index * 3;
      return `($1, $${baseIndex + 2}, $${baseIndex + 3})`;
    }).join(', ');
    
    const params = [entityType];
    items.forEach(item => {
      params.push(JSON.stringify(item), subscriberEmail);
    });
    
    const sql = `
      INSERT INTO entities (entity_type, data, subscriber_email)
      VALUES ${values}
      RETURNING id, data, created_at, updated_at
    `;
    
    const result = await query(sql, params);
    
    return result.rows.map(row => ({
      id: row.id.toString(),
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error) {
    console.error(`Erro ao criar ${entityType} em bulk:`, error);
    throw error;
  }
}

// =======================
// USERS
// =======================

export async function getUserByEmail(email) {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function createUser(userData) {
  const result = await query(
    `INSERT INTO users (email, full_name, password, is_master, role, subscriber_email, google_id, google_photo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userData.email,
      userData.full_name,
      userData.password || null,
      userData.is_master || false,
      userData.role || 'user',
      userData.subscriber_email || null,
      userData.google_id || null,
      userData.google_photo || null
    ]
  );
  return result.rows[0];
}

export async function updateUser(id, userData) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (userData.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(userData.email);
  }
  if (userData.full_name !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(userData.full_name);
  }
  if (userData.password !== undefined) {
    updates.push(`password = $${paramIndex++}`);
    values.push(userData.password);
  }
  if (userData.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    values.push(userData.role);
  }
  if (userData.google_id !== undefined) {
    updates.push(`google_id = $${paramIndex++}`);
    values.push(userData.google_id);
  }
  if (userData.google_photo !== undefined) {
    updates.push(`google_photo = $${paramIndex++}`);
    values.push(userData.google_photo);
  }
  if (userData.profile_role !== undefined) {
    updates.push(`profile_role = $${paramIndex++}`);
    values.push(userData.profile_role);
  }
  if (userData.subscriber_email !== undefined) {
    updates.push(`subscriber_email = $${paramIndex++}`);
    values.push(userData.subscriber_email);
  }

  if (updates.length === 0) {
    return await getUserById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, values);
  return result.rows[0] || null;
}

/** Lista colaboradores (usuários com profile_role) de um assinante */
export async function listColaboradores(ownerEmail) {
  const result = await query(
    `SELECT id, email, full_name, profile_role, created_at, updated_at
     FROM users
     WHERE LOWER(TRIM(subscriber_email)) = LOWER(TRIM($1)) AND profile_role IS NOT NULL
     ORDER BY full_name`,
    [ownerEmail]
  );
  return result.rows;
}

/** Remove colaborador (usuário com profile_role do assinante) */
export async function deleteColaborador(id, ownerEmail) {
  const result = await query(
    `DELETE FROM users
     WHERE id = $1 AND LOWER(TRIM(subscriber_email)) = LOWER(TRIM($2)) AND profile_role IS NOT NULL
     RETURNING id`,
    [id, ownerEmail]
  );
  return (result.rows[0] && result.rows[0].id) != null;
}

// =======================
// SUBSCRIBERS
// =======================

export async function listSubscribers() {
  const result = await query('SELECT * FROM subscribers ORDER BY created_at DESC');
  return result.rows;
}

export async function getSubscriberByEmail(email) {
  const result = await query(
    'SELECT * FROM subscribers WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

export async function createSubscriber(subscriberData) {
  try {
    console.log('📝 [REPOSITORY] createSubscriber chamado com:', {
      email: subscriberData.email,
      name: subscriberData.name,
      plan: subscriberData.plan,
      hasPermissions: !!subscriberData.permissions
    });
    
    // Garantir que permissions seja um objeto válido
    let permissions = subscriberData.permissions || {};
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch (e) {
        console.warn('⚠️ Permissões inválidas, usando objeto vazio:', e);
        permissions = {};
      }
    }
    
    // Preparar valores
    const email = subscriberData.email;
    const name = subscriberData.name;
    const plan = subscriberData.plan || 'basic';
    const status = subscriberData.status || 'active';
    const expires_at = subscriberData.expires_at || null;
    const permissionsJson = JSON.stringify(permissions);
    const whatsapp_auto_enabled = subscriberData.whatsapp_auto_enabled !== undefined ? subscriberData.whatsapp_auto_enabled : true;
    
    console.log('📝 [REPOSITORY] Valores preparados:', {
      email,
      name,
      plan,
      status,
      expires_at,
      permissions: permissionsJson,
      whatsapp_auto_enabled
    });
    
    // Usar ON CONFLICT para lidar com emails duplicados (upsert)
    const result = await query(
      `INSERT INTO subscribers (email, name, plan, status, expires_at, permissions, whatsapp_auto_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         plan = EXCLUDED.plan,
         status = EXCLUDED.status,
         expires_at = EXCLUDED.expires_at,
         permissions = EXCLUDED.permissions,
         whatsapp_auto_enabled = EXCLUDED.whatsapp_auto_enabled,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        email,
        name,
        plan,
        status,
        expires_at,
        permissionsJson, // JÁ CONVERTIDO PARA JSON
        whatsapp_auto_enabled
      ]
    );
    
    console.log('✅ [REPOSITORY] Assinante criado com sucesso:', result.rows[0]?.id || result.rows[0]?.email);
    return result.rows[0];
  } catch (error) {
    console.error('❌ [REPOSITORY] Erro em createSubscriber:', error);
    console.error('❌ [REPOSITORY] Código do erro:', error.code);
    console.error('❌ [REPOSITORY] Mensagem do erro:', error.message);
    console.error('❌ [REPOSITORY] Detalhes do erro:', error.detail);
    console.error('❌ [REPOSITORY] Stack trace:', error.stack);
    throw error;
  }
}

export async function updateSubscriber(emailOrId, subscriberData) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (subscriberData.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(subscriberData.name);
  }
  if (subscriberData.plan !== undefined) {
    updates.push(`plan = $${paramIndex++}`);
    values.push(subscriberData.plan);
  }
  if (subscriberData.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(subscriberData.status);
  }
  if (subscriberData.expires_at !== undefined) {
    updates.push(`expires_at = $${paramIndex++}`);
    values.push(subscriberData.expires_at);
  }
  if (subscriberData.permissions !== undefined) {
    updates.push(`permissions = $${paramIndex++}`);
    values.push(JSON.stringify(subscriberData.permissions));
  }
  if (subscriberData.send_whatsapp_commands !== undefined) {
    updates.push(`whatsapp_auto_enabled = $${paramIndex++}`);
    values.push(!!subscriberData.send_whatsapp_commands);
  } else if (subscriberData.whatsapp_auto_enabled !== undefined) {
    updates.push(`whatsapp_auto_enabled = $${paramIndex++}`);
    values.push(subscriberData.whatsapp_auto_enabled);
  }

  if (updates.length === 0) {
    // Se não há updates, apenas retornar o assinante
    // Tentar por email primeiro, depois por ID
    const byEmail = await getSubscriberByEmail(emailOrId);
    if (byEmail) return byEmail;
    
    const result = await query('SELECT * FROM subscribers WHERE id = $1', [emailOrId]);
    return result.rows[0] || null;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(emailOrId);

  // Tentar atualizar por email primeiro
  let sql = `
    UPDATE subscribers
    SET ${updates.join(', ')}
    WHERE email = $${paramIndex}
    RETURNING *
  `;

  let result = await query(sql, values);
  
  // Se não encontrou por email, tentar por ID
  if (result.rows.length === 0) {
    values[values.length - 1] = emailOrId; // Substituir o último valor
    sql = `
      UPDATE subscribers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    result = await query(sql, values);
  }

  return result.rows[0] || null;
}

export async function deleteSubscriber(emailOrId) {
  // Tentar deletar por email primeiro, depois por id
  let result = await query(
    'DELETE FROM subscribers WHERE email = $1 RETURNING *',
    [emailOrId]
  );
  
  if (result.rows.length === 0) {
    // Se não encontrou por email, tentar por id
    result = await query(
      'DELETE FROM subscribers WHERE id = $1 RETURNING *',
      [emailOrId]
    );
  }
  
  return result.rows[0] || null;
}

// =======================
// CUSTOMERS
// =======================

export async function listCustomers(subscriberEmail = null) {
  let sql = 'SELECT * FROM customers';
  const params = [];
  
  if (subscriberEmail) {
    sql += ' WHERE subscriber_email = $1';
    params.push(subscriberEmail);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const result = await query(sql, params);
  return result.rows;
}

export async function createCustomer(customerData, subscriberEmail = null) {
  const result = await query(
    `INSERT INTO customers (email, name, phone, address, complement, neighborhood, city, zipcode, subscriber_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      customerData.email,
      customerData.name,
      customerData.phone,
      customerData.address,
      customerData.complement,
      customerData.neighborhood,
      customerData.city,
      customerData.zipcode,
      subscriberEmail
    ]
  );
  return result.rows[0];
}

export async function updateCustomer(id, customerData) {
  const result = await query(
    `UPDATE customers
     SET email = $1, name = $2, phone = $3, address = $4, complement = $5, 
         neighborhood = $6, city = $7, zipcode = $8, updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [
      customerData.email,
      customerData.name,
      customerData.phone,
      customerData.address,
      customerData.complement,
      customerData.neighborhood,
      customerData.city,
      customerData.zipcode,
      id
    ]
  );
  return result.rows[0] || null;
}
