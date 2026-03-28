import React from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uiText } from '@/i18n/pt-BR/uiText';

export default function PizzaInsightsPanel({
  businessProfile,
  visibleAdaptiveRecommendations,
  onAdaptiveRecommendation,
  pizzaGuidanceCards,
  autoImprovePlan,
  onAutoImproveStructure,
  canRunAdminActions,
  pizzaTemplateCards,
  selectedTemplateId,
  onSelectTemplateId,
  onTemplateAction,
  assistantActions,
  runningAssistantActionId,
  onAssistantAction,
}) {
  const pizzaInsightsText = uiText.pizza.insights;
  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Oportunidades para melhorar vendas</Badge>
            <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">{pizzaInsightsText.nextStepTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {pizzaInsightsText.nextStepDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white text-slate-700">{visibleAdaptiveRecommendations.length} oportunidade(s)</Badge>
            <Badge variant="outline" className="bg-white text-slate-700">{businessProfile.badge}</Badge>
          </div>
        </div>

        {visibleAdaptiveRecommendations.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {visibleAdaptiveRecommendations.map((recommendation) => {
              const toneClass = recommendation.severity === 'critical'
                ? 'border-rose-200 bg-rose-50/80'
                : recommendation.severity === 'important'
                  ? 'border-amber-200 bg-amber-50/80'
                  : 'border-sky-200 bg-sky-50/80';
              const badgeLabel = recommendation.severity === 'critical'
                ? 'Critico'
                : recommendation.severity === 'important'
                  ? 'Importante'
                  : 'Oportunidade';

              return (
                <div key={recommendation.id} className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="bg-white text-slate-700">{badgeLabel}</Badge>
                    <Badge variant="outline" className="bg-white text-slate-700">{businessProfile.badge}</Badge>
                  </div>
                  <h4 className="mt-3 text-base font-semibold text-slate-900">{recommendation.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.description}</p>
                  <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Impacto estimado</p>
                    <p className="mt-1 text-sm text-slate-700">{recommendation.impact}</p>
                  </div>
                  <Button type="button" className="mt-4 w-full bg-slate-900 hover:bg-slate-800 sm:w-auto" onClick={() => onAdaptiveRecommendation(recommendation)}>
                    {recommendation.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
            <p className="text-sm font-semibold text-emerald-800">{pizzaInsightsText.noRelevantAlerts}</p>
            <p className="mt-2 text-sm text-emerald-700">
              {pizzaInsightsText.noRelevantAlertsDescription}
            </p>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{pizzaInsightsText.actionableIntelligence}</Badge>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Leia menos, aja mais</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {pizzaInsightsText.actionableIntelligenceDescription}
          </p>
        </div>

        <Accordion type="multiple" defaultValue={['auto-improve']} className="divide-y divide-slate-200">
          <AccordionItem value="guidance" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Leitura assistida</p>
                <p className="mt-1 text-xs text-slate-500">{pizzaInsightsText.guidanceDescription}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              {pizzaGuidanceCards.length > 0 ? (
                <div className="grid gap-3 pb-1 lg:grid-cols-2">
                  {pizzaGuidanceCards.map((card) => (
                    <div
                      key={card.title}
                      className={`rounded-2xl border p-4 shadow-sm ${
                        card.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/70' :
                        card.tone === 'amber' ? 'border-amber-200 bg-amber-50/70' :
                        card.tone === 'rose' ? 'border-rose-200 bg-rose-50/70' :
                        card.tone === 'sky' ? 'border-sky-200 bg-sky-50/70' :
                        'border-violet-200 bg-violet-50/70'
                      }`}
                    >
                      <Badge variant="outline" className="border-white/70 bg-white/70 text-slate-700">Decisao assistida</Badge>
                      <h4 className="mt-3 text-base font-semibold text-slate-900">{card.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{card.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  Nenhum destaque adicional agora. A base comercial já está bem encaminhada.
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="auto-improve" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Antes vs depois</p>
                <p className="mt-1 text-xs text-slate-500">{pizzaInsightsText.beforeAfterDescription}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              <div className={`rounded-2xl border p-4 shadow-sm ${
                autoImprovePlan.level === 'FORTE'
                  ? 'border-emerald-200 bg-emerald-50/80'
                  : autoImprovePlan.level === 'BOM'
                    ? 'border-sky-200 bg-sky-50/80'
                    : autoImprovePlan.level === 'REGULAR'
                      ? 'border-amber-200 bg-amber-50/80'
                      : 'border-rose-200 bg-rose-50/80'
              }`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Badge variant="outline" className="border-white/80 bg-white/80 text-slate-700">{pizzaInsightsText.automatedImprovement}</Badge>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{autoImprovePlan.summary}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {pizzaInsightsText.automatedImprovementDescription}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-orange-500 hover:bg-orange-600 sm:w-auto"
                    onClick={onAutoImproveStructure}
                    disabled={!canRunAdminActions || !autoImprovePlan.canImprove}
                  >
                    Melhorar estrutura automaticamente
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Antes</p>
                    <div className="mt-2 space-y-2">
                      {autoImprovePlan.before.map((item) => (
                        <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Depois</p>
                    <div className="mt-2 space-y-2">
                      {autoImprovePlan.after.map((item) => (
                        <div key={item} className="rounded-lg bg-emerald-50/60 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {autoImprovePlan.impact.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {autoImprovePlan.impact.map((item) => (
                      <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="templates" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">{pizzaInsightsText.applicableTemplates}</p>
                <p className="mt-1 text-xs text-slate-500">Escolha um caminho comercial e aplique o que for seguro.</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-2">
                {pizzaTemplateCards.map((template) => {
                  const selected = selectedTemplateId === template.id;
                  return (
                  <div key={template.id} className={`rounded-2xl border p-4 transition-all ${selected ? 'ring-2 ring-orange-100' : ''} ${template.accent}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{template.name}</p>
                        <div className="flex flex-wrap justify-end gap-2">
                          {template.recommended ? (
                            <Badge variant="outline" className="border-orange-200 bg-white text-orange-700">
                              Recomendado
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="border-current/20 bg-white/70">{template.badge}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 text-sm font-medium">{template.audience}</p>
                      <p className="mt-2 text-sm leading-6">{template.description}</p>
                      <div className="mt-3 space-y-2">
                        {template.impact.map((item) => (
                          <div key={item} className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm">
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          className={selected ? 'bg-slate-900 hover:bg-slate-800' : ''}
                          onClick={() => onSelectTemplateId(template.id)}
                        >
                          Ver impacto
                        </Button>
                        <Button
                          type="button"
                          onClick={() => onTemplateAction(template.id)}
                          className="bg-orange-500 hover:bg-orange-600"
                          disabled={!canRunAdminActions && template.actionMode !== 'assist'}
                        >
                          {template.actionLabel}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="actions" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Acoes recomendadas</p>
                <p className="mt-1 text-xs text-slate-500">Ajustes pontuais que destravam venda sem abrir telas demais.</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              {assistantActions.length > 0 ? (
                <div className="grid gap-3">
                  {assistantActions.map((action) => (
                    <div key={action.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{action.description}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onAssistantAction(action.id)}
                        disabled={runningAssistantActionId === action.id || !canRunAdminActions}
                      >
                        {runningAssistantActionId === action.id ? 'Aplicando...' : action.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  {pizzaInsightsText.noPendingAction}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
