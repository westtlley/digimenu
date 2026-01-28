import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'saved_addresses';

export default function SavedAddresses({ customer, setCustomer, darkMode = false }) {
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    reference: ''
  });

  // Carregar endereços salvos do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedAddresses(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erro ao carregar endereços salvos:', e);
    }
  }, []);

  // Salvar endereços no localStorage
  const saveToStorage = (addresses) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
      setSavedAddresses(addresses);
    } catch (e) {
      console.error('Erro ao salvar endereços:', e);
    }
  };

  const handleSaveAddress = () => {
    if (!addressForm.name || !addressForm.street || !addressForm.neighborhood) {
      toast.error('Preencha pelo menos: nome, rua e bairro');
      return;
    }

    const newAddress = {
      id: editingAddress?.id || Date.now().toString(),
      name: addressForm.name,
      street: addressForm.street,
      number: addressForm.number || '',
      complement: addressForm.complement || '',
      neighborhood: addressForm.neighborhood,
      reference: addressForm.reference || '',
      createdAt: editingAddress?.createdAt || new Date().toISOString()
    };

    let updated;
    if (editingAddress) {
      updated = savedAddresses.map(a => a.id === editingAddress.id ? newAddress : a);
      toast.success('Endereço atualizado!');
    } else {
      updated = [...savedAddresses, newAddress];
      toast.success('Endereço salvo!');
    }

    saveToStorage(updated);
    setShowAddModal(false);
    setEditingAddress(null);
    setAddressForm({
      name: '', street: '', number: '', complement: '', neighborhood: '', reference: ''
    });
  };

  const handleDeleteAddress = (id) => {
    if (!confirm('Deseja realmente excluir este endereço?')) return;
    
    const updated = savedAddresses.filter(a => a.id !== id);
    saveToStorage(updated);
    toast.success('Endereço excluído!');
  };

  const handleSelectAddress = (address) => {
    setCustomer({
      ...customer,
      address_street: address.street,
      address_number: address.number,
      address_complement: address.complement,
      neighborhood: address.neighborhood,
      address: `${address.street}${address.number ? `, ${address.number}` : ''}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}`
    });
    toast.success(`Endereço "${address.name}" selecionado!`);
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      reference: address.reference || ''
    });
    setShowAddModal(true);
  };

  if (savedAddresses.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Endereços Salvos</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Salvar Atual
          </Button>
        </div>
        {customer.address_street && customer.neighborhood && (
          <p className="text-xs text-gray-500">
            Você pode salvar este endereço para usar novamente
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Endereços Salvos</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingAddress(null);
            setAddressForm({
              name: customer.address_street ? 'Endereço Principal' : 'Novo Endereço',
              street: customer.address_street || '',
              number: customer.address_number || '',
              complement: customer.address_complement || '',
              neighborhood: customer.neighborhood || '',
              reference: ''
            });
            setShowAddModal(true);
          }}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Novo
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {savedAddresses.map((address) => (
            <motion.div
              key={address.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer hover:border-blue-400 ${
                customer.address_street === address.street && customer.neighborhood === address.neighborhood
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
              onClick={() => handleSelectAddress(address)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {address.name}
                    </span>
                    {customer.address_street === address.street && customer.neighborhood === address.neighborhood && (
                      <Badge className="bg-blue-500 text-white text-xs h-4 px-1">
                        <Check className="w-2 h-2 mr-1" />
                        Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {address.street}
                    {address.number && `, ${address.number}`}
                    {address.complement && ` - ${address.complement}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {address.neighborhood}
                  </p>
                </div>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditModal(address)}
                    className="h-7 w-7"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAddress(address.id)}
                    className="h-7 w-7 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Add/Edit */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Endereço' : 'Salvar Endereço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Endereço</Label>
              <Input
                placeholder="Ex: Casa, Trabalho"
                value={addressForm.name}
                onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Rua/Avenida *</Label>
              <Input
                placeholder="Rua, Avenida..."
                value={addressForm.street}
                onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Número</Label>
                <Input
                  placeholder="123"
                  value={addressForm.number}
                  onChange={(e) => setAddressForm({...addressForm, number: e.target.value})}
                />
              </div>
              <div>
                <Label>Bairro *</Label>
                <Input
                  placeholder="Bairro"
                  value={addressForm.neighborhood}
                  onChange={(e) => setAddressForm({...addressForm, neighborhood: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Complemento</Label>
              <Input
                placeholder="Apto, Bloco..."
                value={addressForm.complement}
                onChange={(e) => setAddressForm({...addressForm, complement: e.target.value})}
              />
            </div>
            <div>
              <Label>Ponto de Referência</Label>
              <Input
                placeholder="Próximo a..."
                value={addressForm.reference}
                onChange={(e) => setAddressForm({...addressForm, reference: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddModal(false);
              setEditingAddress(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAddress}>
              {editingAddress ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}