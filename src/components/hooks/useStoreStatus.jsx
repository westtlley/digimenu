import { useMemo } from 'react';

export function useStoreStatus(store) {
  const status = useMemo(() => {
    const isStoreClosed = store.is_open === false;
    const isStorePaused = store.is_open !== false && store.accepting_orders === false;
    
    // Verificar se no modo AUTO está fora do horário
    const isAutoModeClosed = (() => {
      if (store.is_open !== null) return false; // Não está no modo AUTO
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const workingDays = store.working_days || [];
      const isWorkingDay = workingDays.includes(currentDay);
      
      if (!isWorkingDay) return true; // Fechado hoje
      
      const [openHour, openMin] = (store.opening_time || '08:00').split(':').map(Number);
      const [closeHour, closeMin] = (store.closing_time || '18:00').split(':').map(Number);
      const openTime = openHour * 60 + openMin;
      const closeTime = closeHour * 60 + closeMin;
      
      return currentTime < openTime || currentTime > closeTime; // Fora do horário
    })();

    return {
      isStoreClosed,
      isStorePaused,
      isAutoModeClosed,
      isStoreUnavailable: isStoreClosed || isStorePaused || isAutoModeClosed
    };
  }, [store]);

  const getNextOpenTime = useMemo(() => {
    if (store.is_open !== null) return null;
    
    const now = new Date();
    const workingDays = store.working_days || [];
    const [openHour, openMin] = (store.opening_time || '08:00').split(':').map(Number);
    
    // Procurar próximo dia útil
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + i);
      const dayOfWeek = checkDate.getDay();
      
      if (workingDays.includes(dayOfWeek)) {
        if (i === 0) {
          // Hoje - verificar se já passou o horário
          const currentTime = now.getHours() * 60 + now.getMinutes();
          const openTime = openHour * 60 + openMin;
          if (currentTime < openTime) {
            return `hoje às ${store.opening_time}`;
          }
        } else {
          const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
          return `${dayNames[dayOfWeek]} às ${store.opening_time}`;
        }
      }
    }
    return null;
  }, [store]);

  const getStatusDisplay = useMemo(() => {
    // Loja fechada manualmente
    if (store.is_open === false) {
      return { text: 'Loja fechada', color: 'text-red-600' };
    }
    
    // Loja aberta 24h
    if (store.is_open === true) {
      return { text: 'Aberto 24h', color: 'text-green-600' };
    }
    
    // Modo AUTO - verificar horário e dia
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const workingDays = store.working_days || [];
    const isWorkingDay = workingDays.includes(currentDay);
    
    if (!isWorkingDay) {
      return { text: 'Fechado hoje', color: 'text-red-600' };
    }
    
    // Verificar horário
    const [openHour, openMin] = (store.opening_time || '08:00').split(':').map(Number);
    const [closeHour, closeMin] = (store.closing_time || '18:00').split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (currentTime >= openTime && currentTime <= closeTime) {
      return { text: 'Aberto agora', color: 'text-green-600' };
    } else {
      return { text: `Fechado • Abre às ${store.opening_time}`, color: 'text-red-600' };
    }
  }, [store]);

  return {
    ...status,
    getNextOpenTime,
    getStatusDisplay
  };
}