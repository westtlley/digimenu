import React from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function BeverageInsightsPanel({
  recommendations,
  autoPlan,
  uncoveredCategories,
  currentUpsellBeverage,
  onRecommendationAction,
}) {
  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Oportunidades para aumentar ticket</Badge>
            <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">O sistema esta lendo onde bebidas ainda vendem pouco</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              As oportunidades somem quando voce resolve o ponto certo. Nada aqui e alerta vazio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white text-slate-700">{recommendations.length} oportunidade(s)</Badge>
            <Badge variant="outline" className="bg-white text-slate-700">{uncoveredCategories.length} lacuna(s)</Badge>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((recommendation) => {
              const toneClass = recommendation.severity === 'critical'
                ? 'border-rose-200 bg-rose-50/80'
                : recommendation.severity === 'important'
                  ? 'border-amber-200 bg-amber-50/80'
                  : 'border-sky-200 bg-sky-50/80';

              return (
                <div key={recommendation.id} className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className="bg-white text-slate-700">
                      {recommendation.severity === 'critical' ? 'Critico' : recommendation.severity === 'important' ? 'Importante' : 'Oportunidade'}
                    </Badge>
                    {currentUpsellBeverage ? <Badge variant="outline" className="bg-white text-slate-700">Upsell ativo</Badge> : null}
                  </div>
                  <h4 className="mt-3 text-base font-semibold text-slate-900">{recommendation.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation.description}</p>
                  <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Impacto estimado</p>
                    <p className="mt-1 text-sm text-slate-700">{recommendation.impact}</p>
                  </div>
                  <Button
                    type="button"
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 sm:w-auto"
                    onClick={() => onRecommendationAction(recommendation.actionId)}
                  >
                    {recommendation.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
            <p className="text-sm font-semibold text-emerald-800">Nenhuma oportunidade urgente agora.</p>
            <p className="mt-2 text-sm text-emerald-700">
              O modulo de bebidas ja esta cobrindo os pontos mais importantes de upsell e ticket.
            </p>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Antes vs depois</Badge>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Veja o impacto antes de agir</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O sistema mostra o que muda no modulo de bebidas antes de aplicar qualquer melhoria.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={['plan']} className="divide-y divide-slate-200">
          <AccordionItem value="plan" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Plano de melhoria automatica</p>
                <p className="mt-1 text-xs text-slate-500">Acao principal para organizar catalogo, upsell e preview.</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Badge variant="outline" className="bg-white text-slate-700">Plano do modulo</Badge>
                    <h4 className="mt-3 text-lg font-semibold text-slate-900">{autoPlan.summary}</h4>
                    <p className="mt-2 text-sm text-slate-600">
                      O foco aqui e fazer bebida participar do ticket sem criar backend novo nem quebrar o que ja existe.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 sm:w-auto"
                    onClick={() => onRecommendationAction('prepare-beverages')}
                    disabled={!autoPlan.canImprove}
                  >
                    Preparar bebidas para vender
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Antes</p>
                    <div className="mt-2 space-y-2">
                      {autoPlan.before.map((item) => (
                        <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Depois</p>
                    <div className="mt-2 space-y-2">
                      {autoPlan.after.map((item) => (
                        <div key={item} className="rounded-lg bg-emerald-50/60 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {autoPlan.impact.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {autoPlan.impact.map((item) => (
                      <Badge key={item} variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reading" className="border-none">
            <AccordionTrigger className="px-4 py-4 text-left hover:no-underline sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Leitura direta</p>
                <p className="mt-1 text-xs text-slate-500">Sem jargao tecnico. O sistema fala o que realmente importa.</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-0 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Se o upsell esta vazio</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A bebida deixa de aparecer no momento mais valioso da venda. O sistema trata isso como prioridade.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Se falta variedade de volume</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O cliente percebe menos diferenca de valor entre uma lata, uma 600ml e uma bebida familia.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Se bebidas premium estao soltas</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O ticket pode crescer mais, mas o sistema ainda nao esta puxando essa bebida para perto do prato certo.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Se as categorias nao tem apoio</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    O cardapio vira lista de produtos. Com bebida vinculada, ele vira motor de decisao e ticket.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}
