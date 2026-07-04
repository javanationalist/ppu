import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  let shapeClass = 'rounded-md';
  if (variant === 'circle') {
    shapeClass = 'rounded-full';
  } else if (variant === 'text') {
    shapeClass = 'rounded h-4';
  }

  return (
    <div 
      className={`animate-shimmer ${shapeClass} ${className}`} 
      style={{ minHeight: variant === 'text' ? undefined : '1em' }}
    />
  );
};
