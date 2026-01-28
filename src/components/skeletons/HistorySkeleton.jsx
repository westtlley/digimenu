import React from 'react';
import { motion } from 'framer-motion';

export default function HistorySkeleton() {
  return (
    <div className="p-4 sm:p-6">
      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm animate-pulse">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-40 h-10 bg-gray-200 rounded" />
          <div className="w-40 h-10 bg-gray-200 rounded" />
          <div className="w-32 h-10 bg-gray-200 rounded ml-auto" />
        </div>
      </div>

      {/* Timeline Items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl p-4 shadow-sm border animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-48 h-5 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-full h-4 bg-gray-200 rounded" />
                <div className="w-3/4 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}