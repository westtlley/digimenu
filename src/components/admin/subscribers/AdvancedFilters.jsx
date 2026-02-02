import React, { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { differenceInDays } from 'date-fns';

/**
 * Componente de filtros avançados para assinantes
 */
export default function AdvancedFilters({ subscribers = [], onFilterChange }) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    plan: [],
    expires_soon: false, // expira em < 30 dias
    has_password: null, // true, false, null (todos)
    search: ''
  });

  // Aplicar filtros
  const applyFilters = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    const filtered = subscribers.filter(sub => {
      // Filtro por status
      if (updatedFilters.status.length > 0 && !updatedFilters.status.includes(sub.status)) {
        return false;
      }

      // Filtro por plano
      if (updatedFilters.plan.length > 0 && !updatedFilters.plan.includes(sub.plan)) {
        return false;
      }

      // Filtro por expiração próxima
      if (updatedFilters.expires_soon) {
        if (!sub.expires_at) return false;
        const daysUntilExpiration = differenceInDays(new Date(sub.expires_at), new Date());
        if (daysUntilExpiration > 30 || daysUntilExpiration < 0) {
          return false;
        }
      }

      // Filtro por senha definida
      if (updatedFilters.has_password !== null) {
        const hasPassword = !!sub.has_password;
        if (hasPassword !== updatedFilters.has_password) {
          return false;
        }
      }

      return true;
    });

    onFilterChange?.(filtered);
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: [],
      plan: [],
      expires_soon: false,
      has_password: null,
      search: ''
    };
    setFilters(emptyFilters);
    onFilterChange?.(subscribers);
  };

  const activeFiltersCount = [
    filters.status.length,
    filters.plan.length,
    filters.expires_soon,
    filters.has_password !== null
  ].filter(Boolean).reduce((sum, val) => sum + (typeof val === 'number' ? val : 1), 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filtros Avançados</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
            <Select
              value={filters.status[0] || 'all'}
              onValueChange={(value) => {
                const status = value === 'all' ? [] : [value];
                applyFilters({ status });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plano */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Plano</label>
            <Select
              value={filters.plan[0] || 'all'}
              onValueChange={(value) => {
                const plan = value === 'all' ? [] : [value];
                applyFilters({ plan });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Gratuito</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiração */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Expira em &lt; 30 dias</label>
            <Button
              variant={filters.expires_soon ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => applyFilters({ expires_soon: !filters.expires_soon })}
            >
              {filters.expires_soon ? 'Sim' : 'Não'}
            </Button>
          </div>

          {/* Senha Definida */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Senha Definida</label>
            <Select
              value={filters.has_password === null ? 'all' : filters.has_password ? 'yes' : 'no'}
              onValueChange={(value) => {
                const has_password = value === 'all' ? null : value === 'yes';
                applyFilters({ has_password });
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Sim</SelectItem>
                <SelectItem value="no">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t">
              <div className="flex flex-wrap gap-1">
                {filters.status.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Status: {filters.status.join(', ')}
                  </Badge>
                )}
                {filters.plan.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Plano: {filters.plan.join(', ')}
                  </Badge>
                )}
                {filters.expires_soon && (
                  <Badge variant="secondary" className="text-xs">
                    Expira em &lt; 30 dias
                  </Badge>
                )}
                {filters.has_password !== null && (
                  <Badge variant="secondary" className="text-xs">
                    Senha: {filters.has_password ? 'Sim' : 'Não'}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
