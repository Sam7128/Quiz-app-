import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
}

/**
 * SkeletonLoader Component
 * Renders animated skeleton loaders for placeholder content.
 *
 * @param {string} width - Width of the skeleton element (default: '100%').
 * @param {string} height - Height of the skeleton element (default: '1rem').
 * @param {string} borderRadius - Border radius of the skeleton element (default: '4px').
 * @param {number} count - Number of skeleton elements to render (default: 1).
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  count = 1,
}) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="skeleton-loader"
          style={{
            width,
            height,
            borderRadius,
            marginBottom: '0.5rem',
          }}
        ></div>
      ))}
    </div>
  );
};

export default SkeletonLoader;