import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ShoppingCart, CheckCircle2, TrendingUp, Sparkles, Package } from 'lucide-react';

const toNumber = (value) => Number(value || 0);
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

function MetricCard({ title, value, helper, icon: Icon }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{title}</p>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {helper ? <p className="text-[11px] text-muted-foreground mt-1">{helper}</p> : null}
    </div>
  );
}

function ProductList({ title, items, valueKey, emptyText }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-3">
        {Array.isArray(items) && items.length > 0 ? (
          <div className="space-y-2">
            {items.slice(0, 5).map((item, index) => (
              <div
                key={`${item?.product_id || item?.combo_id || index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item?.product_name || item?.combo_name || 'Item'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item?.product_id || item?.combo_id || '-'}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {toNumber(item?.[valueKey])}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CommercialAnalyticsPanel({ menuContext }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['commercialAnalyticsDashboard', menuContext?.type, menuContext?.value],
    enabled: !!menuContext,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const params = { days: 30 };
      if (menuContext?.type === 'subscriber' && menuContext?.value) {
        params.as_subscriber = menuContext.value;
      }
      const response = await base44.get('/analytics/commercial-dashboard', params);
      return response?.metrics || {};
    }
  });

  const totals = data?.totals || {};
  const rates = data?.rates || {};
  const views = toNumber(totals.product_views);
  const adds = toNumber(totals.add_to_cart);
  const checkouts = toNumber(totals.checkout_started);
  const orders = toNumber(totals.order_completed);
  const upsellShown = toNumber(totals.upsell_shown);
  const upsellAccepted = toNumber(totals.upsell_accepted);
  const combosClicked = toNumber(totals.combo_clicked);
  const combosAdded = toNumber(totals.combo_added);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics Comercial (30 dias)
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Conversao de cardapio, carrinho, checkout, upsell e combos.
            </p>
          </div>
          {isError ? (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricCard
            title="Visualizacoes"
            value={views}
            helper="Abertura de produtos"
            icon={Eye}
          />
          <MetricCard
            title="Add no carrinho"
            value={adds}
            helper={`View -> Add: ${formatPercent(rates.view_to_cart)}`}
            icon={ShoppingCart}
          />
          <MetricCard
            title="Checkout iniciado"
            value={checkouts}
            helper={`Checkout -> Pedido: ${formatPercent(rates.checkout_to_order)}`}
            icon={CheckCircle2}
          />
          <MetricCard
            title="Pedidos concluidos"
            value={orders}
            helper="Pedidos finalizados"
            icon={Package}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-card/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Upsell
              </p>
              <Badge variant="outline">{formatPercent(rates.upsell_acceptance)}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>Mostrado: <span className="font-medium text-foreground">{upsellShown}</span></p>
              <p>Aceito: <span className="font-medium text-foreground">{upsellAccepted}</span></p>
              <p>Rejeitado: <span className="font-medium text-foreground">{toNumber(totals.upsell_rejected)}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Combos
              </p>
              <Badge variant="outline">{formatPercent(rates.combo_add_rate)}</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>Clique em combo: <span className="font-medium text-foreground">{combosClicked}</span></p>
              <p>Combo adicionado: <span className="font-medium text-foreground">{combosAdded}</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ProductList
            title="Mais visualizados"
            items={data?.top_viewed_products}
            valueKey="views"
            emptyText={isLoading ? 'Carregando metricas...' : 'Sem visualizacoes no periodo.'}
          />
          <ProductList
            title="Mais adicionados"
            items={data?.top_added_products}
            valueKey="adds"
            emptyText={isLoading ? 'Carregando metricas...' : 'Sem adicoes no periodo.'}
          />
          <Card className="bg-card border-border">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-foreground">Combos mais acionados</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3">
              {Array.isArray(data?.top_combos) && data.top_combos.length > 0 ? (
                <div className="space-y-2">
                  {data.top_combos.slice(0, 5).map((combo, index) => (
                    <div
                      key={`${combo?.combo_id || index}`}
                      className="rounded-lg border border-border/70 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-foreground truncate">{combo?.combo_name || 'Combo'}</p>
                      <div className="mt-1 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>Cliques: {toNumber(combo?.clicks)}</span>
                        <span>Adds: {toNumber(combo?.adds)}</span>
                        <span>Taxa: {formatPercent(combo?.add_rate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isLoading ? 'Carregando metricas...' : 'Sem acoes de combo no periodo.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
