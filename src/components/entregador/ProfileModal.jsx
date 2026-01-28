import React, { useState, useRef } from 'react';
import { X, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function ProfileModal({ entregador, onClose, darkMode }) {
  const [formData, setFormData] = useState({
    name: entregador.name || '',
    phone: entregador.phone || '',
    photo: entregador.photo || '',
    vehicle_type: entregador.vehicle_type || 'motorcycle',
    vehicle_plate: entregador.vehicle_plate || '',
    emergency_contact: entregador.emergency_contact || '',
    emergency_phone: entregador.emergency_phone || ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.Entregador.update(entregador.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregador'] });
      onClose();
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'profiles');
      setFormData({ ...formData, photo: url });
    } catch (error) {
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    updateProfileMutation.mutate(formData);
  };

  const vehicleIcons = {
    bike: '🚴',
    motorcycle: '🏍️',
    car: '🚗'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-lg w-full p-6 my-8`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Editar Perfil
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <div className="relative">
              {formData.photo ? (
                <img
                  src={formData.photo}
                  alt="Perfil"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-3xl">👤</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Nome */}
          <div>
            <Label>Nome</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Telefone */}
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* Tipo de Veículo */}
          <div>
            <Label>Tipo de Veículo</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bike">🚴 Bicicleta</SelectItem>
                <SelectItem value="motorcycle">🏍️ Moto</SelectItem>
                <SelectItem value="car">🚗 Carro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Placa */}
          <div>
            <Label>Placa do Veículo</Label>
            <Input
              value={formData.vehicle_plate}
              onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
              placeholder="ABC-1234"
            />
          </div>

          {/* Contato de Emergência */}
          <div>
            <Label>Contato de Emergência</Label>
            <Input
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
              placeholder="Nome"
            />
          </div>

          <div>
            <Label>Telefone de Emergência</Label>
            <Input
              value={formData.emergency_phone}
              onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Botão Salvar */}
          <Button
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save className="w-5 h-5 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}