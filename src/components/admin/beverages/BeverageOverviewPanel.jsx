import React from 'react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const toneClassByLevel = {
  FORTE: 'border-emerald-200 bg-emerald-50/80',
  BOM: 'border-sky-200 bg-sky-50/80',
  REGULAR: 'border-amber-200 bg-amber-50/80',
  BASICO: 'border-rose-200 bg-rose-50/80',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export default function BeverageOverviewPanel({
  moduleSummary,
  performanceSummary,
  combinationSummary,
  decisionSummary,
  currentUpsellBeverage,
  topBeverages,
  uncoveredCategories,
  quickActions,
  onQuickAction,
  onOpenSection,
}) {
  const learningReadout =
    performanceSummary?.learning_state === 'aprendendo_com_dados'
      ? 'O modulo ja esta aprendendo com comportamento real.'
      : performanceSummary?.learning_state === 'dados_iniciais'
        ? 'Ja existem sinais reais, mas ainda estamos no inicio da leitura.'
        : 'Sem massa critica de dados ainda. O fallback heuristico continua protegendo o upsell.';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Visao comercial</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">Bebidas deixaram de ser categoria secundaria</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Aqui voce enxerga o potencial de ticket, o que ja esta ajudando no upsell e o que ainda fica escondido no cardapio.
              </p>
            </div>
            <Badge className="w-fit bg-slate-900 text-white">{moduleSummary.level}</Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ativas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.activeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fortes / boas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.strong + moduleSummary.good}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fracas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.weak}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Categorias sem upsell</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.categoriesWithoutUpsell}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aceitacao do modulo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{Number(performanceSummary?.module_acceptance_rate || 0).toFixed(0)}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Receita gerada</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(performanceSummary?.total_revenue_generated || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Margem real</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{performanceSummary?.real_margin_coverage || 0}</p>
            </div>
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${toneClassByLevel[moduleSummary.level] || toneClassByLevel.BASICO}`}>
            <p className="text-sm font-semibold text-slate-900">{moduleSummary.title}</p>
            <p className="mt-2 text-sm text-slate-700">
              O modulo de bebidas agora le o papel comercial do cardapio e destaca onde o ticket ainda pode crescer.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Upsell real</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">Bebida usada hoje no cross-sell</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Esse e o ponto que conversa direto com o motor atual do cardapio e do SmartUpsell.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenSection('links')}>
                Revisar vinculos
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {currentUpsellBeverage ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{currentUpsellBeverage.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Hoje ela esta preparada para aparecer como bebida sugerida no fluxo real do cardapio.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">Nenhuma bebida ativada ainda</p>
                  <p className="mt-1 text-sm text-slate-600">
                    O motor de cross-sell existe, mas ainda nao esta sendo usado por nenhuma bebida.
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leitura dos dados</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{learningReadout}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decisao automatica</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {decisionSummary?.primary_beverage_name
                  ? `${decisionSummary.primary_beverage_name} lidera o upsell automatico`
                  : 'O sistema ainda esta usando fallback seguro para escolher a principal.'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {decisionSummary?.primary_reason || 'Assim que houver dados ou override suficiente, a principal passa a aparecer aqui.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white text-slate-700">
                  {decisionSummary?.fixed_count || 0} fixa(s)
                </Badge>
                <Badge variant="outline" className="bg-white text-slate-700">
                  {decisionSummary?.automation_disabled_count || 0} fora da automacao
                </Badge>
                {decisionSummary?.active_ab_test ? (
                  <Badge variant="outline" className="bg-white text-slate-700">A/B leve ativo</Badge>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Acoes rapidas</Badge>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">Resolva o principal sem abrir tudo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              As configuracoes detalhadas seguem nas secoes tecnicas. Aqui ficam os atalhos que mais aumentam ticket.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant={action.primary ? 'default' : 'outline'}
                  className={action.primary ? 'min-h-11 justify-start bg-cyan-600 hover:bg-cyan-700' : 'min-h-11 justify-start'}
                  onClick={() => onQuickAction(action.id)}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Pedido inteiro</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">Combinacao que mais gera dinheiro agora</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O motor cruzado ja esta lendo prato + bebida para decidir o que sobe junto no pedido.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenSection('insights')}>
                Ver combinacoes
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {combinationSummary?.main_combination_label ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{combinationSummary.main_combination_label}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {combinationSummary?.top_combinations?.[0]
                      ? `${Number(combinationSummary.top_combinations[0].acceptance_rate || 0).toFixed(0)}% de aceitacao com score ${Number(combinationSummary.top_combinations[0].combination_score || 0).toFixed(0)}.`
                      : 'Essa combinacao lidera a leitura cruzada do pedido.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">Ainda juntando massa critica de combinacoes</p>
                  <p className="mt-1 text-sm text-slate-600">
                    O fallback atual segue protegendo o upsell enquanto os dados cruzados amadurecem.
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-white text-slate-700">
                {combinationSummary?.total_combinations_with_data || 0} combinacao(oes)
              </Badge>
              {(combinationSummary?.top_combinations || []).slice(0, 2).map((entry) => (
                <Badge key={`combo:${entry.combination_id || entry.combo_label}`} variant="outline" className="bg-white text-slate-700">
                  {entry.combo_label}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Top potencial</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Bebidas com melhor leitura comercial</h3>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenSection('catalog')}>
              Abrir catalogo
            </Button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {topBeverages.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <Badge variant="outline">{item.level}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.readout}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.packaging ? <Badge variant="outline" className="bg-slate-50">{item.packaging.toUpperCase()}</Badge> : null}
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-slate-50">{tag.replace('_', ' ')}</Badge>
                  ))}
                  {item.performance?.acceptance_rate > 0 ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                      {Number(item.performance.acceptance_rate || 0).toFixed(0)}% aceita
                    </Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Onde falta bebida</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Categorias ainda sem apoio de upsell</h3>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenSection('links')}>
              Corrigir vinculos
            </Button>
          </div>

          {uncoveredCategories.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {uncoveredCategories.slice(0, 8).map((category) => (
                <Badge key={category.id} variant="outline" className="bg-white text-slate-700">
                  {category.name}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-sm font-semibold text-emerald-800">As principais categorias ja contam com uma leitura de bebida.</p>
              <p className="mt-2 text-sm text-emerald-700">
                O modulo ja esta cobrindo os pontos mais sensiveis para upsell de ticket.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
