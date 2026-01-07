import React from 'react';
import { motion } from 'framer-motion';

export default function StoreClosedOverlay({ isStoreClosed, isAutoModeClosed, isStorePaused, getNextOpenTime, store }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
      >
        {(isStoreClosed || isAutoModeClosed) ? (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🔴</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Loja Fechada</h2>
            <p className="text-gray-600 mb-6">
              {isAutoModeClosed && getNextOpenTime 
                ? `Abriremos ${getNextOpenTime}`
                : 'Não estamos funcionando no momento'}
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              {store.opening_time && store.closing_time && (
                <p>⏰ Horário: {store.opening_time} - {store.closing_time}</p>
              )}
              {store.whatsapp && (
                <a
                  href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  💬 Falar no WhatsApp
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⏸️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Pedidos Pausados</h2>
            <p className="text-gray-600 mb-6">
              {store.pause_message || 'Não estamos aceitando pedidos temporariamente'}
            </p>
            {store.whatsapp && (
              <a
                href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                💬 Falar no WhatsApp
              </a>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}