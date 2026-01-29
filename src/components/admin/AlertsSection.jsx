import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  TrendingDown,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AlertsSection({ 
  expiringCount = 0,
  inactiveCount = 0,
  activeTrialsCount = 0,
  onViewExpiring,
  onViewInactive,
  onViewTrials
}) {
  const alerts = [
    {
      id: 'expiring',
      icon: Clock,
      title: 'Assinantes Expirando',
      count: expiringCount,
      description: 'Expiram nos próximos 7 dias',
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
      action: onViewExpiring,
      severity: expiringCount > 0 ? 'warning' : 'info'
    },
    {
      id: 'inactive',
      icon: UserX,
      title: 'Inativos Há 30+ Dias',
      count: inactiveCount,
      description: 'Podem estar abandonados',
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      action: onViewInactive,
      severity: inactiveCount > 0 ? 'error' : 'info'
    },
    {
      id: 'trials',
      icon: TrendingDown,
      title: 'Trials Ativos',
      count: activeTrialsCount,
      description: 'Em período de teste agora',
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      action: onViewTrials,
      severity: 'info'
    }
  ];

  const hasAlerts = alerts.some(alert => alert.count > 0);

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            {hasAlerts ? (
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            Atenção Necessária
          </CardTitle>
          {!hasAlerts && (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              Tudo em ordem
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                  alert.bgColor,
                  alert.borderColor,
                  alert.count > 0 ? "hover:shadow-md" : "opacity-60"
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    alert.count > 0 ? alert.bgColor : "bg-gray-100"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      alert.count > 0 ? alert.textColor : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={cn(
                        "font-semibold text-sm",
                        alert.count > 0 ? alert.textColor : "text-gray-500"
                      )}>
                        {alert.title}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs font-bold",
                          alert.count > 0 ? alert.textColor : "text-gray-500"
                        )}
                      >
                        {alert.count}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  </div>
                </div>
                {alert.count > 0 && alert.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={alert.action}
                    className={cn(
                      "hover:bg-white/50",
                      alert.textColor
                    )}
                  >
                    Ver
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
