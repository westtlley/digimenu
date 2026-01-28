import React, { useState, useEffect } from 'react';
import { Package, LogOut, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiClient as base44 } from '@/api/apiClient';
import OrderTracking from '../components/customer/OrderTracking';
import UserAuthButton from '../components/atoms/UserAuthButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ThemeToggle from '../components/ThemeToggle';

export default function MeusPedidos() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">Meus Pedidos</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link to={createPageUrl('Cardapio')}>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Cardápio
                </Button>
              </Link>
              <UserAuthButton />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <OrderTracking userEmail={user?.email} showInput={false} />
      </main>
    </div>
  );
}