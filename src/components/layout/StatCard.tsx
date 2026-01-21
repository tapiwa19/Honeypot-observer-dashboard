import { LucideIcon, ChevronRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'cyan' | 'orange' | 'red' | 'purple';
  pulse?: boolean;
  onClick: () => void;
}

export function StatCard({ label, value, icon: Icon, color, pulse, onClick }: StatCardProps) {
  const colors = {
    cyan: 'bg-cyan-50 text-cyan-500',
    orange: 'bg-orange-50 text-orange-500',
    red: 'bg-red-50 text-red-500',
    purple: 'bg-purple-50 text-purple-500'
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer group hover:shadow-xl hover:scale-105 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {pulse && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-4 text-primary-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        View Details <ChevronRight className="w-4 h-4" />
      </div>
    </div>
  );
}