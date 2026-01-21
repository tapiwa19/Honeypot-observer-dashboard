import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  className,
  type = 'button'
}) => {
  const baseStyles = 'font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-primary-500 to-blue-500 text-white hover:shadow-lg hover:shadow-primary-500/50 disabled:opacity-50',
    secondary: 'bg-white border-2 border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50',
    danger: 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg disabled:opacity-50',
    success: 'bg-success-500 text-white hover:bg-green-600 hover:shadow-lg disabled:opacity-50',
    ghost: 'bg-transparent text-primary-500 hover:bg-primary-50 disabled:opacity-50'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        widthStyle,
        disabled && 'cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
};