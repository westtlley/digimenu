import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, MapPin, CreditCard, Bike, Store } from 'lucide-react';

export default function CustomerForm({ customer, setCustomer, darkMode = false }) {
  // Estado local para inputs de texto (evita re-renders constantes)
  const [localName, setLocalName] = useState(customer.name || '');
  const [localPhone, setLocalPhone] = useState(customer.phone || '');
  const [localAddress, setLocalAddress] = useState(customer.address || '');

  // Sincroniza estado local quando customer muda externamente
  useEffect(() => {
    setLocalName(customer.name || '');
    setLocalPhone(customer.phone || '');
    setLocalAddress(customer.address || '');
  }, [customer.name, customer.phone, customer.address]);

  // Atualiza o estado pai no blur (quando sai do campo)
  const handleBlur = (field, value) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  // Para campos que não são texto (radio, select), atualiza direto
  const handleChange = (field, value) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name" className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : ''}`}>
          <User className="w-4 h-4" />
          Nome do Cliente
        </Label>
        <Input
          id="name"
          placeholder="Digite seu nome"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          className={`h-12 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
        />
      </div>

      {/* Telefone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : ''}`}>
          <Phone className="w-4 h-4" />
          Telefone / WhatsApp
        </Label>
        <Input
          id="phone"
          placeholder="(00) 00000-0000"
          value={localPhone}
          onChange={(e) => setLocalPhone(e.target.value)}
          onBlur={(e) => handleBlur('phone', e.target.value)}
          className={`h-12 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
        />
      </div>

      {/* Método de Entrega */}
      <div className="space-y-3">
        <Label className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : ''}`}>
          <Bike className="w-4 h-4" />
          Forma de Recebimento
        </Label>
        <RadioGroup
          value={customer.deliveryMethod || 'pickup'}
          onValueChange={(value) => handleChange('deliveryMethod', value)}
          className="grid grid-cols-2 gap-3"
        >
          <Label
            htmlFor="pickup"
            className={`flex items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              customer.deliveryMethod === 'pickup' 
                ? 'border-green-500 bg-green-50' 
                : darkMode ? 'border-gray-600 hover:border-gray-500 text-gray-300' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <RadioGroupItem value="pickup" id="pickup" className="sr-only" />
            <Store className="w-5 h-5" />
            <span className="font-medium">Retirada</span>
          </Label>
          <Label
            htmlFor="delivery"
            className={`flex items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              customer.deliveryMethod === 'delivery' 
                ? 'border-green-500 bg-green-50' 
                : darkMode ? 'border-gray-600 hover:border-gray-500 text-gray-300' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
            <Bike className="w-5 h-5" />
            <span className="font-medium">Entrega</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Endereço (só se for entrega) */}
      {customer.deliveryMethod === 'delivery' && (
        <div className="space-y-2 animate-in slide-in-from-top duration-200">
          <Label htmlFor="address" className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : ''}`}>
            <MapPin className="w-4 h-4" />
            Endereço de Entrega
          </Label>
          <Textarea
            id="address"
            placeholder="Rua, número, bairro, ponto de referência..."
            value={localAddress}
            onChange={(e) => setLocalAddress(e.target.value)}
            onBlur={(e) => handleBlur('address', e.target.value)}
            className={`min-h-[80px] resize-none ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          />
        </div>
      )}

      {/* Forma de Pagamento */}
      <div className="space-y-2">
        <Label className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : ''}`}>
          <CreditCard className="w-4 h-4" />
          Forma de Pagamento
        </Label>
        <Select
          value={customer.paymentMethod || ''}
          onValueChange={(value) => handleChange('paymentMethod', value)}
        >
          <SelectTrigger className={`h-12 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}>
            <SelectValue placeholder="Selecione a forma de pagamento" />
          </SelectTrigger>
          <SelectContent className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
            <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}