import React from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function PizzaOverviewPanel({
  profiles,
  businessProfile,
  businessProfileId,
  onBusinessProfileChange,
  pizzaTemplateCards,
  recommendedTemplateId,
  commercialSummaryPresentation,
  commercialSummary,
  evolutionModeEnabled,
  onEvolutionModeChange,
  evolutionSummary,
  canRunAdminActions,
  autoImprovePlan,
  onAutoImproveStructure,
  onOpenInsights,
  onOpenPreview,
  onOpenMenu,
  pizzaGuideSteps,
}) {
  const recommendedTemplateName = pizzaTemplateCards.find((template) => template.id === recommendedTemplateId)?.name || 'Tradicional';

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Perfil adaptativo</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">Qual o perfil da sua pizzaria?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                O sistema ajusta leitura, score, templates e oportunidades para o seu jeito de vender.
              </p>
            </div>
            <Badge className="w-fit bg-slate-900 text-white">{businessProfile.badge}</Badge>
          </div>

          <div className="mt-5 -mx-1 overflow-x-auto pb-1 md:mx-0 md:overflow-visible">
            <div className="flex gap-3 px-1 md:grid md:grid-cols-2 md:px-0 xl:grid-cols-3">
              {profiles.map((profile) => {
                const active = businessProfileId === profile.id;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onBusinessProfileChange(profile.id)}
                    className={`min-w-[240px] rounded-2xl border p-4 text-left transition-all duration-200 md:min-w-0 ${
                      active
                        ? 'border-orange-300 bg-orange-50 shadow-sm ring-2 ring-orange-100'
                        : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{profile.label}</p>
                      <Badge variant={active ? 'default' : 'outline'} className={active ? 'bg-orange-500 hover:bg-orange-500' : ''}>
                        {profile.badge}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{profile.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Recomendacao principal para {businessProfile.label}</p>
                <p className="mt-1 text-sm text-slate-600">{businessProfile.description}</p>
              </div>
              <Badge variant="outline" className="border-orange-200 bg-white text-orange-700">
                Template sugerido: {recommendedTemplateName}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className={`rounded-3xl p-4 shadow-sm sm:p-5 ${commercialSummaryPresentation.className}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className={commercialSummaryPresentation.badgeClass}>Leitura continua</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">{commercialSummaryPresentation.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{commercialSummaryPresentation.description}</p>
              </div>
              <Badge variant="outline" className={commercialSummaryPresentation.badgeClass}>{commercialSummary.level}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entradas fortes</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{commercialSummary.strong + commercialSummary.good}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Entradas fracas</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{commercialSummary.weak}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Evolucao automatica</Badge>
                <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">Continuar melhorando automaticamente</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  O sistema segue observando novas oportunidades e oculta alertas resolvidos sem mexer nos seus dados sozinho.
                </p>
              </div>
              <Switch checked={evolutionModeEnabled} onCheckedChange={onEvolutionModeChange} />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-900">{evolutionSummary.title}</p>
              <p className="mt-1 text-sm text-slate-600">{evolutionSummary.description}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-3xl border-slate-200 p-4 shadow-sm sm:p-5">
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Acoes rapidas</Badge>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Resolva os pontos principais em poucos toques</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            As configuracoes detalhadas continuam nas secoes tecnicas. Aqui ficam os atalhos que mais destravam a operacao.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Button
              type="button"
              className="min-h-11 justify-start bg-orange-500 hover:bg-orange-600"
              onClick={onAutoImproveStructure}
              disabled={!canRunAdminActions || !autoImprovePlan.canImprove}
            >
              Melhorar automaticamente
            </Button>
            <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={onOpenInsights}>
              Abrir oportunidades
            </Button>
            <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={onOpenPreview}>
              Ver preview do cliente
            </Button>
            <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={onOpenMenu}>
              Revisar entradas
            </Button>
          </div>
        </Card>

        <div className="md:hidden">
          <Card className="rounded-3xl border-slate-200 p-4 shadow-sm">
            <Accordion type="single" collapsible defaultValue="guide">
              <AccordionItem value="guide" className="border-none">
                <AccordionTrigger className="py-0 text-left hover:no-underline">
                  <div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Mapa da pizzaria</Badge>
                    <p className="mt-3 text-base font-semibold text-slate-900">Navegue por etapa, sem se perder na tela</p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <div className="grid gap-3">
                    {pizzaGuideSteps.map((step) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => step.onSelect?.()}
                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                            {step.step}
                          </span>
                          <Badge variant="outline">{step.metric}</Badge>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{step.description}</p>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        <Card className="hidden rounded-3xl border-slate-200 p-5 shadow-sm md:block">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Mapa da pizzaria</Badge>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">Tudo organizado por etapa, sem scroll longo</h3>
            </div>
            <Badge className="w-fit bg-slate-900 text-white">Secao ativa: Visao Geral</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pizzaGuideSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => step.onSelect?.()}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {step.step}
                  </span>
                  <Badge variant="outline">{step.metric}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-600">{step.description}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
