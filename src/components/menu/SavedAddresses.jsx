import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient as base44 } from '@/api/apiClient';
import { uiText } from '@/i18n/pt-BR/uiText';

const STORAGE_KEY = 'saved_addresses';
const LEGACY_KEYS = ['saved_addresses', 'savedAddresses', 'cardapio_saved_addresses'];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeParseAddresses = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return Object.values(parsed);
    return [];
  } catch {
    return [];
  }
};

const normalizeAddress = (address, idx = 0, slug = null, userEmail = null) => {
  if (!address || typeof address !== 'object') return null;

  const street =
    address.street ||
    address.address_street ||
    address.address ||
    address.logradouro ||
    '';
  const neighborhood =
    address.neighborhood ||
    address.bairro ||
    '';

  if (!street && !neighborhood) return null;

  return {
    id: address.id ? String(address.id) : `legacy-${Date.now()}-${idx}`,
    name: address.name || address.label || address.nickname || (neighborhood ? `Endereco ${neighborhood}` : 'Endereco salvo'),
    street: street || '',
    number: address.number || address.address_number || '',
    complement: address.complement || address.address_complement || '',
    neighborhood: neighborhood || '',
    reference: address.reference || address.landmark || '',
    cep: address.cep || address.zipcode || '',
    city: address.city || '',
    state: address.state || '',
    latitude: toNullableNumber(address.latitude ?? address.lat ?? address.customer_latitude),
    longitude: toNullableNumber(address.longitude ?? address.lng ?? address.customer_longitude),
    createdAt: address.createdAt || address.created_at || new Date().toISOString(),
    store_slug: address.store_slug || address.slug || slug || null,
    user_email: address.user_email || (userEmail || null)
  };
};

const dedupeAddresses = (addresses) => {
  const seen = new Set();
  const out = [];
  for (const addr of addresses) {
    if (!addr) continue;
    const key = [
      normalizeText(addr.street),
      normalizeText(addr.number),
      normalizeText(addr.neighborhood),
      addr.latitude ?? '',
      addr.longitude ?? '',
      normalizeText(addr.store_slug),
      normalizeText(addr.user_email)
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  return out;
};

const buildAddressLine = (address) => {
  const street = address?.street || '';
  const number = address?.number ? String(address.number) : '';
  const complement = address?.complement ? String(address.complement) : '';
  const neighborhood = address?.neighborhood ? String(address.neighborhood) : '';

  const main = [street, number].filter(Boolean).join(', ');
  const withComplement = complement ? [main || street, complement].filter(Boolean).join(' - ') : main || street;
  return [withComplement, neighborhood].filter(Boolean).join(', ');
};

export default function SavedAddresses({
  customer,
  setCustomer,
  darkMode = false,
  slug = null,
  userEmail = null,
  deliveryMode = 'zone'
}) {
  const savedAddressesText = uiText.menu.savedAddresses;
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    reference: '',
    cep: '',
    city: '',
    state: '',
    latitude: null,
    longitude: null
  });

  const scopedStorageKey = `${STORAGE_KEY}:${slug || 'global'}:${(userEmail || 'guest').toLowerCase()}`;
  const legacySlugKey = slug ? `${STORAGE_KEY}_${slug}` : null;

  const resetForm = () => {
    setAddressForm({
      name: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      reference: '',
      cep: '',
      city: '',
      state: '',
      latitude: null,
      longitude: null
    });
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    setAddressForm({
      name: customer?.address_street ? 'Endereco Principal' : 'Novo Endereco',
      street: customer?.address_street || '',
      number: customer?.address_number || '',
      complement: customer?.address_complement || '',
      neighborhood: customer?.neighborhood || '',
      reference: '',
      cep: customer?.cep || '',
      city: customer?.city || '',
      state: customer?.state || '',
      latitude: toNullableNumber(customer?.latitude),
      longitude: toNullableNumber(customer?.longitude)
    });
    setShowAddModal(true);
  };

  const saveToStorage = (addresses) => {
    try {
      const normalized = dedupeAddresses(
        (addresses || [])
          .map((address, idx) => normalizeAddress(address, idx, slug, userEmail))
          .filter(Boolean)
      );

      localStorage.setItem(scopedStorageKey, JSON.stringify(normalized));
      if (legacySlugKey) localStorage.setItem(legacySlugKey, JSON.stringify(normalized));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setSavedAddresses(normalized);
    } catch (e) {
      console.error('Erro ao salvar enderecos:', e);
    }
  };

  useEffect(() => {
    try {
      const keysToRead = [scopedStorageKey, legacySlugKey, ...LEGACY_KEYS].filter(Boolean);
      let merged = [];

      keysToRead.forEach((key) => {
        const parsed = safeParseAddresses(localStorage.getItem(key));
        merged = merged.concat(parsed);
      });

      const normalized = dedupeAddresses(
        merged
          .map((address, idx) => normalizeAddress(address, idx, slug, userEmail))
          .filter(Boolean)
          .filter((address) => {
            if (slug && address.store_slug && address.store_slug !== slug) return false;
            if (userEmail && address.user_email && String(address.user_email).toLowerCase() !== String(userEmail).toLowerCase()) return false;
            return true;
          })
      );

      setSavedAddresses(normalized);

      if (normalized.length > 0) {
        localStorage.setItem(scopedStorageKey, JSON.stringify(normalized));
        if (legacySlugKey) localStorage.setItem(legacySlugKey, JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Erro ao carregar enderecos salvos:', e);
      setSavedAddresses([]);
    }
  }, [scopedStorageKey, legacySlugKey, slug, userEmail]);

  // Quando nao houver nada salvo, usar o endereco atual do checkout como base
  useEffect(() => {
    if ((savedAddresses || []).length > 0) return;
    if (!(customer?.address_street || customer?.neighborhood)) return;

    const initial = normalizeAddress(
      {
        id: `current-${Date.now()}`,
        name: 'Endereco Atual',
        street: customer?.address_street || '',
        number: customer?.address_number || '',
        complement: customer?.address_complement || '',
        neighborhood: customer?.neighborhood || '',
        cep: customer?.cep || '',
        city: customer?.city || '',
        state: customer?.state || '',
        latitude: customer?.latitude ?? null,
        longitude: customer?.longitude ?? null
      },
      0,
      slug,
      userEmail
    );

    if (!initial) return;

    const normalized = dedupeAddresses([initial]);
    localStorage.setItem(scopedStorageKey, JSON.stringify(normalized));
    if (legacySlugKey) localStorage.setItem(legacySlugKey, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setSavedAddresses(normalized);
  }, [
    savedAddresses,
    customer?.address_street,
    customer?.address_number,
    customer?.address_complement,
    customer?.neighborhood,
    customer?.cep,
    customer?.city,
    customer?.state,
    customer?.latitude,
    customer?.longitude,
    slug,
    userEmail,
    scopedStorageKey,
    legacySlugKey
  ]);

  // Importar endereco principal do perfil (Customer) para nao perder endereco cadastrado antigo
  useEffect(() => {
    if (!userEmail) return;
    let isMounted = true;

    const syncProfileAddress = async () => {
      try {
        const customers = await base44.entities.Customer.filter({ email: userEmail });
        const customerProfile = Array.isArray(customers) && customers[0] ? customers[0] : null;
        if (!customerProfile || !isMounted) return;

        const profileAddress = normalizeAddress(
          {
            id: `profile-${userEmail}`,
            name: 'Endereco do Perfil',
            street: customerProfile.address_street || customerProfile.address || '',
            number: customerProfile.address_number || '',
            complement: customerProfile.address_complement || customerProfile.complement || '',
            neighborhood: customerProfile.neighborhood || '',
            cep: customerProfile.zipcode || customerProfile.cep || '',
            city: customerProfile.city || '',
            state: customerProfile.state || '',
            latitude: customerProfile.latitude ?? customerProfile.customer_latitude ?? null,
            longitude: customerProfile.longitude ?? customerProfile.customer_longitude ?? null,
            store_slug: slug || null,
            user_email: userEmail
          },
          0,
          slug,
          userEmail
        );

        if (!profileAddress) return;

        setSavedAddresses((prev) => {
          const merged = dedupeAddresses([...(prev || []), profileAddress]);
          if (merged.length !== (prev || []).length) {
            localStorage.setItem(scopedStorageKey, JSON.stringify(merged));
            if (legacySlugKey) localStorage.setItem(legacySlugKey, JSON.stringify(merged));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return merged;
        });
      } catch (error) {
        // Fluxo publico/guest pode falhar sem impacto
      }
    };

    syncProfileAddress();
    return () => {
      isMounted = false;
    };
  }, [userEmail, slug, scopedStorageKey, legacySlugKey]);

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
      cep: addressForm.cep || '',
      city: addressForm.city || '',
      state: addressForm.state || '',
      latitude: toNullableNumber(addressForm.latitude),
      longitude: toNullableNumber(addressForm.longitude),
      createdAt: editingAddress?.createdAt || new Date().toISOString(),
      store_slug: slug || null,
      user_email: userEmail || null
    };

    let updated;
    if (editingAddress) {
      updated = savedAddresses.map((a) => (a.id === editingAddress.id ? newAddress : a));
      toast.success('Endereco atualizado!');
    } else {
      updated = [...savedAddresses, newAddress];
      toast.success('Endereco salvo!');
    }

    saveToStorage(updated);
    setShowAddModal(false);
    setEditingAddress(null);
    resetForm();
  };

  const handleDeleteAddress = (id) => {
    if (!confirm('Deseja realmente excluir este endereco?')) return;

    const updated = savedAddresses.filter((a) => a.id !== id);
    saveToStorage(updated);
    toast.success('Endereco excluido!');
  };

  const geocodeAddress = async (address) => {
    const query = [
      address?.street,
      address?.number,
      address?.neighborhood,
      address?.city,
      address?.state,
      'Brasil'
    ]
      .filter(Boolean)
      .join(', ')
      .trim();

    if (!query) return null;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const latitude = toNullableNumber(data[0]?.lat);
      const longitude = toNullableNumber(data[0]?.lon);
      if (!latitude || !longitude) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  };

  const handleSelectAddress = async (address) => {
    const lat = toNullableNumber(address?.latitude);
    const lng = toNullableNumber(address?.longitude);

    setCustomer({
      ...customer,
      address_street: address.street || '',
      address_number: address.number || '',
      address_complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      cep: address.cep || customer?.cep || '',
      city: address.city || customer?.city || '',
      state: address.state || customer?.state || '',
      latitude: lat,
      longitude: lng,
      address: buildAddressLine(address)
    });

    if (deliveryMode === 'distance' && (!lat || !lng)) {
      const geocoded = await geocodeAddress(address);
      if (geocoded?.latitude && geocoded?.longitude) {
        setCustomer((prev) => ({
          ...prev,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude
        }));

        const updatedAddresses = savedAddresses.map((item) =>
          item.id === address.id
            ? { ...item, latitude: geocoded.latitude, longitude: geocoded.longitude }
            : item
        );
        saveToStorage(updatedAddresses);
        toast.success('Endereco geolocalizado para taxa por km com precisao.');
      } else {
        toast('Endereco selecionado sem GPS. Confirme no mapa para taxa por km.');
      }
    } else {
      toast.success(`Endereco "${address.name}" selecionado!`);
    }
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name || '',
      street: address.street || '',
      number: address.number || '',
      complement: address.complement || '',
      neighborhood: address.neighborhood || '',
      reference: address.reference || '',
      cep: address.cep || '',
      city: address.city || '',
      state: address.state || '',
      latitude: toNullableNumber(address.latitude),
      longitude: toNullableNumber(address.longitude)
    });
    setShowAddModal(true);
  };

  if (savedAddresses.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{savedAddressesText.title}</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            {savedAddressesText.saveCurrent}
          </Button>
        </div>
        {customer.address_street && customer.neighborhood && (
          <p className="text-xs text-gray-500">
            {savedAddressesText.saveCurrentHint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{savedAddressesText.title}</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={openCreateModal}
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          {savedAddressesText.newAddress}
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
                normalizeText(customer.address_street) === normalizeText(address.street) && normalizeText(customer.neighborhood) === normalizeText(address.neighborhood)
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
                    {normalizeText(customer.address_street) === normalizeText(address.street) && normalizeText(customer.neighborhood) === normalizeText(address.neighborhood) && (
                      <Badge className="bg-blue-500 text-white text-xs h-4 px-1">
                        <Check className="w-2 h-2 mr-1" />
                        Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {address.street || savedAddressesText.streetNotInformed}
                    {address.number && `, ${address.number}`}
                    {address.complement && ` - ${address.complement}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {address.neighborhood || savedAddressesText.neighborhoodNotInformed}
                  </p>
                  {address.latitude && address.longitude && (
                    <p className="text-[10px] text-green-600 mt-1">{savedAddressesText.gpsSaved}</p>
                  )}
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

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Endereco' : 'Salvar Endereco'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Endereco</Label>
              <Input
                placeholder="Ex: Casa, Trabalho"
                value={addressForm.name}
                onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Rua/Avenida *</Label>
              <Input
                placeholder="Rua, Avenida..."
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Numero</Label>
                <Input
                  placeholder="123"
                  value={addressForm.number}
                  onChange={(e) => setAddressForm({ ...addressForm, number: e.target.value })}
                />
              </div>
              <div>
                <Label>Bairro *</Label>
                <Input
                  placeholder="Bairro"
                  value={addressForm.neighborhood}
                  onChange={(e) => setAddressForm({ ...addressForm, neighborhood: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Complemento</Label>
              <Input
                placeholder="Apto, Bloco..."
                value={addressForm.complement}
                onChange={(e) => setAddressForm({ ...addressForm, complement: e.target.value })}
              />
            </div>
            <div>
              <Label>Ponto de Referencia</Label>
              <Input
                placeholder="Proximo a..."
                value={addressForm.reference}
                onChange={(e) => setAddressForm({ ...addressForm, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setEditingAddress(null);
                resetForm();
              }}
            >
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

