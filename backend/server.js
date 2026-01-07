import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de tratamento de erro de parsing JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Erro de parsing JSON:', err.message);
    return res.status(400).json({ 
      error: 'Erro ao processar JSON: ' + err.message,
      details: 'Verifique se os dados estão no formato correto'
    });
  }
  next();
});

// Banco de dados em memória (substitua por um banco real depois)
const db = {
  // Usuários cadastrados (whitelist de emails)
  users: [
    {
      id: '1',
      email: 'admin@digimenu.com',
      full_name: 'Administrador',
      is_master: true,
      subscriber_email: 'admin@digimenu.com',
      role: 'admin',
      password: 'admin123' // Em produção, usar hash
    }
  ],
  
  // Planos disponíveis
  plans: [
    {
      id: '1',
      slug: 'basic',
      name: 'Básico',
      description: 'Visualização de pedidos e cardápio básico',
      is_active: true,
      order: 1,
      permissions: {
        dashboard: ['view'],
        dishes: ['view'],
        orders: ['view']
      }
    },
    {
      id: '2',
      slug: 'pro',
      name: 'Pro',
      description: 'Gestão completa de cardápio e entregas',
      is_active: true,
      order: 2,
      permissions: {
        dashboard: ['view'],
        pdv: ['view', 'create', 'update'],
        gestor_pedidos: ['view', 'create', 'update', 'delete'],
        caixa: ['view', 'create', 'update'],
        whatsapp: ['view'],
        dishes: ['view', 'create', 'update', 'delete'],
        delivery_zones: ['view', 'create', 'update', 'delete'],
        coupons: ['view', 'create', 'update', 'delete'],
        promotions: ['view', 'create', 'update', 'delete'],
        theme: ['view', 'update'],
        store: ['view', 'update'],
        payments: ['view'],
        graficos: ['view'],
        orders: ['view', 'update'],
        history: ['view'],
        clients: ['view'],
        financial: ['view'],
        mais: ['view']
      }
    },
    {
      id: '3',
      slug: 'premium',
      name: 'Premium',
      description: 'Acesso total ao sistema',
      is_active: true,
      order: 3,
      permissions: {
        dashboard: ['view'],
        pdv: ['view', 'create', 'update'],
        gestor_pedidos: ['view', 'create', 'update', 'delete'],
        caixa: ['view', 'create', 'update'],
        whatsapp: ['view'],
        dishes: ['view', 'create', 'update', 'delete'],
        delivery_zones: ['view', 'create', 'update', 'delete'],
        coupons: ['view', 'create', 'update', 'delete'],
        promotions: ['view', 'create', 'update', 'delete'],
        theme: ['view', 'update'],
        store: ['view', 'update'],
        payments: ['view', 'update'],
        graficos: ['view'],
        orders: ['view', 'create', 'update', 'delete'],
        history: ['view'],
        clients: ['view', 'create', 'update', 'delete'],
        financial: ['view'],
        printer: ['view', 'update'],
        mais: ['view']
      }
    }
  ],
  
  // Assinantes (emails com acesso exclusivo)
  subscribers: [
    {
      id: '1',
      email: 'admin@digimenu.com',
      name: 'Administrador',
      plan: 'premium',
      status: 'active',
      expires_at: null, // null = sem expiração
      permissions: {},
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    }
  ],
  
  // Clientes (cadastro simples para acesso ao cardápio)
  customers: [],
  
  // Entidades dinâmicas
  entities: {},
  
  // Tokens de definição de senha (temporários)
  passwordTokens: {}
};

// Helper para obter token do header
const getToken = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
};

// Armazenar tokens ativos (em produção, usar Redis ou banco)
const activeTokens = {};

// ============================================
// SISTEMA DE MULTI-TENANCY (ISOLAMENTO POR ASSINANTE)
// ============================================
// Cada assinante possui seu próprio "banco de dados" isolado.
// Todos os dados criados por um assinante são automaticamente
// associados ao seu subscriber_id e não podem ser acessados por outros assinantes.
// 
// - Master admin (is_master = true): Pode acessar todos os dados (subscriber_id = null)
// - Assinantes normais: Só podem acessar seus próprios dados (filtrados por subscriber_id)
// - Clientes: Podem ser globais (subscriber_id = null) ou associados a um assinante
//
// Todas as rotas CRUD aplicam automaticamente o filtro de isolamento.
// ============================================

// Helper para obter subscriber_id do usuário
const getSubscriberId = (user) => {
  if (!user) return null;
  
  // Master admin não tem subscriber_id (pode acessar tudo)
  if (user.is_master) return null;
  
  // Se o usuário tem subscriber_email, buscar o subscriber_id
  if (user.subscriber_email) {
    const subscriber = db.subscribers.find(
      s => s.email.toLowerCase() === user.subscriber_email.toLowerCase()
    );
    return subscriber ? subscriber.id : null;
  }
  
  return null;
};

// Middleware de autenticação (simplificado)
const authenticate = (req, res, next) => {
  const token = getToken(req);
  
  // Se tiver token, verificar se está nos tokens ativos
  if (token && activeTokens[token]) {
    const userEmail = activeTokens[token];
    const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    
    if (user) {
      req.user = user;
      // Adicionar subscriber_id ao req para facilitar acesso
      req.subscriber_id = getSubscriberId(user);
      return next();
    }
  }
  
  // Tentar decodificar JWT token
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.users.find(u => u.email.toLowerCase() === decoded.email.toLowerCase());
      
      if (user) {
        req.user = user;
        req.subscriber_id = getSubscriberId(user);
        return next();
      }
    } catch (jwtError) {
      // Token inválido, continuar para verificação alternativa
      console.log('Token JWT inválido, tentando método alternativo');
    }
  }
  
  // Token fake - aceita qualquer token ou nenhum token para desenvolvimento
  // Em produção, valide o token JWT aqui
  if (token || process.env.NODE_ENV === 'development') {
    // Tentar encontrar o usuário pelo token (em produção, decodificar JWT)
    // Por enquanto, usar o primeiro usuário master ou o primeiro usuário
    const masterUser = db.users.find(u => u.is_master === true);
    req.user = masterUser || db.users[0] || null;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    req.subscriber_id = getSubscriberId(req.user);
    return next();
  }
  
  return res.status(401).json({ message: 'Não autenticado' });
};

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Verificar se o email está cadastrado (whitelist)
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ 
      message: 'Email não cadastrado. Entre em contato para solicitar acesso.' 
    });
  }
  
  // Verificar se o usuário tem senha definida
  if (!user.password) {
    return res.status(401).json({ 
      message: 'Senha não definida. Acesse o link de primeiro acesso para definir sua senha.',
      needs_password: true,
      has_token: !!user.password_token
    });
  }
  
  // Verificar senha com bcrypt ou texto plano (para migração)
  let isPasswordValid = false;
  
  // Verificar se a senha no banco é um hash bcrypt (começa com $2a$, $2b$ ou $2y$)
  if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$'))) {
    // Senha já está com hash bcrypt
    isPasswordValid = await bcrypt.compare(password, user.password);
  } else {
    // Senha ainda está em texto plano (migração)
    isPasswordValid = user.password === password;
    
    // Se a senha estiver correta, fazer hash e atualizar no banco
    if (isPasswordValid) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      user.password = hashedPassword;
      console.log('✅ Senha do usuário migrada para bcrypt:', user.email);
    }
  }
  
  if (!isPasswordValid) {
    return res.status(401).json({ 
      message: 'Senha incorreta' 
    });
  }
  
  // Gerar JWT token
  const token = jwt.sign(
    { 
      email: user.email, 
      id: user.id, 
      role: user.role,
      is_master: user.is_master || false
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Armazenar token ativo associado ao email do usuário
  activeTokens[token] = user.email;
  console.log('🔑 [BACKEND] Token gerado para:', user.email);
  console.log('🔑 [BACKEND] Token:', token);
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_master: user.is_master || false,
      subscriber_email: user.subscriber_email || user.email,
      role: user.role || 'user'
    }
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  // Buscar usuário completo do banco para garantir que is_master está presente
  const fullUser = db.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (fullUser) {
    res.json({
      id: fullUser.id,
      email: fullUser.email,
      full_name: fullUser.full_name,
      is_master: fullUser.is_master || false,
      subscriber_email: fullUser.subscriber_email || fullUser.email,
      role: fullUser.role || 'user'
    });
  } else {
    // Se não encontrar, retornar dados do req.user (pode ser de token)
    res.json({
      ...req.user,
      is_master: req.user.is_master || false
    });
  }
});

// POST /api/auth/set-password - Define senha usando token
app.post('/api/auth/set-password', async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    return res.status(400).json({ 
      error: 'Token e senha são obrigatórios' 
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'A senha deve ter no mínimo 6 caracteres' 
    });
  }
  
  // Verificar se o token existe e é válido
  const tokenData = db.passwordTokens[token];
  
  if (!tokenData) {
    return res.status(400).json({ 
      error: 'Token inválido ou expirado' 
    });
  }
  
  if (tokenData.used) {
    return res.status(400).json({ 
      error: 'Este token já foi utilizado' 
    });
  }
  
  // Verificar se o token expirou
  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  if (expiresAt < now) {
    return res.status(400).json({ 
      error: 'Token expirado. Solicite um novo token.' 
    });
  }
  
  // Encontrar o usuário
  const user = db.users.find(u => u.email.toLowerCase() === tokenData.email.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ 
      error: 'Usuário não encontrado' 
    });
  }
  
  // Hash da senha com bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  // Definir a senha com hash
  user.password = hashedPassword;
  user.password_token = null;
  
  // Marcar token como usado
  tokenData.used = true;
  
  console.log('✅ Senha definida para:', user.email);
  
  res.json({ 
    success: true, 
    message: 'Senha definida com sucesso! Você já pode fazer login.' 
  });
});

// POST /api/auth/generate-password-token - Gera novo token para definir senha
app.post('/api/auth/generate-password-token', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      error: 'Email é obrigatório' 
    });
  }
  
  // Verificar se o usuário existe
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(404).json({ 
      error: 'Usuário não encontrado' 
    });
  }
  
  // Gerar novo token
  const passwordToken = `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 dias
  
  db.passwordTokens[passwordToken] = {
    email: user.email,
    expires_at: tokenExpiry.toISOString(),
    used: false
  };
  
  user.password_token = passwordToken;
  
  console.log('🔑 Novo token gerado para:', user.email);
  
  res.json({ 
    success: true, 
    token: passwordToken,
    message: 'Token gerado com sucesso',
    expires_at: tokenExpiry.toISOString()
  });
});

// ============================================
// CRUD GENÉRICO DE ENTIDADES
// ============================================

// GET /api/entities/:entity - Lista ou filtra
app.get('/api/entities/:entity', authenticate, (req, res) => {
  const { entity } = req.params;
  const { order_by, ...filters } = req.query;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  // Suporte especial para Plan (não tem isolamento por tenant)
  if (entity === 'Plan') {
    let plans = [...db.plans];
    
    // Aplicar filtros
    if (Object.keys(filters).length > 0) {
      plans = plans.filter(plan => {
        return Object.keys(filters).every(key => {
          const filterValue = filters[key];
          const planValue = plan[key];
          return planValue === filterValue || planValue?.toString() === filterValue;
        });
      });
    }
    
    // Ordenar
    if (order_by) {
      const [field, direction] = order_by.startsWith('-') 
        ? [order_by.substring(1), 'desc'] 
        : [order_by, 'asc'];
      
      plans.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        if (direction === 'desc') {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });
    }
    
    return res.json(plans);
  }
  
  // Inicializa entidade se não existir
  if (!db.entities[entity]) {
    db.entities[entity] = [];
  }
  
  let items = [...db.entities[entity]];
  
  // ISOLAMENTO POR TENANT: Filtrar por subscriber_id
  if (isMaster) {
    // Master admin pode filtrar por subscriber_id específico via query parameter
    // Se fornecido subscriber_id na query, mostrar apenas dados desse assinante
    // Se não fornecido, mostrar todos os dados (comportamento padrão)
    if (filters.subscriber_id) {
      items = items.filter(item => item.subscriber_id === filters.subscriber_id);
      // Remover subscriber_id dos filtros para não aplicar novamente
      delete filters.subscriber_id;
    }
    // Se não tiver subscriber_id na query, mostrar todos (comportamento padrão do master)
  } else {
    // Assinantes normais: só podem ver seus próprios dados
    if (subscriber_id) {
      items = items.filter(item => item.subscriber_id === subscriber_id);
    } else {
      // Se não tiver subscriber_id, retornar array vazio
      items = [];
    }
  }
  
  // Aplica filtros adicionais
  if (Object.keys(filters).length > 0) {
    items = items.filter(item => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        const itemValue = item[key];
        
        // Suporte a filtro por ID
        if (key === 'id' && item.id) {
          return item.id === filterValue || item.id.toString() === filterValue;
        }
        
        // Filtro exato
        return itemValue === filterValue || itemValue?.toString() === filterValue;
      });
    });
  }
  
  // Ordena se especificado
  if (order_by) {
    const [field, direction] = order_by.startsWith('-') 
      ? [order_by.substring(1), 'desc'] 
      : [order_by, 'asc'];
    
    items.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      if (direction === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }
  
  res.json(items);
});

// GET /api/entities/:entity/:id - Obtém por ID
app.get('/api/entities/:entity/:id', authenticate, (req, res) => {
  const { entity, id } = req.params;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  if (!db.entities[entity]) {
    return res.status(404).json({ message: 'Entidade não encontrada' });
  }
  
  const item = db.entities[entity].find(e => e.id === id || e.id?.toString() === id);
  
  if (!item) {
    return res.status(404).json({ message: 'Item não encontrado' });
  }
  
  // ISOLAMENTO POR TENANT: Verificar se o item pertence ao subscriber_id
  if (!isMaster && subscriber_id && item.subscriber_id !== subscriber_id) {
    return res.status(403).json({ message: 'Acesso negado. Este item não pertence ao seu assinante.' });
  }
  
  // Se não for master e não tiver subscriber_id, negar acesso
  if (!isMaster && !subscriber_id) {
    return res.status(403).json({ message: 'Acesso negado. Usuário não possui assinante associado.' });
  }
  
  res.json(item);
});

// POST /api/entities/:entity - Cria novo
app.post('/api/entities/:entity', authenticate, (req, res) => {
  const { entity } = req.params;
  const data = req.body;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  // Inicializa entidade se não existir
  if (!db.entities[entity]) {
    db.entities[entity] = [];
  }
  
  // ISOLAMENTO POR TENANT: Associar subscriber_id automaticamente
  // Master admin pode criar sem subscriber_id (para dados globais)
  // Usuários normais devem ter subscriber_id
  if (!isMaster) {
    if (!subscriber_id) {
      return res.status(403).json({ 
        message: 'Acesso negado. Usuário não possui assinante associado.' 
      });
    }
    // Garantir que o subscriber_id seja o do usuário (prevenir manipulação)
    data.subscriber_id = subscriber_id;
  } else {
    // Master pode criar com ou sem subscriber_id
    // Se não fornecido, manter null (dados globais)
    if (!data.subscriber_id) {
      data.subscriber_id = null;
    }
  }
  
  // Gera ID se não fornecido
  if (!data.id) {
    data.id = `${entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Adiciona timestamps
  data.created_date = new Date().toISOString();
  data.updated_date = new Date().toISOString();
  
  db.entities[entity].push(data);
  
  console.log(`✅ [${entity}] Item criado com subscriber_id: ${data.subscriber_id || 'null (master)'}`);
  
  res.status(201).json(data);
});

// PUT /api/entities/:entity/:id - Atualiza
app.put('/api/entities/:entity/:id', authenticate, (req, res) => {
  const { entity, id } = req.params;
  const data = req.body;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  if (!db.entities[entity]) {
    return res.status(404).json({ message: 'Entidade não encontrada' });
  }
  
  const index = db.entities[entity].findIndex(e => e.id === id || e.id?.toString() === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Item não encontrado' });
  }
  
  const existing = db.entities[entity][index];
  
  // ISOLAMENTO POR TENANT: Verificar se o item pertence ao subscriber_id
  if (!isMaster && subscriber_id && existing.subscriber_id !== subscriber_id) {
    return res.status(403).json({ 
      message: 'Acesso negado. Este item não pertence ao seu assinante.' 
    });
  }
  
  // Se não for master e não tiver subscriber_id, negar acesso
  if (!isMaster && !subscriber_id) {
    return res.status(403).json({ 
      message: 'Acesso negado. Usuário não possui assinante associado.' 
    });
  }
  
  // Prevenir mudança de subscriber_id (exceto master)
  if (!isMaster && data.subscriber_id && data.subscriber_id !== existing.subscriber_id) {
    return res.status(403).json({ 
      message: 'Acesso negado. Não é permitido alterar o assinante do item.' 
    });
  }
  
  // Atualiza mantendo ID, timestamps e subscriber_id original
  db.entities[entity][index] = {
    ...existing,
    ...data,
    id: existing.id,
    subscriber_id: existing.subscriber_id, // Manter subscriber_id original
    created_date: existing.created_date,
    updated_date: new Date().toISOString()
  };
  
  res.json(db.entities[entity][index]);
});

// DELETE /api/entities/:entity/:id - Deleta
app.delete('/api/entities/:entity/:id', authenticate, (req, res) => {
  const { entity, id } = req.params;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  if (!db.entities[entity]) {
    return res.status(404).json({ message: 'Entidade não encontrada' });
  }
  
  const index = db.entities[entity].findIndex(e => e.id === id || e.id?.toString() === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Item não encontrado' });
  }
  
  const item = db.entities[entity][index];
  
  // ISOLAMENTO POR TENANT: Verificar se o item pertence ao subscriber_id
  if (!isMaster && subscriber_id && item.subscriber_id !== subscriber_id) {
    return res.status(403).json({ 
      message: 'Acesso negado. Este item não pertence ao seu assinante.' 
    });
  }
  
  // Se não for master e não tiver subscriber_id, negar acesso
  if (!isMaster && !subscriber_id) {
    return res.status(403).json({ 
      message: 'Acesso negado. Usuário não possui assinante associado.' 
    });
  }
  
  db.entities[entity].splice(index, 1);
  
  console.log(`🗑️ [${entity}] Item deletado (subscriber_id: ${item.subscriber_id || 'null'})`);
  
  res.json({ success: true, message: 'Item deletado' });
});

// POST /api/entities/:entity/bulk - Cria múltiplos
app.post('/api/entities/:entity/bulk', authenticate, (req, res) => {
  const { entity } = req.params;
  const { items } = req.body;
  const subscriber_id = req.subscriber_id;
  const isMaster = req.user?.is_master === true;
  
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'items deve ser um array' });
  }
  
  // Inicializa entidade se não existir
  if (!db.entities[entity]) {
    db.entities[entity] = [];
  }
  
  // ISOLAMENTO POR TENANT: Associar subscriber_id automaticamente
  if (!isMaster) {
    if (!subscriber_id) {
      return res.status(403).json({ 
        message: 'Acesso negado. Usuário não possui assinante associado.' 
      });
    }
  }
  
  const created = items.map(item => {
    if (!item.id) {
      item.id = `${entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Associar subscriber_id
    if (!isMaster) {
      item.subscriber_id = subscriber_id;
    } else {
      // Master pode criar com ou sem subscriber_id
      if (!item.subscriber_id) {
        item.subscriber_id = null;
      }
    }
    
    item.created_date = new Date().toISOString();
    item.updated_date = new Date().toISOString();
    db.entities[entity].push(item);
    return item;
  });
  
  console.log(`✅ [${entity}] ${created.length} itens criados em bulk (subscriber_id: ${subscriber_id || 'null (master)'})`);
  
  res.status(201).json(created);
});

// ============================================
// ROTAS DE FUNÇÕES
// ============================================

// POST /api/functions/:name - Invoca função
app.post('/api/functions/:name', authenticate, async (req, res) => {
  const { name } = req.params;
  let data = req.body;
  
  // Log para debug
  console.log('═══════════════════════════════════════');
  console.log('🔵 Função chamada:', name);
  console.log('🔵 URL completa:', req.originalUrl);
  console.log('🔵 Parâmetros:', req.params);
  console.log('🔵 Tipo do body:', typeof req.body);
  console.log('🔵 Body recebido:', JSON.stringify(req.body, null, 2));
  
  // Tratamento de erro de parsing JSON
  try {
    // Se data for string, tentar fazer parse
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        console.error('Erro ao fazer parse do body como string:', parseError);
        return res.status(400).json({ 
          error: 'Erro ao processar dados: ' + parseError.message,
          received: data
        });
      }
    }
    
    // Garantir que data seja um objeto
    if (!data || typeof data !== 'object') {
      data = {};
    }
  } catch (error) {
    console.error('Erro ao processar body:', error);
    return res.status(400).json({ 
      error: 'Erro ao processar dados: ' + error.message 
    });
  }
  
  // Funções mock - implemente suas funções aqui
  const functions = {
    // Função de teste
    test: () => ({
      data: { success: true, message: 'Função de teste executada' }
    }),
    updateStoreSettings: () => ({
      data: { success: true, message: 'Configurações atualizadas' }
    }),
    
    updateSubscriberPlan: () => ({
      data: { success: true, subscriber: { plan: data.plan || 'basic' } }
    }),
    
    checkSubscriptionStatus: () => {
      const email = data.user_email || req.user?.email;
      
      if (!email) {
        return {
          data: { 
            status: 'error', 
            message: 'Email não fornecido',
            subscriber: null 
          }
        };
      }
      
      // Verificar se o email está na lista de assinantes
      const subscriber = db.subscribers.find(
        s => s.email.toLowerCase() === email.toLowerCase()
      );
      
      if (subscriber) {
        // Verificar se está expirado
        if (subscriber.expires_at) {
          const expiresAt = new Date(subscriber.expires_at);
          const now = new Date();
          if (expiresAt < now) {
            subscriber.status = 'expired';
          }
        }
        
        return {
          data: { 
            status: 'success', 
            subscriber: {
              ...subscriber,
              isActive: subscriber.status === 'active'
            }
          }
        };
      }
      
      // Se não encontrou, verificar se o usuário é master
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user && user.is_master) {
        return {
          data: {
            status: 'success',
            subscriber: {
              email: user.email,
              name: user.full_name,
              plan: 'premium',
              status: 'active',
              permissions: {},
              isMaster: true
            }
          }
        };
      }
      
      return {
        data: { 
          status: 'not_found', 
          message: 'Email não possui assinatura ativa',
          subscriber: null 
        }
      };
    },
    
    createSubscriber: () => {
      // Apenas master pode criar assinantes
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem criar assinantes.' 
          }
        };
      }
      
      const planSlug = data.plan || 'basic';
      
      // Buscar permissões do plano
      const plan = db.plans.find(p => p.slug === planSlug);
      let permissions = data.permissions || {};
      
      // Se não for custom e não tiver permissões customizadas, usar as do plano
      if (planSlug !== 'custom' && plan && (!data.permissions || Object.keys(data.permissions).length === 0)) {
        permissions = JSON.parse(JSON.stringify(plan.permissions)); // Deep copy
      }
      
      // Validar email
      if (!data.email || !data.email.trim()) {
        return {
          data: { 
            error: 'Email é obrigatório.' 
          }
        };
      }
      
      const emailLower = data.email.trim().toLowerCase();
      
      const subscriber = {
        id: `sub_${Date.now()}`,
        email: emailLower,
        name: data.name || '',
        plan: planSlug,
        status: data.status || 'active',
        expires_at: data.expires_at || null,
        permissions: permissions,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };
      
      // Verificar se já existe
      const exists = db.subscribers.find(
        s => s.email.toLowerCase() === subscriber.email
      );
      
      if (exists) {
        return {
          data: { 
            error: 'Já existe um assinante com este email.' 
          }
        };
      }
      
      db.subscribers.push(subscriber);
      
      console.log('✅ Assinante criado:', subscriber.email);
      console.log('📊 Total de assinantes:', db.subscribers.length);
      
      // Criar usuário automaticamente se não existir
      const userExists = db.users.find(
        u => u.email.toLowerCase() === subscriber.email
      );
      
      if (!userExists) {
        // Gerar token temporário para definição de senha (válido por 7 dias)
        const passwordToken = `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tokenExpiry = new Date();
        tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 dias
        
        db.passwordTokens[passwordToken] = {
          email: subscriber.email,
          expires_at: tokenExpiry.toISOString(),
          used: false
        };
        
        const newUser = {
          id: `user_${Date.now()}`,
          email: subscriber.email,
          full_name: subscriber.name,
          is_master: false,
          subscriber_email: subscriber.email,
          role: 'user',
          password: null, // Senha será definida no primeiro acesso
          password_token: passwordToken // Token para definir senha
        };
        db.users.push(newUser);
        console.log('✅ Usuário criado:', newUser.email);
        console.log('🔑 Token de senha gerado:', passwordToken);
      } else {
        // Se o usuário já existe mas não tem senha, gerar novo token
        const existingUser = db.users.find(u => u.email.toLowerCase() === subscriber.email.toLowerCase());
        if (existingUser && !existingUser.password) {
          const passwordToken = `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const tokenExpiry = new Date();
          tokenExpiry.setDate(tokenExpiry.getDate() + 7);
          
          db.passwordTokens[passwordToken] = {
            email: subscriber.email,
            expires_at: tokenExpiry.toISOString(),
            used: false
          };
          
          existingUser.password_token = passwordToken;
          console.log('🔑 Novo token de senha gerado para usuário existente:', passwordToken);
        }
      }
      
      // Buscar o usuário criado para obter o token
      const createdUser = db.users.find(u => u.email.toLowerCase() === subscriber.email.toLowerCase());
      const passwordToken = createdUser?.password_token || null;
      
      console.log('🔍 [BACKEND] Usuário criado encontrado:', createdUser ? 'Sim' : 'Não');
      console.log('🔍 [BACKEND] password_token:', passwordToken);
      
      // Construir URL (usar localhost:5173 para frontend em desenvolvimento)
      let setupUrl = null;
      if (passwordToken) {
        // Em desenvolvimento, usar localhost:5173 (frontend)
        // Em produção, usar o host da requisição ou variável de ambiente
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        setupUrl = `${frontendUrl}/definir-senha?token=${passwordToken}`;
        console.log('🔑 [BACKEND] Link de definição de senha gerado:', setupUrl);
      } else {
        console.warn('⚠️ [BACKEND] Token não foi gerado para o usuário');
      }
      
      // Retornar resposta no formato esperado
      const response = {
        data: { 
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name,
            plan: subscriber.plan,
            status: subscriber.status,
            expires_at: subscriber.expires_at,
            permissions: subscriber.permissions,
            created_date: subscriber.created_date,
            updated_date: subscriber.updated_date
          },
          success: true,
          message: 'Assinante criado com sucesso',
          password_token: passwordToken, // Token para definir senha
          setup_url: setupUrl // URL completa para definir senha
        }
      };
      
      console.log('📤 [BACKEND] Resposta completa:', JSON.stringify(response, null, 2));
      console.log('📤 [BACKEND] setup_url na resposta:', response.data.setup_url);
      
      return response;
    },
    
    updateSubscriber: () => {
      // Apenas master pode atualizar assinantes
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem atualizar assinantes.' 
          }
        };
      }
      
      const index = db.subscribers.findIndex(s => s.id === data.id);
      
      if (index === -1) {
        return {
          data: { 
            error: 'Assinante não encontrado.' 
          }
        };
      }
      
      const existingSubscriber = db.subscribers[index];
      const updateData = data.data || {};
      const newPlan = updateData.plan || existingSubscriber.plan;
      
      // Se o plano mudou e não for custom, atualizar permissões do plano
      let permissions = updateData.permissions || existingSubscriber.permissions;
      
      if (newPlan !== existingSubscriber.plan && newPlan !== 'custom') {
        const plan = db.plans.find(p => p.slug === newPlan);
        if (plan) {
          // Se não tiver permissões customizadas, usar as do novo plano
          if (!updateData.permissions || Object.keys(updateData.permissions).length === 0) {
            permissions = JSON.parse(JSON.stringify(plan.permissions)); // Deep copy
          }
        }
      }
      
      db.subscribers[index] = {
        ...existingSubscriber,
        ...updateData,
        permissions: permissions,
        updated_date: new Date().toISOString()
      };
      
      // Atualizar nome do usuário se mudou
      if (updateData.name && updateData.name !== existingSubscriber.name) {
        const userIndex = db.users.findIndex(u => u.email.toLowerCase() === existingSubscriber.email.toLowerCase());
        if (userIndex !== -1) {
          db.users[userIndex].full_name = updateData.name;
        }
      }
      
      return {
        data: { subscriber: db.subscribers[index] }
      };
    },
    
    deleteSubscriber: () => {
      // Apenas master pode deletar assinantes
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem deletar assinantes.' 
          }
        };
      }
      
      const index = db.subscribers.findIndex(s => s.id === data.id);
      
      if (index === -1) {
        return {
          data: { 
            error: 'Assinante não encontrado.' 
          }
        };
      }
      
      db.subscribers.splice(index, 1);
      
      return {
        data: { success: true, message: 'Assinante deletado' }
      };
    },
    
    getSubscribers: () => {
      // Apenas master pode ver todos os assinantes
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem ver assinantes.' 
          }
        };
      }
      
      console.log('📋 getSubscribers chamado. Total de assinantes:', db.subscribers.length);
      console.log('📋 Assinantes no banco:', JSON.stringify(db.subscribers, null, 2));
      
      // Adicionar informações de token de senha para cada assinante
      const subscribersWithTokens = db.subscribers.map(subscriber => {
        const user = db.users.find(u => u.email.toLowerCase() === subscriber.email.toLowerCase());
        let passwordToken = user?.password_token || null;
        let setupUrl = null;
        
        // Se não tiver token ou token expirado, gerar novo
        if (user && (!passwordToken || !db.passwordTokens[passwordToken] || db.passwordTokens[passwordToken].used)) {
          // Gerar novo token
          passwordToken = `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const tokenExpiry = new Date();
          tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 dias
          
          db.passwordTokens[passwordToken] = {
            email: subscriber.email,
            expires_at: tokenExpiry.toISOString(),
            used: false
          };
          
          user.password_token = passwordToken;
          console.log('🔑 Novo token gerado para assinante:', subscriber.email);
        }
        
        // Construir URL se tiver token válido
        if (passwordToken && db.passwordTokens[passwordToken] && !db.passwordTokens[passwordToken].used) {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          setupUrl = `${frontendUrl}/definir-senha?token=${passwordToken}`;
        }
        
        return {
          ...subscriber,
          password_token: passwordToken,
          setup_url: setupUrl,
          has_password: !!user?.password,
          token_expires_at: passwordToken && db.passwordTokens[passwordToken] 
            ? db.passwordTokens[passwordToken].expires_at 
            : null
        };
      });
      
      return {
        data: { subscribers: subscribersWithTokens }
      };
    },
    
    // Nova função: Gerar/regenerar token de senha para um assinante
    generatePasswordTokenForSubscriber: () => {
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem gerar tokens.' 
          }
        };
      }
      
      const { subscriber_id, email } = data;
      
      // Buscar assinante por ID ou email
      let subscriber = null;
      if (subscriber_id) {
        subscriber = db.subscribers.find(s => s.id === subscriber_id);
      } else if (email) {
        subscriber = db.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
      }
      
      if (!subscriber) {
        return {
          data: { 
            error: 'Assinante não encontrado.' 
          }
        };
      }
      
      // Buscar usuário
      const user = db.users.find(u => u.email.toLowerCase() === subscriber.email.toLowerCase());
      
      if (!user) {
        return {
          data: { 
            error: 'Usuário não encontrado para este assinante.' 
          }
        };
      }
      
      // Gerar novo token
      const passwordToken = `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 dias
      
      // Invalidar token antigo se existir
      if (user.password_token && db.passwordTokens[user.password_token]) {
        db.passwordTokens[user.password_token].used = true;
      }
      
      // Criar novo token
      db.passwordTokens[passwordToken] = {
        email: subscriber.email,
        expires_at: tokenExpiry.toISOString(),
        used: false
      };
      
      user.password_token = passwordToken;
      
      // Construir URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const setupUrl = `${frontendUrl}/definir-senha?token=${passwordToken}`;
      
      console.log('🔑 Token regenerado para assinante:', subscriber.email);
      
      return {
        data: {
          success: true,
          token: passwordToken,
          setup_url: setupUrl,
          expires_at: tokenExpiry.toISOString(),
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name
          }
        }
      };
    },
    
    // Nova função: Obter dados de uma entidade filtrados por assinante (apenas master)
    getSubscriberData: () => {
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem acessar esta função.' 
          }
        };
      }
      
      const { entity, subscriber_id } = data;
      
      if (!entity) {
        return {
          data: { 
            error: 'Parâmetro "entity" é obrigatório.' 
          }
        };
      }
      
      if (!subscriber_id) {
        return {
          data: { 
            error: 'Parâmetro "subscriber_id" é obrigatório.' 
          }
        };
      }
      
      // Verificar se o assinante existe
      const subscriber = db.subscribers.find(s => s.id === subscriber_id);
      if (!subscriber) {
        return {
          data: { 
            error: 'Assinante não encontrado.' 
          }
        };
      }
      
      // Inicializa entidade se não existir
      if (!db.entities[entity]) {
        db.entities[entity] = [];
      }
      
      // Filtrar dados do assinante
      const items = db.entities[entity].filter(item => item.subscriber_id === subscriber_id);
      
      console.log(`📊 [getSubscriberData] ${items.length} itens encontrados para ${entity} do assinante ${subscriber_id}`);
      
      return {
        data: { 
          items,
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name,
            plan: subscriber.plan,
            status: subscriber.status
          },
          entity,
          total: items.length
        }
      };
    },
    
    // Nova função: Obter estatísticas de um assinante (apenas master)
    getSubscriberStats: () => {
      if (!req.user?.is_master) {
        return {
          data: { 
            error: 'Acesso negado. Apenas administradores podem acessar esta função.' 
          }
        };
      }
      
      const { subscriber_id } = data;
      
      if (!subscriber_id) {
        return {
          data: { 
            error: 'Parâmetro "subscriber_id" é obrigatório.' 
          }
        };
      }
      
      // Verificar se o assinante existe
      const subscriber = db.subscribers.find(s => s.id === subscriber_id);
      if (!subscriber) {
        return {
          data: { 
            error: 'Assinante não encontrado.' 
          }
        };
      }
      
      // Contar itens por entidade
      const stats = {};
      const entityNames = Object.keys(db.entities);
      
      entityNames.forEach(entityName => {
        const items = db.entities[entityName].filter(item => item.subscriber_id === subscriber_id);
        stats[entityName] = items.length;
      });
      
      // Estatísticas de clientes
      const customers = db.customers.filter(c => c.subscriber_id === subscriber_id);
      stats.customers = customers.length;
      
      // Calcular totais
      const totalItems = Object.values(stats).reduce((sum, count) => sum + count, 0);
      
      console.log(`📊 [getSubscriberStats] Estatísticas do assinante ${subscriber_id}:`, stats);
      
      return {
        data: { 
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            name: subscriber.name,
            plan: subscriber.plan,
            status: subscriber.status
          },
          stats,
          total_items: totalItems
        }
      };
    },
    
    getPlans: () => {
      return {
        data: { plans: db.plans }
      };
    },
    
    getGoogleMapsRoute: () => ({
      data: {
        distance: '5.2 km',
        duration: '15 min',
        route: []
      }
    }),
    
    getFullSubscriberProfile: () => ({
      data: {
        subscriber: {
          email: data.email || req.user.email,
          plan: 'basic',
          status: 'active'
        }
      }
    }),
    
    syncUserSubscriberEmail: () => ({
      data: { success: true }
    }),
    
    diagnoseRLS: () => ({
      data: { issues: [] }
    }),
    
    fixRLSData: () => ({
      data: { success: true }
    }),
    
    trackPizzaCombination: () => ({
      data: { success: true }
    }),
    
    registerCustomer: async () => {
      // Cadastro completo de cliente com senha
      // Não requer autenticação - qualquer um pode se cadastrar como cliente
      
      // Validações obrigatórias
      if (!data.email || !data.email.trim()) {
        return {
          data: { 
            success: false,
            error: 'Email é obrigatório.' 
          }
        };
      }

      if (!data.name || !data.name.trim()) {
        return {
          data: { 
            success: false,
            error: 'Nome é obrigatório.' 
          }
        };
      }

      if (!data.birth_date) {
        return {
          data: { 
            success: false,
            error: 'Data de nascimento é obrigatória.' 
          }
        };
      }

      if (!data.phone || !data.phone.trim()) {
        return {
          data: { 
            success: false,
            error: 'Número de contato é obrigatório.' 
          }
        };
      }

      if (!data.address || !data.address.trim()) {
        return {
          data: { 
            success: false,
            error: 'Endereço é obrigatório.' 
          }
        };
      }

      if (!data.password || data.password.length < 6) {
        return {
          data: { 
            success: false,
            error: 'Senha é obrigatória e deve ter no mínimo 6 caracteres.' 
          }
        };
      }
      
      const emailLower = data.email.trim().toLowerCase();
      
      // Validar formato de email básico
      if (!emailLower.includes('@') || !emailLower.includes('.')) {
        return {
          data: { 
            success: false,
            error: 'Email inválido.' 
          }
        };
      }
      
      // Verificar se já existe um cliente com este email
      const existingCustomer = db.customers.find(
        c => c.email.toLowerCase() === emailLower
      );
      
      if (existingCustomer) {
        return {
          data: { 
            success: false,
            error: 'Este email já está cadastrado. Use a página de login para acessar.' 
          }
        };
      }
      
      // Verificar se o email já está cadastrado como assinante ou usuário
      const existingUser = db.users.find(
        u => u.email.toLowerCase() === emailLower
      );
      
      if (existingUser) {
        return {
          data: { 
            success: false,
            error: 'Este email já está cadastrado como assinante. Use a página de login para acessar.' 
          }
        };
      }
      
      // Hash da senha com bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);
      
      // Criar novo cliente
      // Clientes podem ser associados a um subscriber_id se criados por um assinante
      // Se criados diretamente (cadastro público), subscriber_id será null
      const subscriber_id = data.subscriber_id || null;
      
      const newCustomer = {
        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: emailLower,
        name: data.name.trim(),
        birth_date: data.birth_date,
        phone: data.phone.replace(/\D/g, ''), // Remove formatação
        address: data.address.trim(),
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null, // Remove formatação
        password: hashedPassword, // Senha com hash bcrypt
        subscriber_id: subscriber_id, // Associar ao assinante se fornecido
        loyalty_points: 0,
        total_orders: 0,
        total_spent: 0,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        last_order_date: null,
        google_id: null, // Para login com Google no futuro
        is_active: true
      };
      
      db.customers.push(newCustomer);
      
      // Criar usuário também para permitir login
      const newUser = {
        id: `user_customer_${Date.now()}`,
        email: emailLower,
        full_name: data.name.trim(),
        is_master: false,
        subscriber_email: null, // Cliente não é assinante
        role: 'customer',
        password: hashedPassword, // Senha com hash bcrypt
        customer_id: newCustomer.id
      };
      
      db.users.push(newUser);
      
      console.log('✅ Cliente cadastrado:', newCustomer.email);
      console.log('✅ Usuário criado para cliente:', newUser.email);
      console.log('📊 Total de clientes:', db.customers.length);
      
      return {
        data: { 
          success: true,
          message: 'Cliente cadastrado com sucesso!',
          customer: {
            id: newCustomer.id,
            email: newCustomer.email,
            name: newCustomer.name,
            loyalty_points: newCustomer.loyalty_points,
            total_orders: newCustomer.total_orders
          }
        }
      };
    }
  };
  
  console.log(`🔍 Buscando função: "${name}"`);
  console.log(`🔍 Tipo do nome:`, typeof name);
  console.log(`🔍 Nome em minúsculas:`, name?.toLowerCase());
  console.log(`🔍 Funções disponíveis:`, Object.keys(functions));
  console.log(`🔍 Funções disponíveis (minúsculas):`, Object.keys(functions).map(k => k.toLowerCase()));
  
  // Tentar encontrar a função (case-insensitive)
  const func = functions[name] || functions[name?.toLowerCase()] || functions[name?.toUpperCase()];
  
  console.log(`🔍 Função encontrada?`, !!func);
  console.log(`🔍 Tipo da função:`, typeof func);
  
  if (!func) {
    // Tentar encontrar por similaridade
    const similar = Object.keys(functions).find(k => k.toLowerCase() === name?.toLowerCase());
    if (similar) {
      console.log(`🔍 Função similar encontrada: "${similar}"`);
      const similarFunc = functions[similar];
      if (similarFunc) {
        console.log(`✅ Usando função similar: "${similar}"`);
        const result = await similarFunc();
        return res.json(result);
      }
    }
  }
  
  if (func) {
    try {
      const result = await func();
      console.log(`✅ Função ${name} executada. Tipo do resultado:`, typeof result);
      console.log(`✅ Função ${name} executada. Resultado completo:`, JSON.stringify(result, null, 2));
      
      // Garantir que o resultado tenha a estrutura correta
      if (!result || typeof result !== 'object') {
        console.error(`❌ Função ${name} retornou resultado inválido:`, result);
        return res.status(500).json({
          data: {
            error: `Função ${name} retornou resultado inválido`
          }
        });
      }
      
      // Garantir que tenha a propriedade 'data'
      if (!result.data) {
        console.error(`❌ Função ${name} não retornou 'data':`, result);
        return res.status(500).json({
          data: {
            error: `Função ${name} não retornou dados no formato esperado`
          }
        });
      }
      
      // Log específico para createSubscriber
      if (name === 'createSubscriber') {
        console.log(`🔍 createSubscriber - result.data:`, JSON.stringify(result.data, null, 2));
        console.log(`🔍 createSubscriber - result.data.subscriber:`, JSON.stringify(result.data.subscriber, null, 2));
        console.log(`🔍 createSubscriber - result.data.subscriber existe?`, !!result.data.subscriber);
      }
      
      console.log(`📤 Enviando resposta JSON para o cliente...`);
      const jsonResponse = res.json(result);
      console.log(`📤 Resposta JSON enviada com sucesso`);
      return jsonResponse;
    } catch (funcError) {
      console.error(`❌ Erro ao executar função ${name}:`, funcError);
      console.error(`❌ Stack trace:`, funcError.stack);
      return res.status(500).json({
        data: {
          error: `Erro ao executar função ${name}: ${funcError.message}`
        }
      });
    }
  }
  
  // Função não encontrada - retorna resposta padrão
  console.warn(`⚠️ Função ${name} não encontrada`);
  console.warn(`⚠️ Funções disponíveis:`, Object.keys(functions));
  console.warn(`⚠️ Data recebida:`, JSON.stringify(data, null, 2));
  
  return res.status(404).json({
    data: {
      error: `Função "${name}" não encontrada. Funções disponíveis: ${Object.keys(functions).join(', ')}`
    }
  });
});

// ============================================
// ROTAS DE INTEGRAÇÕES (opcional)
// ============================================

// POST /api/integrations/email/send
app.post('/api/integrations/email/send', authenticate, (req, res) => {
  // Mock - em produção, integre com serviço de email
  res.json({ success: true, message: 'Email enviado (mock)' });
});

// POST /api/integrations/file/upload
app.post('/api/integrations/file/upload', authenticate, (req, res) => {
  // Mock - em produção, implemente upload real
  res.json({ 
    success: true, 
    url: 'https://example.com/uploads/file.jpg',
    message: 'Arquivo enviado (mock)' 
  });
});

// POST /api/integrations/llm/invoke
app.post('/api/integrations/llm/invoke', authenticate, (req, res) => {
  // Mock - em produção, integre com LLM
  res.json({ 
    success: true, 
    response: 'Resposta mock do LLM',
    message: 'LLM invocado (mock)' 
  });
});

// ============================================
// ROTA DE HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend funcionando',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});
