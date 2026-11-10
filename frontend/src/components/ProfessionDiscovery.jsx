import React from 'react';
import { 
  Briefcase, Scale, Wrench, Truck, Code, HeartPulse, 
  ChevronRight, Users, Sparkles, Filter 
} from 'lucide-react';

const iconMap = {
  briefcase: Briefcase,
  scale: Scale,
  wrench: Wrench,
  truck: Truck,
  code: Code,
  'heart-pulse': HeartPulse
};

export default function ProfessionDiscovery({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  onSelectRole 
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <CompassIcon className="w-4 h-4 text-brand-600" />
            Explore Real Professions & Roles
          </h3>
          <p className="text-xs text-slate-500 font-medium">Browse verified workers and workflows by industry</p>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2">
        {categories.map((cat) => {
          const IconComp = iconMap[cat.icon] || Briefcase;
          const isSelected = selectedCategory === cat.slug;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-400' : 'text-slate-500'}`} />
              <span>{cat.name}</span>
              {cat.activePros && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {cat.activePros}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Popular Role Quick Chips for current selection */}
      {selectedCategory !== 'all' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Popular in {selectedCategory}:
          </span>
          {categories
            .find((c) => c.slug === selectedCategory)
            ?.popularRoles?.map((role, idx) => (
              <button
                key={idx}
                onClick={() => onSelectRole(role)}
                className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold transition-colors"
              >
                {role}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function CompassIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
    </svg>
  );
}
