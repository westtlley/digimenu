import React from 'react';

export default function DishSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border animate-pulse">
      <div className="relative h-48 bg-gray-200" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-3 w-full" />
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-9 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  );
}