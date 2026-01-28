import React, { useEffect } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { confetti } from '@/utils/confetti';

export default function PagamentoSucesso() {
  const navigate = useNavigate();

  useEffect(() => {
    // Animação de confetti
    if (typeof confetti === 'function') {
      confetti();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Ícone de sucesso */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Pagamento Aprovado! 🎉
          </h1>

          <p className="text-gray-600 mb-8">
            Sua assinatura foi ativada com sucesso! Em instantes você receberá um email com as instruções de acesso.
          </p>

          {/* Próximos passos */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">📋 Próximos Passos:</h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Verifique seu email (inclua spam/lixeira)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Clique no link para definir sua senha</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Acesse seu painel e configure seu cardápio</span>
              </li>
            </ol>
          </div>

          {/* Botões */}
          <div className="space-y-3">
            <Link to="/painelassinante" className="block">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                Acessar Meu Painel
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link to="/assinar" className="block">
              <Button variant="outline" className="w-full">
                Voltar para Página Assinar
              </Button>
            </Link>
          </div>

          {/* Suporte */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Não recebeu o email? Entre em contato pelo{' '}
              <a 
                href="https://wa.me/5586988196114" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                WhatsApp
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
