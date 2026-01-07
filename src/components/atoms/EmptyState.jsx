import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-500 text-center mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}