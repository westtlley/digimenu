export function createManagerialAuthHandlers({
  repo,
  usePostgreSQL,
  bcrypt,
  managerialEntityAuth,
}) {
  const {
    ensureManagerialAuthPlanEnabled,
    getManagerialSubscriberAndRole,
    isRequesterOwnerForManagerialAuth,
    registerManagerialAuthSession,
  } = managerialEntityAuth;

  async function getManagerialAuth(req, res) {
    if (!usePostgreSQL || !repo.getManagerialAuthorization) {
      return res.status(503).json({ error: 'Autorizacao gerencial requer PostgreSQL' });
    }

    const { owner } = getManagerialSubscriberAndRole(req);
    if (!owner) {
      return res.status(400).json({ error: 'Contexto do estabelecimento necessario' });
    }

    if (!(await ensureManagerialAuthPlanEnabled(owner, res))) return;

    const isOwner = isRequesterOwnerForManagerialAuth(req, owner);
    if (!isOwner) {
      const authGerente = await repo.getManagerialAuthorization(owner, 'gerente');
      return res.json({
        assinante: null,
        gerente: authGerente
          ? { configured: true, expires_at: authGerente.expires_at }
          : { configured: false },
      });
    }

    const [authAssinante, authGerente] = await Promise.all([
      repo.getManagerialAuthorization(owner, 'assinante'),
      repo.getManagerialAuthorization(owner, 'gerente'),
    ]);

    return res.json({
      assinante: authAssinante
        ? {
            configured: true,
            matricula: authAssinante.matricula,
            expires_at: authAssinante.expires_at,
          }
        : { configured: false },
      gerente: authGerente
        ? {
            configured: true,
            matricula: authGerente.matricula,
            expires_at: authGerente.expires_at,
          }
        : { configured: false },
    });
  }

  async function upsertManagerialAuth(req, res) {
    if (!usePostgreSQL || !repo.setManagerialAuthorization) {
      return res.status(503).json({ error: 'Autorizacao gerencial requer PostgreSQL' });
    }

    const { owner } = getManagerialSubscriberAndRole(req);
    if (!owner) {
      return res.status(400).json({ error: 'Contexto do estabelecimento necessario' });
    }

    if (!(await ensureManagerialAuthPlanEnabled(owner, res))) return;

    const isOwner = isRequesterOwnerForManagerialAuth(req, owner);
    if (!isOwner) {
      return res.status(403).json({
        error: 'Apenas o dono do estabelecimento pode criar ou alterar autorizacoes.',
      });
    }

    const { role: bodyRole, matricula, password, expirable, expires_at } = req.body || {};
    const targetRole = bodyRole === 'gerente' ? 'gerente' : 'assinante';

    if (!matricula || !password || String(password).length < 6) {
      return res.status(400).json({
        error: 'Matricula e senha (min. 6 caracteres) sao obrigatorios.',
      });
    }

    const expiresAt = expirable && expires_at ? new Date(expires_at) : null;
    const passwordHash = await bcrypt.hash(String(password), 10);

    await repo.setManagerialAuthorization(owner, targetRole, {
      matricula: String(matricula).trim(),
      passwordHash,
      expiresAt: expiresAt || null,
    });

    const updated = await repo.getManagerialAuthorization(owner, targetRole);
    return res.json({
      success: true,
      role: targetRole,
      configured: true,
      expires_at: updated?.expires_at ?? null,
    });
  }

  async function validateManagerialAuth(req, res) {
    if (!usePostgreSQL || !repo.validateManagerialAuthorization) {
      return res.status(503).json({ error: 'Autorizacao gerencial requer PostgreSQL' });
    }

    const { owner, role } = getManagerialSubscriberAndRole(req);
    if (!owner || !role) {
      return res.status(400).json({ error: 'Acesso nao permitido para este perfil.' });
    }

    if (!(await ensureManagerialAuthPlanEnabled(owner, res))) return;

    const { matricula, password } = req.body || {};
    if (!matricula || !password) {
      return res.status(400).json({ error: 'Matricula e senha sao obrigatorios.' });
    }

    const valid = await repo.validateManagerialAuthorization(owner, role, matricula, password);
    if (valid) {
      registerManagerialAuthSession(req, owner, role);
    }

    return res.json({ valid: !!valid });
  }

  return {
    getManagerialAuth,
    upsertManagerialAuth,
    validateManagerialAuth,
  };
}
