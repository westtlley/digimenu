import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Lock, User, Store, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Ajuda() {
  const sections = [
    { icon: Lock, title: 'Esqueci minha senha', to: '/esqueci-senha', desc: 'Solicite um link por email para redefinir sua senha.' },
    { icon: User, title: 'Sou cliente', desc: 'Faça login com seu email e senha. Você será direcionado ao cardápio e seus pedidos.' },
    { icon: Store, title: 'Sou assinante (restaurante)', desc: 'Use o mesmo login. Após entrar, acesse o Painel do seu estabelecimento.' },
    { icon: Settings, title: 'Sou colaborador (Entregador, Cozinha, PDV)', desc: 'Use o mesmo login. Você será direcionado ao painel do seu perfil.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajuda</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Respostas rápidas e suporte</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {sections.map(({ icon: Icon, title, to, desc }) => (
            <div key={title} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{desc}</p>
                  {to && (
                    <Link to={to} className="inline-block mt-2 text-sm text-orange-500 hover:underline font-medium">
                      Ir para {title.toLowerCase()} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Precisa de suporte?</strong> Entre em contato pelo WhatsApp.
          </p>
          <a href="https://wa.me/5586988196114" target="_blank" rel="noopener noreferrer" className="block mt-2">
            <Button className="bg-green-600 hover:bg-green-700">Abrir WhatsApp</Button>
          </a>
        </div>

        <div className="mt-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
