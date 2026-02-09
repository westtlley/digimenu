/**
 * Página inicial do colaborador após login.
 * Todos os colaboradores (incluindo gerente) entram aqui e veem botões conforme seus perfis:
 * - Gerente: Painel da empresa + Gestor + Entregador + Cozinha + PDV + Garçom
 * - Outros: apenas as funções liberadas (ex.: só Entregador, ou PDV + Garçom, etc.)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BarChart3,
  Truck,
  ChefHat,
  Calculator,
  Receipt,
  LogOut,
  Loader2,
  Users,
} from 'lucide-react';

const APP_BUTTONS = [
  { id: 'painel', role: 'gerente', label: 'Painel do Gerente', path: '/PainelGerente', icon: LayoutDashboard, color: 'from-violet-600 to-violet-700', hoverColor: 'hover:from-violet-700 hover:to-violet-800' },
  { id: 'gestor', role: 'gerente', label: 'Gestor de Pedidos', path: '/GestorPedidos', icon: BarChart3, color: 'from-orange-600 to-orange-700', hoverColor: 'hover:from-orange-700 hover:to-orange-800' },
  { id: 'entregador', role: 'entregador', label: 'App do Entregador', path: '/Entregador', icon: Truck, color: 'from-cyan-600 to-cyan-700', hoverColor: 'hover:from-cyan-700 hover:to-cyan-800' },
  { id: 'cozinha', role: 'cozinha', label: 'Cozinha', path: '/Cozinha', icon: ChefHat, color: 'from-amber-600 to-amber-700', hoverColor: 'hover:from-amber-700 hover:to-amber-800' },
  { id: 'pdv', role: 'pdv', label: 'PDV', path: '/PDV', icon: Calculator, color: 'from-green-600 to-green-700', hoverColor: 'hover:from-green-700 hover:to-green-800' },
  { id: 'garcom', role: 'garcom', label: 'Garçom', path: '/Garcom', icon: Receipt, color: 'from-indigo-600 to-indigo-700', hoverColor: 'hover:from-indigo-700 hover:to-indigo-800' },
];

export default function ColaboradorHome() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        setUser(null);
      }
    }, 20000);
    (async () => {
      try {
        const ok = await base44.auth.isAuthenticated();
        if (!ok) {
          if (!cancelled) navigate('/', { replace: true });
          return;
        }
        const me = await base44.auth.me();
        if (cancelled) return;
        if (!me?.profile_role && !me?.profile_roles?.length) {
          navigate('/', { replace: true });
          return;
        }
        setUser(me);
      } catch (e) {
        if (!cancelled) navigate('/', { replace: true });
      } finally {
        clearTimeout(safetyTimer);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center">
          Não foi possível carregar. Verifique sua conexão ou acesse pelo link do seu restaurante.
        </p>
        <Button variant="outline" onClick={() => navigate('/', { replace: true })}>
          Voltar ao início
        </Button>
      </div>
    );
  }

  const roles = user?.profile_roles?.length
    ? user.profile_roles
    : user?.profile_role
      ? [user.profile_role]
      : [];
  const isGerente = roles.includes('gerente');

  const visibleButtons = isGerente
    ? APP_BUTTONS
    : APP_BUTTONS.filter((btn) => btn.role !== 'gerente' && roles.includes(btn.role));

  const handleLogout = () => {
    base44.auth.logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 pb-8">
      <div className="max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Acesso Colaborador</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{user?.full_name || user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700" title="Sair">
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Escolha a função para continuar:
        </p>

        <div className="grid grid-cols-2 gap-4">
          {visibleButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <Link key={btn.id} to={btn.path}>
                <Button
                  variant="ghost"
                  className={`w-full h-24 sm:h-28 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${btn.color} ${btn.hoverColor} text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl`}
                >
                  <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
                  <span className="text-xs sm:text-sm font-medium text-center px-1">{btn.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {visibleButtons.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Nenhuma função disponível para seu perfil.</p>
            <p className="text-sm mt-2">Entre em contato com o administrador.</p>
            <Button variant="outline" className="mt-4" onClick={handleLogout}>Sair</Button>
          </div>
        )}
      </div>
    </div>
  );
}
