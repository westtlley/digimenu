import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Volume2, VolumeX, ChevronDown, ChevronUp, Clock, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function FloatingMessageBubble({ message, onReply, onClose = () => {}, darkMode }) {
  const [minimized, setMinimized] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef(null);

  // Buscar histórico de mensagens
  const { data: messageHistory = [] } = useQuery({
    queryKey: ['deliveryMessages', message?.entregador_id],
    queryFn: () => base44.entities.DeliveryMessage.filter(
      { entregador_id: message?.entregador_id },
      '-created_date',
      20
    ),
    enabled: !!message?.entregador_id,
    refetchInterval: 3000,
  });

  // Tocar som apenas para mensagens não lidas E se o usuário não interagiu ainda
  useEffect(() => {
    const unreadCount = messageHistory.filter(m => m.status === 'pending').length;
    if (!hasInteracted && soundEnabled && audioRef.current && !minimized && unreadCount > 0) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [soundEnabled, minimized, messageHistory, hasInteracted]);

  const quickReplies = [
    'Pedido urgente disponível',
    'Cliente aguardando contato',
    'Por favor, confirme sua localização',
    'Retorne à loja para nova entrega'
  ];

  const handleQuickReply = async (reply) => {
    onReply(reply);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleSendReply = async () => {
    if (replyText.trim()) {
      onReply(replyText);
      setReplyText('');
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  const getTimeSince = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  // Minimized view
  if (minimized) {
    return (
      <>
        <audio ref={audioRef} loop>
          <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
        </audio>

        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setMinimized(false);
            setHasInteracted(true);
            setSoundEnabled(false);
          }}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 rounded-full shadow-2xl flex items-center justify-center"
        >
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
            {messageHistory.filter(m => m.status === 'pending').length > 0 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center"
              >
                {messageHistory.filter(m => m.status === 'pending').length}
              </motion.span>
            )}
          </div>
        </motion.button>
      </>
    );
  }

  return (
    <>
      <audio ref={audioRef} loop>
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>

      <motion.div
        initial={{ x: 400, opacity: 0, scale: 0.8 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 400, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[420px] max-w-[420px]"
      >
        <div className={`${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'} backdrop-blur-xl rounded-3xl shadow-2xl border-2 overflow-hidden`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 md:gap-3">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  className="w-9 h-9 md:w-11 md:h-11 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                >
                  <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">Mensagem do Restaurante</h3>
                  <p className="text-[10px] md:text-xs opacity-90 flex items-center gap-2">
                    <motion.span 
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full"
                    />
                    Mensagem do Gestor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    setHasInteracted(true);
                  }}
                  className="p-1.5 md:p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setMinimized(true);
                    setHasInteracted(true);
                    setSoundEnabled(false);
                  }}
                  className="p-1.5 md:p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-1.5 md:p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Message History */}
          <div className={`max-h-60 md:max-h-80 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 ${darkMode ? 'bg-gray-900/50' : 'bg-gradient-to-b from-gray-50/50 to-white/50'} backdrop-blur-sm`}>
            {messageHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Nenhuma mensagem ainda
                </p>
              </div>
            ) : (
              messageHistory.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 md:p-4 rounded-2xl backdrop-blur-sm ${
                    msg.status === 'pending'
                      ? darkMode 
                        ? 'bg-blue-900/40 border-2 border-blue-600 shadow-lg shadow-blue-600/20' 
                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg'
                      : darkMode 
                        ? 'bg-gray-800/60 border border-gray-700' 
                        : 'bg-white/80 border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {msg.priority === 'urgent' && (
                        <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] h-5 shadow-lg">
                          🔥 Urgente
                        </Badge>
                      )}
                      {msg.status === 'pending' && (
                        <motion.div
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] h-5">
                            ✨ Nova
                          </Badge>
                        </motion.div>
                      )}
                      {msg.status === 'read' && (
                        <CheckCheck className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3" />
                      {getTimeSince(msg.created_date)}
                    </span>
                  </div>
                  {msg.title && (
                    <p className={`font-bold text-xs md:text-sm mb-2 ${darkMode ? 'text-white' : 'text-gray-900'} break-words`}>
                      {msg.title}
                    </p>
                  )}
                  <p className={`text-xs md:text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'} break-words`}>
                    {msg.message}
                  </p>
                </motion.div>
              ))
            )}
          </div>

          {/* Reply Section */}
          <div className={`p-3 md:p-4 border-t ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white/80 border-gray-200'} backdrop-blur-sm`}>
            {/* Quick Replies */}
            <div className="mb-3 md:mb-4">
              <p className={`text-[10px] md:text-xs font-semibold mb-2 md:mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wide`}>
                Respostas rápidas:
              </p>
              <div className="grid grid-cols-2 gap-1.5 md:gap-2">
                {quickReplies.map((reply, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleQuickReply(reply)}
                    className={`text-[10px] md:text-xs p-2 md:p-3 rounded-xl text-left transition-all font-medium break-words ${
                      darkMode 
                        ? 'bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white border border-gray-600' 
                        : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 text-gray-700 border border-gray-300 hover:border-blue-300'
                    } shadow-sm`}
                  >
                    {reply}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Custom Reply */}
            <div>
              <p className={`text-[10px] md:text-xs font-semibold mb-2 md:mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wide`}>
                Mensagem personalizada:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder="Digite sua mensagem..."
                  className={`flex-1 px-3 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm ${
                    darkMode 
                      ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500' 
                      : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400'
                  } border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-3 md:px-5 py-2 md:py-3 rounded-xl shadow-lg h-full"
                    size="sm"
                  >
                    <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                </motion.div>
              </div>
            </div>

            {message?.order_id && (
              <div className={`mt-3 md:mt-4 text-center py-2 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                <p className={`text-[10px] md:text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} break-all`}>
                  Pedido relacionado: <span className="font-mono font-bold">#{message.order_id.slice(-8)}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}