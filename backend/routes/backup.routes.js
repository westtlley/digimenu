/**
 * Rotas de backup (apenas master)
 */
import express from 'express';
import { createBackup, listBackups, restoreBackup } from '../utils/backup.js';
import { requireMaster } from '../middlewares/permissions.js';

const router = express.Router();

/**
 * POST /api/backup/create
 * Criar backup manual
 */
router.post('/create', requireMaster, async (req, res) => {
  try {
    const result = await createBackup();
    res.json(result);
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    res.status(500).json({ error: 'Erro ao criar backup: ' + error.message });
  }
});

/**
 * GET /api/backup/list
 * Listar backups disponíveis
 */
router.get('/list', requireMaster, async (req, res) => {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    res.status(500).json({ error: 'Erro ao listar backups' });
  }
});

/**
 * POST /api/backup/restore
 * Restaurar backup
 */
router.post('/restore', requireMaster, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'filename é obrigatório' });
    }
    
    const result = await restoreBackup(filename);
    res.json(result);
  } catch (error) {
    console.error('Erro ao restaurar backup:', error);
    res.status(500).json({ error: 'Erro ao restaurar backup: ' + error.message });
  }
});

export default router;
