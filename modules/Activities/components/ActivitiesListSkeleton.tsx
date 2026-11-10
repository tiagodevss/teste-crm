import React from 'react';
import { Skeleton } from '../../../components/ui/Skeletons';

interface ActivitiesListSkeletonProps {
  rows?: number;
  showTimeColumn?: boolean;
}

export function ActivitiesListSkeleton({
  rows = 4,
  showTimeColumn = false,
}: ActivitiesListSkeletonProps) {
  return (
    <ul
      className="divide-y divide-gray-100"
      aria-busy="true"
      aria-label="Carregando atividades"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-stretch">
          {showTimeColumn ? (
            <div className="w-[4.5rem] shrink-0 border-r border-gray-100 bg-gray-50/50 py-3 flex justify-center">
              <Skeleton className="h-4 w-10" />
            </div>
          ) : null}
          <div className="flex-1 py-3 px-4 flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <Skeleton className="h-4 w-3/4 max-w-[14rem]" />
              <Skeleton className="h-3 w-1/2 max-w-[10rem]" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}
