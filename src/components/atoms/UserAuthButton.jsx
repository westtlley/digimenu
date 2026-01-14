import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiClient as base44 } from '@/api/apiClient';

export default function UserAuthButton({ className = '' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.pathname);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Button
        onClick={handleLogin}
        size="sm"
        variant="outline"
        className={className}
      >
        <LogIn className="w-4 h-4 mr-2" />
        Entrar
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100">
        <User className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-700">{user.email}</span>
      </div>
      <Button
        onClick={handleLogout}
        size="sm"
        variant="outline"
        className="text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4 sm:mr-2" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </div>
  );
}