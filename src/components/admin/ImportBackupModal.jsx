/**
 * Modal para importar backup de dados
 * Permite ao assinante restaurar pratos, categorias, complementos e configurações
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileJson, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';

export default function ImportBackupModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [backupData, setBackupData] = useState(null);
  const [validation, setValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState('merge'); // 'merge' ou 'replace'

  // Resetar estado ao abrir/fechar
  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setFile(null);
      setBackupData(null);
      setValidation(null);
      setImporting(false);
    }
    onOpenChange(isOpen);
  };

  // Ler arquivo JSON
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.json')) {
      toast.error('Arquivo inválido. Selecione um arquivo .json');
      return;
    }

    setFile(selectedFile);
    setValidation(null);
    setBackupData(null);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);
      setBackupData(data);

      // Validar arquivo
      const response = await apiClient.post('/subscriber-backup/validate', {
        backupData: data
      });

      setValidation(response.data);
      
      if (!response.data.valid) {
        toast.error(response.data.error || 'Arquivo de backup inválido');
      } else {
        toast.success('Arquivo validado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao ler arquivo: ' + (error.message || 'Arquivo JSON inválido'));
      setFile(null);
      setBackupData(null);
    }
  };

  // Importar backup
  const handleImport = async () => {
    if (!backupData || !validation?.valid) {
      toast.error('Selecione um arquivo válido primeiro');
      return;
    }

    setImporting(true);

    try {
      const response = await apiClient.post('/subscriber-backup/import', {
        backupData,
        mode: importMode
      });

      const { results } = response.data;

      toast.success(
        `Importação concluída! ${results.dishes.created + results.dishes.updated} pratos, ${results.categories.created + results.categories.updated} categorias.`,
        { duration: 5000 }
      );

      if (onSuccess) {
        onSuccess(results);
      }

      handleOpenChange(false);
    } catch (error) {
      toast.error('Erro ao importar: ' + (error.response?.data?.error || error.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Backup
          </DialogTitle>
          <DialogDescription>
            Restaure seus pratos, categorias, complementos e configurações a partir de um arquivo de backup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload de arquivo */}
          <div className="space-y-2">
            <label htmlFor="backup-file" className="block text-sm font-medium">
              Selecionar arquivo de backup (.json)
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('backup-file').click()}
                className="w-full"
              >
                <FileJson className="w-4 h-4 mr-2" />
                {file ? file.name : 'Escolher arquivo'}
              </Button>
              <input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Validação */}
          {validation && (
            <Alert variant={validation.valid ? 'default' : 'destructive'}>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {validation.valid ? (
                  <div className="space-y-2">
                    <p className="font-medium">✅ Arquivo válido!</p>
                    <ul className="text-sm space-y-1">
                      <li>📂 {validation.stats.categories} categorias</li>
                      <li>🍽️ {validation.stats.dishes} pratos</li>
                      <li>🍔 {validation.stats.complement_groups} grupos de complementos</li>
                      {validation.stats.has_store && <li>🏪 Configurações da loja</li>}
                    </ul>
                    {validation.warnings.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                        <p className="text-xs font-medium mb-1">⚠️ Avisos:</p>
                        <ul className="text-xs space-y-1">
                          {validation.warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{validation.error || 'Arquivo inválido'}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Modo de importação */}
          {validation?.valid && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Modo de importação</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={importMode === 'merge' ? 'default' : 'outline'}
                  onClick={() => setImportMode('merge')}
                  className="justify-start"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Mesclar</div>
                    <div className="text-xs opacity-70">Adiciona novos dados</div>
                  </div>
                </Button>
                <Button
                  variant={importMode === 'replace' ? 'default' : 'outline'}
                  onClick={() => setImportMode('replace')}
                  className="justify-start"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Substituir</div>
                    <div className="text-xs opacity-70">Sempre cria novos</div>
                  </div>
                </Button>
              </div>
              
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  {importMode === 'merge' 
                    ? '✅ Dados existentes serão mantidos. Novos itens serão adicionados e itens com mesmo ID serão atualizados.'
                    : '⚠️ Todos os itens do backup serão criados como novos, mesmo que já existam similares.'}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!validation?.valid || importing}
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
