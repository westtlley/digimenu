import React, { useState, useEffect } from 'react';
import { LogIn, Power, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { apiClient as base44 } from '@/api/apiClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UserAuthButton({ className = '' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openLogout, setOpenLogout] = useState(false);

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
    setOpenLogout(false);
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
      <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-700 dark:text-gray-300">{user.email}</span>
      </div>
      <AlertDialog open={openLogout} onOpenChange={setOpenLogout}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Sair">
            <Power className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>Você precisará fazer login novamente para acessar o painel.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}