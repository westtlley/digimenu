import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OrderTracking from '@/components/customer/OrderTracking';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { SYSTEM_NAME } from '@/config/branding';

export default function TrackOrder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar</span>
            </Link>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rastrear Pedido</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Acompanhe seu Pedido
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Digite seu email ou telefone para visualizar o status em tempo real dos seus pedidos
          </p>
        </div>

        <OrderTracking showInput={true} />

        {/* Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Funciona para pedidos online, comandas e pedidos via WhatsApp
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} {SYSTEM_NAME}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
