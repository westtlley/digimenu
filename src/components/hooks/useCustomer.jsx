import { useState, useEffect } from 'react';

const CUSTOMER_STORAGE_KEY = 'cardapio_customer';

export function useCustomer() {
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        name: '', 
        phone: '', 
        deliveryMethod: 'pickup', 
        address_street: '',
        address_number: '',
        address_complement: '',
        address: '', 
        paymentMethod: '', 
        neighborhood: '' 
      };
    } catch {
      return {
        name: '', 
        phone: '', 
        deliveryMethod: 'pickup', 
        address_street: '',
        address_number: '',
        address_complement: '',
        address: '', 
        paymentMethod: '', 
        neighborhood: '' 
      };
    }
  });

  // Persistir no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    } catch (e) {
      console.error('Erro ao salvar dados do cliente:', e);
    }
  }, [customer]);

  const clearCustomer = () => {
    setCustomer({
      name: '', 
      phone: '', 
      deliveryMethod: 'pickup', 
      address_street: '',
      address_number: '',
      address_complement: '',
      address: '', 
      paymentMethod: '', 
      neighborhood: '' 
    });
  };

  return {
    customer,
    setCustomer,
    clearCustomer
  };
}