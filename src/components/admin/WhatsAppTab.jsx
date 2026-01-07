import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, Bell, Bot, CheckCircle, ExternalLink, FileText, Star
} from 'lucide-react';

export default function WhatsAppTab() {
  const [activeSection, setActiveSection] = useState('config');

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
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Notificações</h3>
            <p className="text-gray-400">Configure as notificações automáticas enviadas aos clientes</p>
          </CardContent>
        </Card>
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