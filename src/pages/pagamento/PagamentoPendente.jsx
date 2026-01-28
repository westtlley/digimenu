import React from 'react';
import { Clock, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function PagamentoPendente() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Ícone de pendente */}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-blue-600" />
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Pagamento Pendente
          </h1>

          <p className="text-gray-600 mb-8">
            Seu pagamento está sendo processado. Assim que for aprovado, você receberá um email de confirmação.
          </p>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-left">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              O que acontece agora?
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span>•</span>
                <span>Para <strong>PIX</strong>: aprovação em até 1 hora</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Para <strong>Boleto</strong>: aprovação em 1-3 dias úteis</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Você receberá um email assim que for aprovado</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Seu acesso será liberado automaticamente</span>
              </li>
            </ul>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <Link to="/painelassinante" className="block">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Ir para Meu Painel
              </Button>
            </Link>

            <Link to="/assinar" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Página Assinar
              </Button>
            </Link>
          </div>

          {/* Suporte */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Dúvidas sobre seu pagamento?{' '}
              <a 
                href="https://wa.me/5586988196114" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Entre em contato
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
