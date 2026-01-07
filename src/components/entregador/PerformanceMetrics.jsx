import React from 'react';
import { TrendingUp, TrendingDown, Clock, Star, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export default function PerformanceMetrics({ orders, entregador, darkMode }) {
  const completed = orders.filter(o => o.status === 'delivered');
  const cancelled = orders.filter(o => o.status === 'cancelled' && o.entregador_id === entregador.id);
  const total = completed.length + cancelled.length;

  const completionRate = total > 0 ? ((completed.length / total) * 100).toFixed(1) : 100;
  const cancellationRate = total > 0 ? ((cancelled.length / total) * 100).toFixed(1) : 0;

  const onTimeDeliveries = completed.filter(o => {
    if (!o.accepted_at || !o.delivered_at) return false;
    const start = new Date(o.accepted_at);
    const end = new Date(o.delivered_at);
    const minutes = (end - start) / 60000;
    const expectedTime = (o.prep_time || 30) + 20; // prep time + delivery time
    return minutes <= expectedTime;
  }).length;

  const punctualityRate = completed.length > 0 
    ? ((onTimeDeliveries / completed.length) * 100).toFixed(1) 
    : 100;

  const avgRating = entregador.rating || 5.0;
  const totalRatings = entregador.total_ratings || 0;

  const metrics = [
    {
      label: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      progress: parseFloat(completionRate),
      icon: CheckCircle,
      color: parseFloat(completionRate) >= 95 ? 'text-green-600' : 'text-yellow-600',
      trend: parseFloat(completionRate) >= 95 ? 'up' : 'down',
      description: `${completed.length} de ${total} pedidos concluídos`
    },
    {
      label: 'Pontualidade',
      value: `${punctualityRate}%`,
      progress: parseFloat(punctualityRate),
      icon: Clock,
      color: parseFloat(punctualityRate) >= 90 ? 'text-green-600' : 'text-orange-600',
      trend: parseFloat(punctualityRate) >= 90 ? 'up' : 'down',
      description: `${onTimeDeliveries} entregas no prazo`
    },
    {
      label: 'Avaliação Média',
      value: avgRating.toFixed(1),
      progress: (avgRating / 5) * 100,
      icon: Star,
      color: avgRating >= 4.5 ? 'text-yellow-600' : 'text-orange-600',
      trend: avgRating >= 4.5 ? 'up' : 'down',
      description: `${totalRatings} avaliações recebidas`
    },
    {
      label: 'Taxa de Cancelamento',
      value: `${cancellationRate}%`,
      progress: parseFloat(cancellationRate),
      icon: XCircle,
      color: parseFloat(cancellationRate) <= 5 ? 'text-green-600' : 'text-red-600',
      trend: parseFloat(cancellationRate) <= 5 ? 'up' : 'down',
      description: `${cancelled.length} pedidos cancelados`
    }
  ];

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Indicadores de Desempenho
        </h3>
        <TrendingUp className="w-5 h-5 text-green-600" />
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {metric.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${metric.color}`}>
                    {metric.value}
                  </span>
                  <TrendIcon className={`w-4 h-4 ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
              <Progress value={metric.progress} className="h-2" />
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Performance Tips */}
      <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border`}>
        <p className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'} mb-1`}>
          💡 Dica de Desempenho
        </p>
        <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
          {parseFloat(completionRate) < 95 && 'Mantenha uma alta taxa de conclusão para melhorar seu perfil!'}
          {parseFloat(punctualityRate) < 90 && 'Entregas pontuais aumentam sua avaliação!'}
          {avgRating < 4.5 && 'Seja educado e cuidadoso para receber melhores avaliações!'}
          {parseFloat(completionRate) >= 95 && parseFloat(punctualityRate) >= 90 && avgRating >= 4.5 && 
            'Excelente desempenho! Continue assim! 🌟'}
        </p>
      </div>
    </div>
  );
}