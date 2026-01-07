import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Edit, Trash2, CreditCard, DollarSign, 
  Wallet, Gift, Car, ShoppingBag, TrendingUp
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DEFAULT_PAYMENT_METHODS = [
  { id: 'dinheiro', name: 'Dinheiro', icon: '💵', type: 'presencial', active: true },
  { id: 'cartao_debito', name: 'Cartão de Débito', icon: '💳', type: 'presencial', active: true },
  { id: 'cartao_credito', name: 'Cartão de Crédito', icon: '💳', type: 'presencial', active: true },
  { id: 'pix', name: 'Pix', icon: '📱', type: 'presencial', active: true },
  { id: 'picpay', name: 'PicPay', icon: '💚', type: 'presencial', active: false },
  { id: 'vale_refeicao', name: 'Vale - Refeição', icon: '🍽️', type: 'presencial', active: false },
  { id: 'vale_vale_card', name: 'Vale - Vale Card', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_green_card', name: 'Vale - Green Card', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_verocard', name: 'Vale - Verocard', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_vr_smart', name: 'Vale - VR Smart', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_cooper_card', name: 'Vale - Cooper Card', icon: '💳', type: 'presencial', active: false },
  { id: 'ben_visa_refeicao', name: 'Ben Visa Refeição', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_sodexo', name: 'Vale - Sodexo', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_alelo_refeicao', name: 'Vale - Alelo Refeição', icon: '💳', type: 'presencial', active: false },
  { id: 'vale_green_card_2', name: 'Vale - Green Card', icon: '💳', type: 'presencial', active: false },
  { id: 'visa_refeicao', name: 'Visa Refeição', icon: '💳', type: 'presencial', active: false },
  { id: 'nutricash_refeicao', name: 'Nutricash Refeição', icon: '💳', type: 'presencial', active: false },
];

export default function PaymentMethodsTab() {
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOnlineConfig, setShowOnlineConfig] = useState(false);
  const [newMethod, setNewMethod] = useState({ name: '', icon: '💳', type: 'presencial' });

  const toggleMethod = (id) => {
    setPaymentMethods(methods => 
      methods.map(m => m.id === id ? { ...m, active: !m.active } : m)
    );
  };

  const addMethod = () => {
    const newId = Date.now().toString();
    setPaymentMethods([...paymentMethods, { ...newMethod, id: newId, active: true }]);
    setShowAddModal(false);
    setNewMethod({ name: '', icon: '💳', type: 'presencial' });
  };

  const deleteMethod = (id) => {
    if (confirm('Remover forma de pagamento?')) {
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
    }
  };

  const activeCount = paymentMethods.filter(m => m.active && m.type === 'presencial').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Pagamentos</h2>
        <p className="text-gray-600">Defina as opções de pagamento que seu cliente poderá escolher na hora de fazer o pedido.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button className="px-4 py-2 font-medium border-b-2 border-red-500 text-red-500">
          CONFIGURAÇÕES
        </button>
        <button 
          onClick={() => setShowOnlineConfig(true)}
          className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
        >
          EXTRATO PAGAMENTO ONLINE
        </button>
      </div>

      {/* Pagamento Online */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pagamento Online</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-500">Recomendamos que use 2 dias úteis</Badge>
            <span className="text-sm">- Financeiro WhatsApp (19) 9 9736-0573</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm font-medium">Pix Online</span>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Pagamento Presencial */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pagamento Presencial</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{activeCount} formas de pagamento ativas</p>
          </div>
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            ADICIONAR NOVO TIPO DE PAGAMENTO
          </Button>
        </CardHeader>
        <CardContent>
          {activeCount === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Configure métodos de pagamento para começar a vender"
              description="Ative pelo menos uma forma de pagamento para que seus clientes possam fazer pedidos"
              actionLabel="Ativar pagamentos"
              onAction={() => {
                const firstMethod = paymentMethods.find(m => m.type === 'presencial');
                if (firstMethod) toggleMethod(firstMethod.id);
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.filter(m => m.type === 'presencial').map((method) => (
              <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{method.icon}</span>
                  <span className="font-medium">{method.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={method.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {method.active ? 'ATIVO' : 'PASSIVO'}
                  </Badge>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => toggleMethod(method.id)}
                    className="h-8 w-8"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => deleteMethod(method.id)}
                    className="h-8 w-8 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Add Method */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newMethod.name}
                onChange={(e) => setNewMethod({...newMethod, name: e.target.value})}
                placeholder="Ex: Credicard"
              />
            </div>
            <div>
              <Label>Ícone (Emoji)</Label>
              <Input
                value={newMethod.icon}
                onChange={(e) => setNewMethod({...newMethod, icon: e.target.value})}
                placeholder="💳"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={addMethod}
              disabled={!newMethod.name}
              className="bg-green-600 hover:bg-green-700"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Online Config */}
      <Dialog open={showOnlineConfig} onOpenChange={setShowOnlineConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Extrato Pagamento Online</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-gray-500">Nenhuma transação encontrada</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}