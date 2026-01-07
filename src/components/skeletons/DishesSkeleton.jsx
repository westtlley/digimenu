import React from 'react';
import { motion } from 'framer-motion';

export default function DishesSkeleton() {
  return (
    <div className="px-6 pb-6 space-y-4">
      {/* Header Skeleton */}
      <div className="flex gap-3 mb-6 animate-pulse">
        <div className="w-32 h-10 bg-gray-200 rounded" />
        <div className="w-32 h-10 bg-gray-200 rounded" />
        <div className="w-32 h-10 bg-gray-200 rounded" />
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white rounded-xl p-4 mb-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Categories Skeleton */}
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-gray-50 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="flex items-center justify-between p-4 bg-white border-b">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="w-32 h-6 bg-gray-200 rounded" />
              <div className="w-16 h-5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="w-32 h-9 bg-gray-200 rounded" />
              <div className="w-9 h-9 bg-gray-200 rounded" />
            </div>
          </div>

          <div className="p-4 space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="bg-white border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="w-40 h-4 bg-gray-200 rounded" />
                    <div className="w-full h-3 bg-gray-200 rounded" />
                    <div className="w-24 h-3 bg-gray-200 rounded" />
                  </div>
                  <div className="w-20 h-4 bg-gray-200 rounded" />
                  <div className="w-10 h-6 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}