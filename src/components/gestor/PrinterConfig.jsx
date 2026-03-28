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
import { thermalPrint } from '@/utils/thermalPrint';
import { isBridgeAvailable, testBridgePrinter } from '@/utils/printBridgeClient';
import { buildTenantEntityOpts, getMenuContextScopeKey, getScopedStorageKey } from '@/utils/tenantScope';
import { uiText } from '@/i18n/pt-BR/uiText';

const THERMAL_BRANDS_REGEX = /(epson|tm-|elgin|bematech|daruma|xprinter|thermal|termica|sunmi|tanca|pos-?58|pos-?80)/i;
const PAPER_58_REGEX = /(58|58mm|pos-?58|rp58|m58)/i;
const PAPER_80_REGEX = /(80|80mm|pos-?80|rp80|m80)/i;

function inferPaperWidth(deviceName = '', fallback = '80mm') {
  if (PAPER_58_REGEX.test(deviceName)) return '58mm';
  if (PAPER_80_REGEX.test(deviceName)) return '80mm';
  return fallback;
}

function normalizePrinterDefaults(paperWidth = '80mm') {
  const is58 = paperWidth === '58mm';
  return {
    paper_width: is58 ? '58mm' : '80mm',
    font_size: is58 ? 11 : 12,
    margin_top: is58 ? 2 : 3,
    margin_right: is58 ? 2 : 3,
    margin_bottom: is58 ? 2 : 3,
    margin_left: is58 ? 2 : 3,
    line_spacing: is58 ? 1.25 : 1.35,
  };
}

function getSerialPortLabel(port) {
  const info = port?.getInfo?.() || {};
  const vid = Number.isFinite(info.usbVendorId) ? info.usbVendorId.toString(16).toUpperCase() : '----';
  const pid = Number.isFinite(info.usbProductId) ? info.usbProductId.toString(16).toUpperCase() : '----';
  return `Serial VID:${vid} PID:${pid}`;
}

const DEFAULT_PRINTER_CONFIG = {
  printer_name: '',
  printer_type: 'termica',
  connection_type: 'usb',
  paper_width: '80mm',
  margin_top: 3,
  margin_bottom: 3,
  margin_left: 3,
  margin_right: 3,
  line_spacing: 1.35,
  font_size: 12,
  auto_cut: true,
  open_drawer: false,
  print_method: 'css'
};

export default function PrinterConfig() {
  const printerText = uiText.printerConfig;
  const [showPreview, setShowPreview] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const printerStorageKey = useMemo(() => getScopedStorageKey('printerConfigLocal', menuContext, 'global'), [menuContext]);
  const menuScopeKey = useMemo(() => getMenuContextScopeKey(menuContext, 'global'), [menuContext]);
  const scopedEntityOpts = useMemo(() => {
    if (!menuContext || menuContext.type !== 'subscriber') return {};
    return buildTenantEntityOpts({
      subscriberId: menuContext.subscriber_id,
      subscriberEmail: menuContext.value,
    });
  }, [menuContext]);

  // âœ… CORREÃ‡ÃƒO: Buscar configuraÃ§Ãµes de impressora com contexto do slug
  const { data: configs = [] } = useQuery({
    queryKey: ['printerConfig', menuScopeKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.PrinterConfig.list(null, scopedEntityOpts);
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
      localStorage.setItem(printerStorageKey, JSON.stringify(config));
    } catch (_) {}
  }, [config, printerStorageKey]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (config.id) {
        return base44.entities.PrinterConfig.update(config.id, data, scopedEntityOpts);
      }
      return base44.entities.PrinterConfig.create({
        ...data,
        ...scopedEntityOpts,
      });
    },
    onSuccess: (_saved, payload) => {
      try {
        localStorage.setItem(printerStorageKey, JSON.stringify(payload || formData));
      } catch (_) {}
      queryClient.invalidateQueries({ queryKey: ['printerConfig', menuScopeKey] });
      toast.success(printerText.saveSuccess);
    },
    onError: (e) => toast.error('Erro ao salvar: ' + (e?.message || printerText.unknownError))
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleAutoDetectPrinter = async () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      toast.error(printerText.browserOnly);
      return;
    }

    setIsDetecting(true);
    try {
      let detected = null;

      if (!detected && navigator.usb?.getDevices) {
        const usbDevices = await navigator.usb.getDevices();
        if (Array.isArray(usbDevices) && usbDevices.length > 0) {
          const candidate = usbDevices.find((device) => {
            const name = `${device?.manufacturerName || ''} ${device?.productName || ''}`.trim();
            return THERMAL_BRANDS_REGEX.test(name);
          }) || usbDevices[0];

          const rawName = `${candidate?.manufacturerName || ''} ${candidate?.productName || ''}`.trim();
          const printerName = rawName || 'Impressora USB';
          detected = {
            source: 'USB',
            name: printerName,
            connectionType: 'usb',
            printMethod: 'hybrid',
            paperWidth: inferPaperWidth(printerName, '80mm'),
          };
        }
      }

      if (!detected && navigator.serial?.getPorts) {
        const serialPorts = await navigator.serial.getPorts();
        if (Array.isArray(serialPorts) && serialPorts.length > 0) {
          const serialLabel = getSerialPortLabel(serialPorts[0]);
          detected = {
            source: 'WebSerial',
            name: serialLabel,
            connectionType: 'usb',
            printMethod: 'escpos',
            paperWidth: inferPaperWidth(serialLabel, '80mm'),
          };
        }
      }

      if (!detected && navigator.bluetooth?.requestDevice) {
        try {
          const bluetoothDevice = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
          const btName = bluetoothDevice?.name || 'Impressora Bluetooth';
          detected = {
            source: 'Bluetooth',
            name: btName,
            connectionType: 'bluetooth',
            printMethod: 'css',
            paperWidth: inferPaperWidth(btName, '58mm'),
          };
        } catch (btError) {
          if (btError?.name !== 'NotFoundError') {
            console.warn('[PrinterConfig] Falha ao detectar Bluetooth:', btError);
          }
        }
      }

      if (!detected) {
        const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
        const inferredPaper = isMobile ? '58mm' : '80mm';
        setFormData((prev) => ({
          ...prev,
          connection_type: isMobile ? 'bluetooth' : 'usb',
          printer_type: 'termica',
          print_method: 'css',
          ...normalizePrinterDefaults(inferredPaper),
        }));
        toast(printerText.detectionFallback);
        return;
      }

      setFormData((prev) => ({
        ...prev,
        printer_name: detected.name,
        printer_type: 'termica',
        connection_type: detected.connectionType,
        print_method: detected.printMethod,
        ...normalizePrinterDefaults(detected.paperWidth),
      }));

      toast.success(printerText.detectionSuccess(detected.source, detected.name));
    } catch (error) {
      console.error('[PrinterConfig] Erro na deteccao de impressora:', error);
      toast.error(printerText.detectionError);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleTestPrint = async () => {
    if (!formData.printer_name?.trim()) {
      toast.error(printerText.nameRequiredBeforeTest);
      return;
    }

    try {
      const bridgeOnline = await isBridgeAvailable();
      if (bridgeOnline) {
        await testBridgePrinter(formData.printer_name);
        toast.success('Teste enviado via DigiMenu Print Bridge', {
          duration: 3000,
          icon: 'PRINT'
        });
        return;
      }
    } catch (bridgeError) {
      console.warn('[PrinterConfig] Falha no teste via bridge. Aplicando fallback do navegador.', bridgeError);
    }

    const testContent = generateTestComanda();
    const escaped = testContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const printed = thermalPrint({
      title: printerText.testPrintTitle,
      htmlContent: `<pre>${escaped}</pre>`,
      jobType: 'teste-impressao',
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
      toast.error(printerText.popupBlocked);
      return;
    }

    toast.success(printerText.sendingToPrinter, {
      duration: 3000,
      icon: 'PRINT'
    });
  };

  // ValidaÃ§Ãµes
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
          <h2 className="text-2xl font-bold">{printerText.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{printerText.subtitle}</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{printerText.statusLabel}</p>
              <p className="text-lg font-bold">{isValid ? printerText.configured : printerText.notConfigured}</p>
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
          <CardTitle>{printerText.basicSettingsTitle}</CardTitle>
          <CardDescription>{printerText.basicSettingsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nome da Impressora */}
          <div>
            <Label>{printerText.printerNameLabel}</Label>
            <Input
              value={formData.printer_name}
              onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
              placeholder="Ex: Epson TM-T20"
              required
              className={!formData.printer_name?.trim() ? 'border-red-300' : ''}
            />
            {!formData.printer_name?.trim() && (
              <p className="text-xs text-red-500 mt-1">{printerText.printerNameRequired}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {printerText.detectionHelp}
            </p>
            <Button
              type="button"
              onClick={handleAutoDetectPrinter}
              variant="outline"
              className="mt-2"
              disabled={isDetecting}
            >
              {isDetecting ? 'Detectando...' : printerText.detectButton}
            </Button>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo */}
          <div>
            <Label>{printerText.printerTypeLabel}</Label>
            <Select
              value={formData.printer_type}
              onValueChange={(value) => setFormData({ ...formData, printer_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="termica">{printerText.thermalType}</SelectItem>
                <SelectItem value="laser">Laser</SelectItem>
                <SelectItem value="jato_tinta">{printerText.inkjetType}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ConexÃ£o */}
          <div>
            <Label>{printerText.connectionTypeLabel}</Label>
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

          {/* MÃ©todo de ImpressÃ£o */}
          <div>
            <Label>{printerText.printMethodLabel}</Label>
            <Select
              value={formData.print_method || 'css'}
              onValueChange={(value) => setFormData({ ...formData, print_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="css">{printerText.printMethodCss}</SelectItem>
                <SelectItem value="escpos">{printerText.printMethodEscpos}</SelectItem>
                <SelectItem value="hybrid">{printerText.printMethodHybrid}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.print_method === 'css' && printerText.printMethodCss}
              {formData.print_method === 'escpos' && printerText.printMethodEscpos}
              {formData.print_method === 'hybrid' && printerText.printMethodHybrid}
            </p>
          </div>
        </div>

          {/* Largura */}
          <div>
            <Label>{printerText.paperWidthLabel}</Label>
            <Select
              value={formData.paper_width}
              onValueChange={(value) => setFormData({
                ...formData,
                ...normalizePrinterDefaults(value),
                paper_width: value === '58mm' ? '58mm' : '80mm',
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm</SelectItem>
                <SelectItem value="80mm">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

        {/* Margens */}
        <div>
          <Label className="mb-2 block">{printerText.marginsLabel}</Label>
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
            <Label>{printerText.lineSpacingLabel}</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.line_spacing}
              onChange={(e) => setFormData({ ...formData, line_spacing: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>{printerText.fontSizeLabel}</Label>
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
            <Label>{printerText.autoCutLabel}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.open_drawer}
              onCheckedChange={(checked) => setFormData({ ...formData, open_drawer: checked })}
            />
            <Label>{printerText.openDrawerLabel}</Label>
          </div>
        </div>

          {/* BotÃµes */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={!isValid || saveMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Salvando...' : printerText.saveButton}
            </Button>
            <Button onClick={() => setShowPreview(true)} variant="outline" disabled={!isValid}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
            <Button onClick={handleTestPrint} variant="outline" disabled={!isValid}>
              <TestTube className="w-4 h-4 mr-2" />
              {printerText.testButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview da comanda</DialogTitle>
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


