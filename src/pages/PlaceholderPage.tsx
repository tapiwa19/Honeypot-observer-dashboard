import { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  icon: LucideIcon;
  description: string;
}

export function PagePlaceholder({ title, icon: Icon, description }: PagePlaceholderProps) {
  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="text-center">
        <Icon className="w-24 h-24 mx-auto mb-4 text-gray-300" />
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 mb-6">{description}</p>
        <div className="inline-block px-6 py-3 bg-gradient-to-r from-primary-500 to-blue-500 text-white font-bold rounded-lg">
          Coming Soon
        </div>
      </div>
    </div>
  );
}