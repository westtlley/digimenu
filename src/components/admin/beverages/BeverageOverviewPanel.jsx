import React from 'react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from '@/i18n/LanguageContext';

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
  orderOptimizationSummary,
  decisionSummary,
  currentUpsellBeverage,
  topBeverages,
  uncoveredCategories,
  quickActions,
  onQuickAction,
  onOpenSection,
}) {
  const { t } = useLanguage();
  const beverageOverviewText = t('beverages.overview');
  const learningReadout =
    performanceSummary?.learning_state === 'aprendendo_com_dados'
      ? beverageOverviewText.learning.live
      : performanceSummary?.learning_state === 'dados_iniciais'
        ? beverageOverviewText.learning.early
        : beverageOverviewText.learning.fallback;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">{beverageOverviewText.commercialReadoutBadge}</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">{beverageOverviewText.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {beverageOverviewText.description}
              </p>
            </div>
            <Badge className="w-fit bg-slate-900 text-white">{moduleSummary.level}</Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.activeLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.activeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.strongGoodLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.strong + moduleSummary.good}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.weakLabel}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.weak}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.categoriesWithoutUpsell}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{moduleSummary.categoriesWithoutUpsell}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.moduleAcceptance}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{Number(performanceSummary?.module_acceptance_rate || 0).toFixed(0)}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.generatedRevenue}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(performanceSummary?.total_revenue_generated || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.realMargin}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{performanceSummary?.real_margin_coverage || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.nextStrongAction}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{orderOptimizationSummary?.top_action_label || 'Fallback seguro'}</p>
            </div>
          </div>

          <div className={`mt-4 rounded-2xl border p-4 ${toneClassByLevel[moduleSummary.level] || toneClassByLevel.BASICO}`}>
            <p className="text-sm font-semibold text-slate-900">{moduleSummary.title}</p>
            <p className="mt-2 text-sm text-slate-700">
              {beverageOverviewText.commercialReadout}
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{beverageOverviewText.realUpsellBadge}</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">{beverageOverviewText.currentUpsellTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {beverageOverviewText.currentUpsellDescription}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenSection('links')}>
                {beverageOverviewText.reviewLinks}
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {currentUpsellBeverage ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{currentUpsellBeverage.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {beverageOverviewText.activeUpsellDescription}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">{beverageOverviewText.noActiveDrink}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {beverageOverviewText.inactiveUpsellDescription}
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.dataReadout}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{learningReadout}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.automaticDecision}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {decisionSummary?.primary_beverage_name
                  ? beverageOverviewText.automaticLeader(decisionSummary.primary_beverage_name)
                  : beverageOverviewText.automaticFallback}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {decisionSummary?.primary_reason || beverageOverviewText.automaticFallbackDescription}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white text-slate-700">
                  {beverageOverviewText.fixedCount(decisionSummary?.fixed_count || 0)}
                </Badge>
                <Badge variant="outline" className="bg-white text-slate-700">
                  {decisionSummary?.automation_disabled_count || 0} {beverageOverviewText.outOfAutomation}
                </Badge>
                {decisionSummary?.active_ab_test ? (
                  <Badge variant="outline" className="bg-white text-slate-700">{beverageOverviewText.abTestActive}</Badge>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{beverageOverviewText.quickActions}</Badge>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{beverageOverviewText.quickActionsTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {beverageOverviewText.quickActionsDescription}
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
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">{beverageOverviewText.wholeOrderBadge}</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">{beverageOverviewText.topCombination}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {beverageOverviewText.topCombinationDescription}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => onOpenSection('insights')}>
                {beverageOverviewText.seeCombinations}
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              {combinationSummary?.main_combination_label ? (
                <>
                  <p className="text-sm font-semibold text-slate-900">{combinationSummary.main_combination_label}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {combinationSummary?.top_combinations?.[0]
                      ? beverageOverviewText.topCombinationAcceptance(
                          Number(combinationSummary.top_combinations[0].acceptance_rate || 0).toFixed(0),
                          Number(combinationSummary.top_combinations[0].combination_score || 0).toFixed(0)
                        )
                      : beverageOverviewText.topCombinationFallback}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">{beverageOverviewText.buildingCombinationData}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {beverageOverviewText.buildingCombinationDescription}
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-white text-slate-700">
                {beverageOverviewText.combinationsWithData(combinationSummary?.total_combinations_with_data || 0)}
              </Badge>
              <Badge variant="outline" className="bg-white text-slate-700">
                {beverageOverviewText.actionsWithData(orderOptimizationSummary?.total_actions_with_data || 0)}
              </Badge>
              {(combinationSummary?.top_combinations || []).slice(0, 2).map((entry) => (
                <Badge key={`combo:${entry.combination_id || entry.combo_label}`} variant="outline" className="bg-white text-slate-700">
                  {entry.combo_label}
                </Badge>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{beverageOverviewText.globalOrderDecision}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {orderOptimizationSummary?.top_action_reason || beverageOverviewText.nextOrderActionFallback}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{beverageOverviewText.topPotentialBadge}</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{beverageOverviewText.topPotentialTitle}</h3>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenSection('catalog')}>
              {beverageOverviewText.openCatalog}
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
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{beverageOverviewText.missingDrinkBadge}</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{beverageOverviewText.missingDrinkTitle}</h3>
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenSection('links')}>
              {beverageOverviewText.fixLinks}
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
              <p className="text-sm font-semibold text-emerald-800">{beverageOverviewText.mainCategoriesCovered}</p>
              <p className="mt-2 text-sm text-emerald-700">
                {beverageOverviewText.stableCoverage}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}



