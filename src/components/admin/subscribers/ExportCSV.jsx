import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportSubscribersToCSV, downloadCSV } from '@/utils/csvUtils';
import toast from 'react-hot-toast';

/**
 * Componente para exportar assinantes para CSV
 */
export default function ExportCSV({ subscribers, disabled = false }) {
  const handleExport = () => {
    try {
      if (!subscribers || subscribers.length === 0) {
        toast.error('Nenhum assinante para exportar');
        return;
      }

      const csvContent = exportSubscribersToCSV(subscribers);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `assinantes_${dateStr}.csv`;
      
      downloadCSV(csvContent, filename);
      toast.success(`${subscribers.length} assinante(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV: ' + error.message);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || !subscribers || subscribers.length === 0}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  );
}
