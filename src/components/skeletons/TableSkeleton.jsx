import React from 'react';
import { motion } from 'framer-motion';

export default function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary animate-pulse">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 border-b border-border last:border-b-0 animate-pulse"
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-muted rounded" />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}