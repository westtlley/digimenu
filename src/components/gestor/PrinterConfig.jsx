import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Save, TestTube, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PrinterConfig() {
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['printerConfig'],
    queryFn: () => base44.entities.PrinterConfig.list()
  });

  const config = configs[0] || {
    printer_name: '',
    printer_type: 'termica',
    connection_type: 'usb',
    paper_width: '80mm',
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 5,
    margin_right: 5,
    line_spacing: 1.5,
    font_size: 12,
    auto_cut: true,
    open_drawer: false
  };

  const [formData, setFormData] = useState(config);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config.id) {
        return base44.entities.PrinterConfig.update(config.id, data);
      }
      return base44.entities.PrinterConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printerConfig'] });
      alert('✅ Configuração salva com sucesso!');
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleTestPrint = () => {
    const testContent = generateTestComanda();
    printComanda(testContent);
    alert('Enviando para impressora...\n\nSe nada foi impresso, verifique:\n- Impressora conectada\n- Driver instalado\n- Papel carregado');
  };

  const generateTestComanda = () => {
    return `
============================
       TESTE DE IMPRESSÃO
============================

Impressora: ${formData.printer_name}
Tipo: ${formData.printer_type}
Largura: ${formData.paper_width}

--- Teste de Texto ---
Este é um teste de impressão.
Fonte: ${formData.font_size}pt
Espaçamento: ${formData.line_spacing}

============================
       DATA/HORA TESTE
    ${new Date().toLocaleString('pt-BR')}
============================
`.trim();
  };

  const printComanda = (content) => {
    const printWindow = window.open('', '_blank');
    const styles = `
      <style>
        @page { 
          margin: ${formData.margin_top}mm ${formData.margin_right}mm ${formData.margin_bottom}mm ${formData.margin_left}mm; 
          size: ${formData.paper_width === '58mm' ? '58mm' : formData.paper_width === '80mm' ? '80mm' : 'auto'} auto;
        }
        body { 
          font-family: 'Courier New', monospace; 
          font-size: ${formData.font_size}pt;
          line-height: ${formData.line_spacing};
          white-space: pre-wrap;
        }
      </style>
    `;
    printWindow.document.write(styles + '<pre>' + content + '</pre>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      if (formData.auto_cut) {
        printWindow.close();
      }
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Printer className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Configuração de Impressora</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
        {/* Nome da Impressora */}
        <div>
          <Label>Nome da Impressora *</Label>
          <Input
            value={formData.printer_name}
            onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
            placeholder="Ex: Epson TM-T20"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo */}
          <div>
            <Label>Tipo de Impressora</Label>
            <Select
              value={formData.printer_type}
              onValueChange={(value) => setFormData({ ...formData, printer_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="termica">Térmica</SelectItem>
                <SelectItem value="laser">Laser</SelectItem>
                <SelectItem value="jato_tinta">Jato de Tinta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conexão */}
          <div>
            <Label>Tipo de Conexão</Label>
            <Select
              value={formData.connection_type}
              onValueChange={(value) => setFormData({ ...formData, connection_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usb">USB</SelectItem>
                <SelectItem value="rede">Rede</SelectItem>
                <SelectItem value="bluetooth">Bluetooth</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Largura */}
          <div>
            <Label>Largura do Papel</Label>
            <Select
              value={formData.paper_width}
              onValueChange={(value) => setFormData({ ...formData, paper_width: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Margens */}
        <div>
          <Label className="mb-2 block">Margens (mm)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Superior</Label>
              <Input
                type="number"
                value={formData.margin_top}
                onChange={(e) => setFormData({ ...formData, margin_top: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Inferior</Label>
              <Input
                type="number"
                value={formData.margin_bottom}
                onChange={(e) => setFormData({ ...formData, margin_bottom: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Esquerda</Label>
              <Input
                type="number"
                value={formData.margin_left}
                onChange={(e) => setFormData({ ...formData, margin_left: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Direita</Label>
              <Input
                type="number"
                value={formData.margin_right}
                onChange={(e) => setFormData({ ...formData, margin_right: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Formatação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Espaçamento entre Linhas</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.line_spacing}
              onChange={(e) => setFormData({ ...formData, line_spacing: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>Tamanho da Fonte (pt)</Label>
            <Input
              type="number"
              value={formData.font_size}
              onChange={(e) => setFormData({ ...formData, font_size: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Opções */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.auto_cut}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_cut: checked })}
            />
            <Label>Corte automático do papel</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.open_drawer}
              onCheckedChange={(checked) => setFormData({ ...formData, open_drawer: checked })}
            />
            <Label>Abrir gaveta de dinheiro (se suportado)</Label>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configuração
          </Button>
          <Button onClick={() => setShowPreview(true)} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
          <Button onClick={handleTestPrint} variant="outline">
            <TestTube className="w-4 h-4 mr-2" />
            Testar Impressão
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview da Comanda</DialogTitle>
          </DialogHeader>
          <div 
            className="bg-white border-2 border-dashed p-4 font-mono text-xs overflow-auto max-h-96"
            style={{ 
              fontSize: `${formData.font_size}pt`,
              lineHeight: formData.line_spacing 
            }}
          >
            <pre>{generateTestComanda()}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}