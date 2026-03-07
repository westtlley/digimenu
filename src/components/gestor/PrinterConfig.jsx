import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Save, TestTube, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import toast from 'react-hot-toast';
import { usePermission } from '../permissions/usePermission';
import { openThermalPrintWindow } from '@/utils/printWindow';

const DEFAULT_PRINTER_CONFIG = {
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
  open_drawer: false,
  print_method: 'css'
};

export default function PrinterConfig() {
  const [showPreview, setShowPreview] = useState(false);
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

  // ✅ CORREÇÃO: Buscar configurações de impressora com contexto do slug
  const { data: configs = [] } = useQuery({
    queryKey: ['printerConfig', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.PrinterConfig.list(null, opts);
    },
    enabled: !!menuContext,
  });

  const config = useMemo(() => configs[0] || DEFAULT_PRINTER_CONFIG, [configs]);
  const [formData, setFormData] = useState(config);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  useEffect(() => {
    if (!config?.id) return;
    try {
      localStorage.setItem('printerConfigLocal', JSON.stringify(config));
    } catch (_) {}
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config.id) {
        return base44.entities.PrinterConfig.update(config.id, data);
      }
      return base44.entities.PrinterConfig.create(data);
    },
    onSuccess: (_saved, payload) => {
      try {
        localStorage.setItem('printerConfigLocal', JSON.stringify(payload || formData));
      } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['printerConfig'] });
      toast.success('✅ Configuração salva com sucesso!');
    },
    onError: (e) => toast.error('Erro ao salvar: ' + (e?.message || 'Desconhecido'))
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleTestPrint = () => {
    if (!formData.printer_name?.trim()) {
      toast.error('Configure o nome da impressora antes de testar');
      return;
    }
    const testContent = generateTestComanda();
    const escaped = testContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const printed = openThermalPrintWindow({
      title: 'Teste de Impressao',
      htmlContent: `<pre>${escaped}</pre>`,
      paperWidth: formData.paper_width,
      marginTop: Number(formData.margin_top) || 3,
      marginRight: Number(formData.margin_right) || 3,
      marginBottom: Number(formData.margin_bottom) || 3,
      marginLeft: Number(formData.margin_left) || 3,
      fontSize: Number(formData.font_size) || 12,
      lineSpacing: Number(formData.line_spacing) || 1.35,
      autoClose: formData.auto_cut !== false,
    });

    if (!printed) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
      return;
    }

    toast.success('Enviando para impressora...', {
      duration: 3000,
      icon: '🖨️'
    });
  };

  // Validações
  const isValid = useMemo(() => {
    return !!formData.printer_name?.trim();
  }, [formData.printer_name]);

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Printer className="w-6 h-6" />
        <div>
          <h2 className="text-2xl font-bold">Configuração de Impressora</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure sua impressora para receitas e comandas</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status da Configuração</p>
              <p className="text-lg font-bold">{isValid ? 'Configurada' : 'Não Configurada'}</p>
            </div>
            {isValid ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas</CardTitle>
          <CardDescription>Informações principais da impressora</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome da Impressora */}
          <div>
            <Label>Nome da Impressora *</Label>
            <Input
              value={formData.printer_name}
              onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
              placeholder="Ex: Epson TM-T20"
              required
              className={!formData.printer_name?.trim() ? 'border-red-300' : ''}
            />
            {!formData.printer_name?.trim() && (
              <p className="text-xs text-red-500 mt-1">Nome da impressora é obrigatório</p>
            )}
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

          {/* Método de Impressão */}
          <div>
            <Label>Método de Impressão</Label>
            <Select
              value={formData.print_method || 'css'}
              onValueChange={(value) => setFormData({ ...formData, print_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="css">CSS (window.print)</SelectItem>
                <SelectItem value="escpos">ESC/POS (Web Serial)</SelectItem>
                <SelectItem value="hybrid">Híbrido (tenta ESC/POS)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.print_method === 'css' && 'Impressão via navegador (padrão)'}
              {formData.print_method === 'escpos' && 'Comandos diretos via Web Serial API'}
              {formData.print_method === 'hybrid' && 'Tenta ESC/POS, fallback para CSS'}
            </p>
          </div>
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
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!isValid || saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
            <Button onClick={() => setShowPreview(true)} variant="outline" disabled={!isValid}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button onClick={handleTestPrint} variant="outline" disabled={!isValid}>
              <TestTube className="w-4 h-4 mr-2" />
              Testar Impressão
            </Button>
          </div>
        </CardContent>
      </Card>

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
