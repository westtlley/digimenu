import React from 'react';
import { motion } from 'framer-motion';

export default function ClientsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center animate-pulse">
        <div className="w-32 sm:w-48 h-6 sm:h-8 bg-gray-200 rounded" />
        <div className="w-24 sm:w-32 h-8 sm:h-10 bg-gray-200 rounded" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="w-20 sm:w-24 h-4 bg-gray-200 rounded" />
              <div className="w-5 h-5 bg-gray-200 rounded" />
            </div>
            <div className="w-24 sm:w-32 h-8 sm:h-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Skeleton */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm animate-pulse">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-20 sm:w-32 h-10 bg-gray-200 rounded flex-1" />
          <div className="w-24 sm:w-32 h-10 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Client Cards Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm border animate-pulse"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 sm:w-40 h-5 bg-gray-200 rounded" />
                  <div className="w-24 sm:w-32 h-4 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block space-y-1 text-right">
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </div>
            {/* Mobile Stats */}
            <div className="sm:hidden mt-3 pt-3 border-t flex items-center justify-between">
              <div className="w-20 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}