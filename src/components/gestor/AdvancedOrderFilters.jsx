import React, { useState } from 'react';
import { Search, Filter, X, Calendar, User, Phone, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'new', label: 'Novos' },
  { value: 'accepted', label: 'Aceitos' },
  { value: 'preparing', label: 'Em Preparo' },
  { value: 'ready', label: 'Prontos' },
  { value: 'out_for_delivery', label: 'Em Entrega' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'cancelled', label: 'Cancelados' },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'all', label: 'Todos' },
];

const SCHEDULED_HOUR_OPTIONS = [
  { value: 'all', label: 'Qualquer horário' },
  { value: '11', label: '11h' }, { value: '12', label: '12h' }, { value: '13', label: '13h' }, { value: '14', label: '14h' },
  { value: '18', label: '18h' }, { value: '19', label: '19h' }, { value: '20', label: '20h' }, { value: '21', label: '21h' },
];

export default function AdvancedOrderFilters({ 
  orders = [], 
  onFilterChange,
  searchTerm,
  onSearchChange,
  entregadores = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    period: 'today',
    searchType: 'code',
    entregador: 'all',
    scheduledHour: 'all',
  });

  const activeFiltersCount = [filters.status, filters.period, filters.entregador, filters.scheduledHour]
    .filter(v => v !== 'all' && v !== 'today').length;

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filterValues) => {
    const list = Array.isArray(orders) ? orders : [];
    let filtered = [...list];

    // Filtrar por status
    if (filterValues.status !== 'all') {
      filtered = filtered.filter(o => o.status === filterValues.status);
    }

    // Filtrar por período
    const now = new Date();
    if (filterValues.period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(o => {
        if (!o.created_date) return true; // manter se data ausente (evita esconder pedidos)
        const d = new Date(o.created_date);
        if (isNaN(d.getTime())) return true; // manter se data inválida
        return d >= today;
      });
    } else if (filterValues.period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.created_date) >= weekAgo);
    } else if (filterValues.period === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.created_date) >= monthAgo);
    }

    // Filtrar por entregador
    if (filterValues.entregador && filterValues.entregador !== 'all') {
      filtered = filtered.filter(o => String(o.entregador_id) === String(filterValues.entregador));
    }

    // Filtrar por horário agendado (ex.: 12h, 13h)
    if (filterValues.scheduledHour && filterValues.scheduledHour !== 'all') {
      filtered = filtered.filter(o => o.scheduled_time && String(o.scheduled_time).slice(0, 2) === String(filterValues.scheduledHour));
    }

    // Aplicar busca se houver termo
    if (searchTerm) {
      if (filterValues.searchType === 'code') {
        filtered = filtered.filter(o => 
          o.order_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else if (filterValues.searchType === 'customer') {
        filtered = filtered.filter(o => 
          o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else if (filterValues.searchType === 'phone') {
        filtered = filtered.filter(o => 
          o.customer_phone?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
        );
      }
    }

    onFilterChange(filtered);
  };

  const clearFilters = () => {
    const defaultFilters = {
      status: 'all',
      period: 'today',
      searchType: 'code',
      entregador: 'all',
      scheduledHour: 'all',
    };
    setFilters(defaultFilters);
    applyFilters(defaultFilters);
  };

  // Aplicar filtros quando orders, searchTerm ou filtros mudarem
  React.useEffect(() => {
    applyFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchTerm, filters.status, filters.period, filters.entregador, filters.scheduledHour]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Busca com tipo */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Select 
          value={filters.searchType} 
          onValueChange={(value) => handleFilterChange('searchType', value)}
        >
          <SelectTrigger className="absolute left-10 top-1/2 -translate-y-1/2 h-6 w-20 text-xs border-none bg-transparent focus:ring-0 p-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                Código
              </div>
            </SelectItem>
            <SelectItem value="customer">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Cliente
              </div>
            </SelectItem>
            <SelectItem value="phone">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Telefone
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={`Buscar por ${filters.searchType === 'code' ? 'código' : filters.searchType === 'customer' ? 'cliente' : 'telefone'}...`}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-32 h-9"
        />
      </div>

      {/* Filtros Avançados */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 relative">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-orange-500 text-white">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filtros Avançados</h3>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 text-xs text-red-600 hover:text-red-700"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Status
              </label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                <Calendar className="w-3 h-3 inline mr-1" />
                Período
              </label>
              <Select 
                value={filters.period} 
                onValueChange={(value) => handleFilterChange('period', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entregador */}
            {entregadores.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Entregador</label>
                <Select value={filters.entregador} onValueChange={(v) => handleFilterChange('entregador', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {entregadores.map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name || e.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Agendado para (horário) */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">Agendado para</label>
              <Select value={filters.scheduledHour} onValueChange={(v) => handleFilterChange('scheduledHour', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULED_HOUR_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Badges de filtros ativos */}
            {activeFiltersCount > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500 mb-2">Filtros ativos:</p>
                <div className="flex flex-wrap gap-1.5">
                  {filters.status !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {STATUS_OPTIONS.find(o => o.value === filters.status)?.label}
                      <button
                        onClick={() => handleFilterChange('status', 'all')}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {filters.period !== 'today' && (
                    <Badge variant="outline" className="text-xs">
                      {PERIOD_OPTIONS.find(o => o.value === filters.period)?.label}
                      <button onClick={() => handleFilterChange('period', 'today')} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {filters.entregador !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {entregadores.find(e => String(e.id) === filters.entregador)?.name || 'Entregador'}
                      <button onClick={() => handleFilterChange('entregador', 'all')} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                  {filters.scheduledHour !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      {SCHEDULED_HOUR_OPTIONS.find(o => o.value === filters.scheduledHour)?.label}
                      <button onClick={() => handleFilterChange('scheduledHour', 'all')} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}