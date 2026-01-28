import React from 'react';
import { FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllPlanTemplates } from '@/utils/planTemplates';

/**
 * Seletor de templates de planos
 */
export default function PlanTemplates({ onSelectTemplate }) {
  const templates = getAllPlanTemplates();

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template && onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 block">
        Templates Rápidos (opcional)
      </label>
      <Select onValueChange={handleTemplateSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolher template para preencher automaticamente" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">{template.name}</span>
                </div>
                <span className="text-xs text-gray-500 mt-0.5">
                  {template.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500">
        Templates preenchem automaticamente as permissões. Você pode ajustar depois.
      </p>
    </div>
  );
}
