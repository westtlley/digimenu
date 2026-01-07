import React from 'react';
import { motion } from 'framer-motion';

export default function ClientsSkeleton() {
  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 animate-pulse">
        <div className="w-48 h-8 bg-muted rounded" />
        <div className="w-32 h-10 bg-muted rounded" />
      </div>

      {/* Search Bar */}
      <div className="mb-6 animate-pulse">
        <div className="w-full h-10 bg-muted rounded" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="w-24 h-4 bg-muted rounded" />
          </div>
        </div>
        
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 border-b border-border last:border-b-0 animate-pulse"
          >
            <div className="grid grid-cols-4 gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="w-32 h-4 bg-muted rounded" />
              </div>
              <div className="w-40 h-4 bg-muted rounded" />
              <div className="w-28 h-4 bg-muted rounded" />
              <div className="flex gap-2 justify-end">
                <div className="w-8 h-8 bg-muted rounded" />
                <div className="w-8 h-8 bg-muted rounded" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}