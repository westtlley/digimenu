import React from 'react';

export default function MobileDishSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center gap-3 p-3">
        {/* Image skeleton */}
        <div className="w-20 h-20 rounded-xl bg-gray-200 flex-shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-200 rounded w-20" />
            <div className="flex items-center gap-2">
              <div className="w-10 h-6 bg-gray-200 rounded-full" />
              <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}