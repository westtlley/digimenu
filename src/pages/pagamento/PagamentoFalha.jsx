import React from 'react';
import { X, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function PagamentoFalha() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Ícone de erro */}
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-10 h-10 text-red-600" />
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Pagamento Não Aprovado
          </h1>

          <p className="text-gray-600 mb-8">
            Infelizmente não foi possível processar seu pagamento. Isso pode acontecer por diversos motivos.
          </p>

          {/* Motivos comuns */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-left">
            <h3 className="font-semibold text-yellow-900 mb-3">💡 Motivos Comuns:</h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li className="flex gap-2">
                <span>•</span>
                <span>Saldo insuficiente</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Dados do cartão incorretos</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Cartão expirado ou bloqueado</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Limite atingido</span>
              </li>
            </ul>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <Link to="/assinar" className="block">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </Link>

            <Link to="/" className="block">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>
            </Link>
          </div>

          {/* Suporte */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Precisa de ajuda?{' '}
              <a 
                href="https://wa.me/5586988196114" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-700 font-medium"
              >
                Fale conosco no WhatsApp
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
