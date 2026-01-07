import React from 'react';
import { motion } from 'framer-motion';

export default function FinancialSkeleton() {
  return (
    <div className="p-4 sm:p-6">
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl p-6 shadow-sm border animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="w-12 h-5 bg-gray-200 rounded-full" />
            </div>
            <div className="w-24 h-8 bg-gray-200 rounded mb-2" />
            <div className="w-32 h-4 bg-gray-200 rounded" />
          </motion.div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white rounded-xl p-6 shadow-sm border mb-6 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b animate-pulse">
          <div className="w-48 h-6 bg-gray-200 rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 border-b last:border-b-0 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="w-40 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="w-24 h-6 bg-gray-200 rounded" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}