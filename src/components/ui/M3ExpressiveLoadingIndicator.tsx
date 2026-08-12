import React from 'react';

export interface M3ExpressiveLoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number;
  variant?: 'uncontained' | 'header' | 'button' | 'contained';
  className?: string;
  color?: string;
  label?: string;
  statusText?: string;
  isActivityIndicator?: boolean;
  'aria-label'?: string;
}

export const M3ExpressiveLoadingIndicator: React.FC<M3ExpressiveLoadingIndicatorProps> = ({
  size = 'medium',
  className = '',
  color,
  label,
  statusText,
  isActivityIndicator = false,
  'aria-label': ariaLabel,
}) => {
  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small':
        return 18;
      case 'large':
        return 52;
      case 'xlarge':
        return 64;
      case 'medium':
      default:
        return 38;
    }
  };

  const dim = getDimension();

  // Loader container style to adjust size dynamically
  const loaderStyle: React.CSSProperties = {
    width: `${dim}px`,
    height: `${dim}px`,
  };

  // Shape style for color overrides if provided
  const shapeStyle: React.CSSProperties = color
    ? { backgroundColor: color }
    : {};

  // Accessibility
  const roleAttr = isActivityIndicator ? undefined : 'status';
  const ariaLabelAttr = isActivityIndicator
    ? undefined
    : ariaLabel || label || 'Loading...';

  return (
    <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
      <div
        className="m3-expressive-loader"
        style={loaderStyle}
        role={roleAttr}
        aria-label={ariaLabelAttr}
        aria-hidden={isActivityIndicator ? true : undefined}
      >
        <div className="m3-shape" style={shapeStyle} />
      </div>

      {(label || statusText) && (
        <span
          className={`font-semibold tracking-tight ${
            size === 'small' ? 'text-xs' : 'text-sm'
          }`}
        >
          {statusText || label}
        </span>
      )}
    </div>
  );
};

export default M3ExpressiveLoadingIndicator;
