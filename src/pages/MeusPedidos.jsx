import React, { useState, useEffect } from 'react';
import { History, LogOut, Loader2, ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import CustomerOrdersHistory from '../components/customer/CustomerOrdersHistory';
import UserAuthButton from '../components/atoms/UserAuthButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <h1 className="font-semibold text-sm sm:text-base">Meus Pedidos</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('Cardapio')}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
                <ShoppingBag className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cardápio</span>
              </Button>
            </Link>
            <UserAuthButton className="text-white" />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4">
        <CustomerOrdersHistory userEmail={user?.email} />
      </main>
    </div>
  );
}