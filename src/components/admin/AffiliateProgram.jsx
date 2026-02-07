import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Share2, TrendingUp, DollarSign, Users, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from '../permissions/usePermission';
import { useOrders } from '@/hooks/useOrders';

/**
 * AffiliateProgram - Programa de Afiliados
 * Funcionalidades:
 * - Cliente indica e ganha bônus
 * - Comissão por venda
 * - Dashboard para afiliados
 * - Links únicos de indicação
 */
export default function AffiliateProgram() {
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  
  // Carregar configurações do localStorage ou usar padrões
  const loadSettings = () => {
    const saved = localStorage.getItem('affiliateSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Se houver erro, usar padrões
      }
    }
    return {
      referrerBonus: 20, // % de desconto
      referredBonus: 10, // R$ OFF
      commissionRate: 10, // % de comissão
      minPayout: 50, // R$ mínimo para saque
    };
  };

  const [settings, setSettings] = useState(loadSettings());

  // ✅ CORREÇÃO: Buscar afiliados com contexto do slug
  const { data: affiliates = [] } = useQuery({
    queryKey: ['affiliates', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Affiliate.list(null, opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Buscar referrals com contexto do slug
  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Referral.list(null, opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Usar hook com contexto automático
  const { data: orders = [] } = useOrders({
    orderBy: '-created_date'
  });

  // Calcular estatísticas
  const stats = {
    totalAffiliates: affiliates.length,
    totalReferrals: referrals.length,
    activeReferrals: referrals.filter(r => r.status === 'completed').length,
    totalCommissions: referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.commission || 0), 0),
    pendingPayouts: referrals
      .filter(r => r.status === 'completed' && !r.paid)
      .reduce((sum, r) => sum + (r.commission || 0), 0),
  };

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      // Salvar configurações em localStorage ou criar entidade AffiliateSettings
      localStorage.setItem('affiliateSettings', JSON.stringify(newSettings));
      return { success: true, settings: newSettings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['affiliateSettings']);
      toast.success('Configurações atualizadas!');
    },
  });

  const generateAffiliateLink = (affiliateId) => {
    const baseUrl = window.location.origin;
    const slug = localStorage.getItem('currentSlug') || '';
    return `${baseUrl}/cardapio?ref=${affiliateId}${slug ? `&slug=${slug}` : ''}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Programa de Afiliados</h2>
          <p className="text-gray-500">Gerencie indicações e comissões</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Total de Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Indicações Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeReferrals}</div>
            <p className="text-xs text-gray-500">{stats.totalReferrals} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-yellow-500" />
              Comissões Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.totalCommissions.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.pendingPayouts.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="affiliates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
          <TabsTrigger value="referrals">Indicações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Lista de Afiliados */}
        <TabsContent value="affiliates">
          <Card>
            <CardHeader>
              <CardTitle>Afiliados Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Link de Indicação</TableHead>
                    <TableHead>Indicações</TableHead>
                    <TableHead>Comissões</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((affiliate) => {
                    const affiliateReferrals = referrals.filter(r => r.affiliate_id === affiliate.id);
                    const totalCommissions = affiliateReferrals
                      .filter(r => r.status === 'completed')
                      .reduce((sum, r) => sum + (r.commission || 0), 0);
                    const link = generateAffiliateLink(affiliate.id);

                    return (
                      <TableRow key={affiliate.id}>
                        <TableCell>{affiliate.name || affiliate.email}</TableCell>
                        <TableCell>{affiliate.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              value={link}
                              readOnly
                              className="w-64 text-xs"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(link)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{affiliateReferrals.length}</TableCell>
                        <TableCell>R$ {totalCommissions.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                            {affiliate.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lista de Indicações */}
        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle>Indicações e Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Cliente Indicado</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => {
                    const order = orders.find(o => o.id === referral.order_id);
                    const affiliate = affiliates.find(a => a.id === referral.affiliate_id);

                    return (
                      <TableRow key={referral.id}>
                        <TableCell>{affiliate?.name || affiliate?.email || 'N/A'}</TableCell>
                        <TableCell>{referral.referred_email || referral.referred_name || 'N/A'}</TableCell>
                        <TableCell>#{order?.order_code || referral.order_id}</TableCell>
                        <TableCell>R$ {order?.total?.toFixed(2) || '0,00'}</TableCell>
                        <TableCell>R$ {referral.commission?.toFixed(2) || '0,00'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              referral.status === 'completed'
                                ? 'default'
                                : referral.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {referral.status === 'completed' ? 'Concluído' :
                             referral.status === 'pending' ? 'Pendente' : 'Cancelado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configurações do Programa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bônus para Quem Indica (%)</Label>
                  <Input
                    type="number"
                    value={settings.referrerBonus}
                    onChange={(e) => setSettings(prev => ({ ...prev, referrerBonus: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Desconto no próximo pedido
                  </p>
                </div>
                <div>
                  <Label>Bônus para Indicado (R$)</Label>
                  <Input
                    type="number"
                    value={settings.referredBonus}
                    onChange={(e) => setSettings(prev => ({ ...prev, referredBonus: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Desconto na primeira compra
                  </p>
                </div>
                <div>
                  <Label>Taxa de Comissão (%)</Label>
                  <Input
                    type="number"
                    value={settings.commissionRate}
                    onChange={(e) => setSettings(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    % sobre cada venda
                  </p>
                </div>
                <div>
                  <Label>Valor Mínimo para Saque (R$)</Label>
                  <Input
                    type="number"
                    value={settings.minPayout}
                    onChange={(e) => setSettings(prev => ({ ...prev, minPayout: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mínimo para solicitar pagamento
                  </p>
                </div>
              </div>
              <Button
                onClick={() => updateSettingsMutation.mutate(settings)}
                disabled={updateSettingsMutation.isLoading}
              >
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
