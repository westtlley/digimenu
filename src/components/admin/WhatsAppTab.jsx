import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, Bell, Bot, CheckCircle, ExternalLink, FileText, Star,
  Send, Copy, Plus, Trash2, Edit2
} from 'lucide-react';
import { whatsappService } from '../services/whatsappService';
import toast from 'react-hot-toast';

export default function WhatsAppTab() {
  const [activeSection, setActiveSection] = useState('config');
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('whatsapp_templates');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Pedido Confirmado', message: 'Olá! Seu pedido foi confirmado e está sendo preparado. 🍽️' },
      { id: 2, name: 'Pedido Pronto', message: 'Seu pedido está pronto para retirada! 🎉' },
      { id: 3, name: 'Pedido em Rota', message: 'Seu pedido saiu para entrega! 🚴' },
    ];
  });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', message: '' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">WhatsApp</h2>
        <p className="text-gray-600">Configurações de notificações e automação</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSection('config')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'config'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          CONFIGURAÇÃO E PLANO
        </button>
        <button
          onClick={() => setActiveSection('notifications')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'notifications'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          NOTIFICAÇÕES
        </button>
        <button
          onClick={() => setActiveSection('auto')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'auto'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          RESPOSTA AUTOMÁTICA
        </button>
        <button
          onClick={() => setActiveSection('summary')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeSection === 'summary'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          RESUMO DIÁRIO E SEMANAL
        </button>
      </div>

      {/* Conteúdo */}
      {activeSection === 'config' && (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">Pedido de Teste</h3>
                  <p className="text-gray-700 mb-4">
                    Quer receber uma notificação para testar? Faça um pedido de teste e receba as notificações no teu celular.
                  </p>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    PEDIDO DE TESTE
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8" />
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Plano BeeBot
                      <Badge className="bg-yellow-300 text-yellow-900">WhatsApp Web Integrado</Badge>
                    </CardTitle>
                    <p className="text-sm opacity-90 mt-1">Envio de Notificações e Resposta Automática</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    <Star className="w-5 h-5" />
                    <Star className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>Envio de Notificações Automáticas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>As mensagens são enviadas por um número próprio.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>É possível também responder os clientes através de um Chat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>Auto atendimento com todas informações para o cliente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <span>Sinaliza quando uma conversa precisa de atenção.</span>
                </li>
              </ul>

              <div className="mt-6 space-y-3">
                <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ACESSAR BEEBOT
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  MANUAL DE AJUDA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'notifications' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Templates de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de Templates */}
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{template.name}</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{template.message}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const phone = prompt('Digite o número do WhatsApp (apenas números):');
                              if (phone) {
                                whatsappService.sendToWhatsApp(phone, template.message);
                                toast.success('Abrindo WhatsApp...');
                              }
                            }}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(template.message);
                              toast.success('Mensagem copiada!');
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTemplate(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = templates.filter(t => t.id !== template.id);
                              setTemplates(updated);
                              localStorage.setItem('whatsapp_templates', JSON.stringify(updated));
                              toast.success('Template removido');
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Adicionar Novo Template */}
              {!editingTemplate && (
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Adicionar Novo Template</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Nome do Template</Label>
                        <Input
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="Ex: Pedido Confirmado"
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={newTemplate.message}
                          onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                          placeholder="Digite a mensagem do template..."
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (!newTemplate.name || !newTemplate.message) {
                            toast.error('Preencha todos os campos');
                            return;
                          }
                          const updated = [...templates, { id: Date.now(), ...newTemplate }];
                          setTemplates(updated);
                          localStorage.setItem('whatsapp_templates', JSON.stringify(updated));
                          setNewTemplate({ name: '', message: '' });
                          toast.success('Template adicionado!');
                        }}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Editar Template */}
              {editingTemplate && (
                <Card className="border-2 border-blue-500">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Editar Template</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>Nome do Template</Label>
                        <Input
                          value={editingTemplate.name}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Mensagem</Label>
                        <Textarea
                          value={editingTemplate.message}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const updated = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
                            setTemplates(updated);
                            localStorage.setItem('whatsapp_templates', JSON.stringify(updated));
                            setEditingTemplate(null);
                            toast.success('Template atualizado!');
                          }}
                          className="flex-1"
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingTemplate(null)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === 'auto' && (
        <Card>
          <CardContent className="p-12 text-center">
            <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Resposta Automática</h3>
            <p className="text-gray-400">Configure respostas automáticas para seus clientes</p>
          </CardContent>
        </Card>
      )}

      {activeSection === 'summary' && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Resumo Diário</h3>
            <p className="text-gray-400">Receba resumos automáticos de suas vendas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}