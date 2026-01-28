import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Eye, EyeOff } from 'lucide-react';
import UserAuthButton from '../components/atoms/UserAuthButton';

export default function Cadastro() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Step 1 - Negócio
    cep: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    number: '',
    complement: '',
    
    // Step 2 - Você
    fullName: '',
    storeName: '',
    whatsapp: '',
    email: '',
    password: '',
    
    // Step 3 - Finalização
    segment: '',
    monthlyRevenue: '',
    employees: '',
    howKnew: '',
    referralCode: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.cep) {
        setError('CEP é obrigatório');
        return;
      }
    } else if (step === 2) {
      if (!formData.fullName || !formData.email || !formData.password) {
        setError('Preencha todos os campos obrigatórios');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      // Criar conta e fazer cadastro
      // Por enquanto só redireciona
      alert('Cadastro concluído! Redirecionando para o painel...');
      window.location.href = '/';
    } catch (e) {
      setError('Erro ao criar conta: ' + e.message);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          step >= 1 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {step > 1 ? <Check className="w-5 h-5" /> : '1'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">
          {step === 1 ? 'Conte-nos sobre o seu Negócio' : ''}
        </span>
      </div>

      <div className="w-16 h-0.5 bg-gray-300" />

      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          step >= 2 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {step > 2 ? <Check className="w-5 h-5" /> : '2'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">
          {step === 2 ? 'Conte-nos sobre você' : ''}
        </span>
      </div>

      <div className="w-16 h-0.5 bg-gray-300" />

      <div className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
          step >= 3 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {step > 3 ? <Check className="w-5 h-5" /> : '3'}
        </div>
        <span className="ml-2 text-sm font-medium hidden sm:inline">
          {step === 3 ? 'Finalizando seu cadastro inicial' : ''}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-16 h-16 bg-orange-500 rounded-xl mx-auto flex items-center justify-center text-2xl">
              🍽️
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">BeeFood</h1>
          <div className="flex justify-center">
            <UserAuthButton />
          </div>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Step 1 - Negócio */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Conte-nos sobre o seu Negócio</h2>
            
            <div>
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                value={formData.cep}
                onChange={(e) => handleChange('cep', e.target.value)}
              />
            </div>

            <div>
              <Label>Endereço (Obrigatório)</Label>
              <Input
                placeholder="Digite o endereço"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bairro (Obrigatório)</Label>
                <Input
                  placeholder="Digite o bairro"
                  value={formData.neighborhood}
                  onChange={(e) => handleChange('neighborhood', e.target.value)}
                />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input
                  placeholder=""
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  placeholder=""
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nº (Obrigatório)</Label>
                <Input
                  placeholder="Digite o Nº"
                  value={formData.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                />
              </div>
              <div>
                <Label>Complemento</Label>
                <Input
                  placeholder="Digite o complemento"
                  value={formData.complement}
                  onChange={(e) => handleChange('complement', e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
                VOLTAR
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-red-500 hover:bg-red-600">
                PRÓXIMO
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 - Você */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Conte-nos sobre você</h2>

            <div>
              <Label>Nome Completo (Obrigatório)</Label>
              <Input
                placeholder="Digite o seu nome completo"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
              />
            </div>

            <div>
              <Label>Nome do Estabelecimento (Obrigatório)</Label>
              <Input
                placeholder="Digite o nome do estabelecimento"
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
              />
            </div>

            <div>
              <Label>WhatsApp (Obrigatório)</Label>
              <div className="flex gap-2">
                <Input className="w-20" placeholder="+55" disabled value="+55" />
                <Input
                  placeholder="(86) 98819-6114"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>E-mail (Obrigatório)</Label>
              <Input
                type="email"
                placeholder="seuemail@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label>Senha (Obrigatório)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a sua melhor senha"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                VOLTAR
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-red-500 hover:bg-red-600">
                PRÓXIMO
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 - Finalização */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center mb-6">Finalizando seu cadastro inicial</h2>

            <div>
              <Label>Qual seu segmento?</Label>
              <select 
                value={formData.segment}
                onChange={(e) => handleChange('segment', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione o seu segmento</option>
                <option value="Restaurante">Restaurante</option>
                <option value="Lanchonete">Lanchonete</option>
                <option value="Pizzaria">Pizzaria</option>
                <option value="Hamburgueria">Hamburgueria</option>
                <option value="Açaiteria">Açaiteria</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <Label>Qual seu faturamento mensal em média?</Label>
              <select 
                value={formData.monthlyRevenue}
                onChange={(e) => handleChange('monthlyRevenue', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione o seu faturamento</option>
                <option value="0-5k">Até R$ 5.000</option>
                <option value="5k-10k">R$ 5.000 - R$ 10.000</option>
                <option value="10k-20k">R$ 10.000 - R$ 20.000</option>
                <option value="20k-50k">R$ 20.000 - R$ 50.000</option>
                <option value="50k+">Acima de R$ 50.000</option>
              </select>
            </div>

            <div>
              <Label>Quantas pessoas trabalham com você?</Label>
              <select 
                value={formData.employees}
                onChange={(e) => handleChange('employees', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione uma opção</option>
                <option value="1">Apenas eu</option>
                <option value="2-5">2 a 5 pessoas</option>
                <option value="6-10">6 a 10 pessoas</option>
                <option value="11-20">11 a 20 pessoas</option>
                <option value="20+">Mais de 20 pessoas</option>
              </select>
            </div>

            <div>
              <Label>Como conheceu o BeeFood?</Label>
              <select 
                value={formData.howKnew}
                onChange={(e) => handleChange('howKnew', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecione como conheceu o BeeFood</option>
                <option value="Google">Google</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Indicação">Indicação de amigo</option>
                <option value="Youtube">Youtube</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <Label>Código de Indicação</Label>
              <Input
                placeholder="Digite o seu código de indicação"
                value={formData.referralCode}
                onChange={(e) => handleChange('referralCode', e.target.value)}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                VOLTAR
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-red-500 hover:bg-red-600">
                CONFIRMAR E ACESSAR BEEFOOD
              </Button>
            </div>
          </div>
        )}

        <div className="text-center mt-8 pt-4 border-t text-sm text-gray-500">
          BeeFood - Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}