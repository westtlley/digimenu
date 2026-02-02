import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { importCSVToSubscribers } from '@/utils/csvUtils';
import toast from 'react-hot-toast';

/**
 * Componente para importar assinantes via CSV
 */
export default function ImportCSV({ onImport, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Ler arquivo para preview
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target.result;
        const subscribers = importCSVToSubscribers(csvText);
        setPreview(subscribers);
        setError(null);
      } catch (err) {
        setError(err.message || 'Erro ao processar CSV');
        setPreview(null);
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleImport = () => {
    if (!preview || preview.length === 0) {
      toast.error('Nenhum assinante válido para importar');
      return;
    }

    try {
      onImport(preview);
      toast.success(`${preview.length} assinante(s) importado(s) com sucesso!`);
      setOpen(false);
      setFile(null);
      setPreview(null);
      setError(null);
    } catch (err) {
      console.error('Erro ao importar:', err);
      toast.error('Erro ao importar assinantes: ' + err.message);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" />
              Importar Assinantes (CSV)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Selecione o arquivo CSV
              </label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Colunas: Email, Nome, Plano, Status, Data de Expiração, Email de Acesso, Telefone, CNPJ_CPF, Origem, Tags, Slug, Observações
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {preview && preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {preview.length} assinante(s) válido(s) encontrado(s)
                  </span>
                </div>

                <div className="border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {preview.slice(0, 5).map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {idx + 1}
                        </Badge>
                        <span className="font-medium">{sub.email}</span>
                        {sub.name && <span className="text-gray-500">- {sub.name}</span>}
                        <Badge variant="outline" className="ml-auto text-xs">
                          {sub.plan}
                        </Badge>
                      </div>
                    ))}
                    {preview.length > 5 && (
                      <p className="text-xs text-gray-500 text-center pt-2">
                        ... e mais {preview.length - 5} assinante(s)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {file && !preview && !error && (
              <div className="flex items-center justify-center py-4">
                <FileText className="w-8 h-8 text-gray-400 animate-pulse" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!preview || preview.length === 0}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Importar {preview ? `(${preview.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
