import React from 'react';
import { motion } from 'framer-motion';

export default function OrdersSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
      {/* Filter Skeleton */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="w-24 h-10 bg-gray-200 rounded" />
          <div className="w-32 h-10 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Order Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border animate-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-20 h-6 bg-gray-200 rounded" />
                <div className="w-16 h-6 bg-gray-200 rounded-full" />
              </div>
              <div className="w-40 h-6 bg-gray-200 rounded mb-2" />
              <div className="w-32 h-4 bg-gray-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded" />
              <div className="w-32 h-10 bg-gray-200 rounded" />
              <div className="w-10 h-10 bg-gray-200 rounded" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-full h-4 bg-gray-200 rounded" />
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
            <div className="w-32 h-4 bg-gray-200 rounded mb-2" />
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-full h-4 bg-gray-200 rounded" />
          </div>

          <div className="flex justify-end gap-6">
            <div className="w-32 h-4 bg-gray-200 rounded" />
            <div className="w-32 h-4 bg-gray-200 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}