import React, { useMemo } from 'react';
import { TrendingUp, Users, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, isPast } from 'date-fns';

/**
 * Dashboard de estatísticas de assinantes
 */
export default function SubscriberStats({ subscribers = [] }) {
  const safeSubscribers = Array.isArray(subscribers) ? subscribers : [];
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const active = safeSubscribers.filter(s => s.status === 'active');
    const inactive = safeSubscribers.filter(s => s.status === 'inactive');
    const expired = safeSubscribers.filter(s => {
      if (!s.expires_at) return false;
      return isPast(new Date(s.expires_at));
    });
    const expiringSoon = safeSubscribers.filter(s => {
      if (!s.expires_at) return false;
      const daysUntilExpiration = differenceInDays(new Date(s.expires_at), now);
      return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
    });

    const plans = {
      basic: safeSubscribers.filter(s => s.plan === 'basic').length,
      pro: safeSubscribers.filter(s => s.plan === 'pro').length,
      premium: safeSubscribers.filter(s => s.plan === 'premium').length,
      custom: safeSubscribers.filter(s => s.plan === 'custom').length
    };

    const withPassword = safeSubscribers.filter(s => s.has_password).length;
    const withoutPassword = safeSubscribers.filter(s => !s.has_password).length;

    // Calcular crescimento (últimos 30 dias - simulado, seria melhor ter created_at)
    const recent = safeSubscribers.filter(s => {
      // Assumir que novos assinantes são recentes se não tiver expires_at ou expires_at futuro
      return s.status === 'active' && (!s.expires_at || !isPast(new Date(s.expires_at)));
    });

    return {
      total: safeSubscribers.length,
      active: active.length,
      inactive: inactive.length,
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      plans,
      withPassword,
      withoutPassword,
      recent: recent.length,
      activeRate: safeSubscribers.length > 0 ? ((active.length / safeSubscribers.length) * 100).toFixed(1) : 0
    };
  }, [safeSubscribers]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total de Assinantes */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-8 h-8 text-blue-600" />
          <Badge variant="secondary" className="bg-blue-200 text-blue-800">
            Total
          </Badge>
        </div>
        <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
        <div className="text-sm text-blue-700 mt-1">Assinantes cadastrados</div>
      </Card>

      {/* Taxa de Ativos */}
      <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between mb-2">
          <TrendingUp className="w-8 h-8 text-green-600" />
          <Badge variant="secondary" className="bg-green-200 text-green-800">
            {stats.activeRate}%
          </Badge>
        </div>
        <div className="text-3xl font-bold text-green-900">{stats.active}</div>
        <div className="text-sm text-green-700 mt-1">Assinantes ativos</div>
        {stats.inactive > 0 && (
          <div className="text-xs text-green-600 mt-1">
            {stats.inactive} inativo(s)
          </div>
        )}
      </Card>

      {/* Expirando em Breve */}
      <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <div className="flex items-center justify-between mb-2">
          <Clock className="w-8 h-8 text-yellow-600" />
          <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
            Atenção
          </Badge>
        </div>
        <div className="text-3xl font-bold text-yellow-900">{stats.expiringSoon}</div>
        <div className="text-sm text-yellow-700 mt-1">Expirando em &lt; 30 dias</div>
        {stats.expired > 0 && (
          <div className="text-xs text-red-600 mt-1">
            {stats.expired} já expirado(s)
          </div>
        )}
      </Card>

      {/* Distribuição de Planos */}
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="w-8 h-8 text-purple-600" />
          <Badge variant="secondary" className="bg-purple-200 text-purple-800">
            Planos
          </Badge>
        </div>
        <div className="space-y-1 mt-2">
          {stats.plans.basic > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Básico:</span>
              <span className="font-semibold">{stats.plans.basic}</span>
            </div>
          )}
          {stats.plans.pro > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Pro:</span>
              <span className="font-semibold">{stats.plans.pro}</span>
            </div>
          )}
          {stats.plans.premium > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Premium:</span>
              <span className="font-semibold">{stats.plans.premium}</span>
            </div>
          )}
          {stats.plans.custom > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Custom:</span>
              <span className="font-semibold">{stats.plans.custom}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Segurança - Senhas */}
      {stats.withoutPassword > 0 && (
        <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <span className="font-semibold text-red-900">Atenção: Senhas não definidas</span>
          </div>
          <div className="text-2xl font-bold text-red-900">{stats.withoutPassword}</div>
          <div className="text-sm text-red-700 mt-1">
            {stats.withoutPassword} assinante(s) ainda não definiram senha
          </div>
        </Card>
      )}
    </div>
  );
}
