import { DivideIcon as LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export default function FeatureCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  className = '' 
}: FeatureCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group glass-effect rounded-xl p-6 hover-lift cursor-pointer ${className}`}
    >
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#FF6A00] to-[#FFA84C] rounded-lg group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-[#FFA84C] transition-colors duration-200">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-[#8da3a4] text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}