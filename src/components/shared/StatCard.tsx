import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'cyan' | 'orange' | 'red' | 'purple' | 'green';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  pulse?: boolean;
  onClick?: () => void;
  delay?: number;
}

const colorClasses = {
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'text-cyan-500',
    gradient: 'from-cyan-500 to-blue-500'
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    gradient: 'from-orange-500 to-red-500'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-500',
    gradient: 'from-red-500 to-pink-500'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-500',
    gradient: 'from-purple-500 to-indigo-500'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-500',
    gradient: 'from-green-500 to-emerald-500'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  trend,
  pulse = false,
  onClick,
  delay = 0
}) => {
  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-lg border border-gray-200 ${onClick ? 'cursor-pointer group hover:shadow-xl hover:scale-105' : ''} transition-all duration-200 animate-fadeIn`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        {pulse && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-gray-800 mb-1">
        {value}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{label}</div>
        {trend && (
          <div className={`text-xs font-bold ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}%
          </div>
        )}
      </div>

      {onClick && (
        <div className="mt-4 text-cyan-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
          View Details <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};