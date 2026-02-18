import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import ImportCSV from './ImportCSV';
import ExportCSV from './ExportCSV';
import ThemeToggle from '@/components/ui/ThemeToggle';
import UserAuthButton from '@/components/atoms/UserAuthButton';
import { cn } from '@/lib/utils';

/**
 * Header da página Assinantes: título, ações (import/export/novo), dashboard, theme, auth.
 */
export default function SubscribersHeader({
  onAddClick,
  onImport,
  subscribers = [],
  createMutation,
  className,
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className
      )}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Link to={createPageUrl('Admin')}>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label="Voltar para Admin">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0" aria-hidden>
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-lg text-foreground truncate">Gestão de Assinantes</h1>
                <p className="text-muted-foreground text-xs truncate">Gerencie quem tem acesso ao sistema</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={createPageUrl('AdminMasterDashboard')}>
              <Button variant="ghost" size="sm">
                <BarChart3 className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <ImportCSV onImport={onImport} />
            <ExportCSV subscribers={subscribers} />
            <Button onClick={onAddClick} size="sm" className="bg-primary text-primary-foreground hover:opacity-90" aria-label="Novo assinante">
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Assinante
            </Button>
            <ThemeToggle />
            <UserAuthButton />
          </div>
        </div>
      </div>
    </header>
  );
}
