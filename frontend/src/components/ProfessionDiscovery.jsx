import React from 'react';
import { 
  Briefcase, Scale, Wrench, Truck, Code, HeartPulse, 
  ChevronRight, Users, Sparkles, Compass 
} from 'lucide-react';

const iconMap = {
  briefcase: Briefcase,
  scale: Scale,
  wrench: Wrench,
  truck: Truck,
  code: Code,
  'heart-pulse': HeartPulse
};

const categoryGradients = {
  all: 'from-slate-900 to-indigo-900',
  legal: 'from-indigo-600 via-purple-600 to-pink-600',
  trades: 'from-amber-600 via-orange-600 to-red-600',
  transportation: 'from-emerald-600 via-teal-600 to-cyan-600',
  technology: 'from-sky-600 via-blue-600 to-indigo-600',
  healthcare: 'from-rose-600 via-pink-600 to-purple-600',
};

export default function ProfessionDiscovery({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  onSelectRole 
}) {
  return (
    <div className="bg-white/95 border border-indigo-100 rounded-3xl p-4 sm:p-5 shadow-sm mb-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Explore Professions & Real Crafts</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">Browse verified workers and workflows by industry</p>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => {
          const IconComp = iconMap[cat.icon] || Briefcase;
          const isSelected = selectedCategory === cat.slug;
          const gradientClass = categoryGradients[cat.slug] || 'from-indigo-600 to-rose-600';

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex-shrink-0 border ${
                isSelected
                  ? `bg-gradient-to-r ${gradientClass} text-white border-transparent shadow-md scale-102`
                  : 'bg-slate-50 hover:bg-indigo-50/60 text-slate-700 border-slate-200/90 hover:border-indigo-200'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-600'}`} />
              <span>{cat.name}</span>
              {cat.activePros && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
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
        <div className="mt-3.5 pt-3 border-t border-indigo-100/70 flex items-center gap-2 flex-wrap animate-fade-in">
          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider">
            Popular in {selectedCategory}:
          </span>
          {categories
            .find((c) => c.slug === selectedCategory)
            ?.popularRoles?.map((role, idx) => (
              <button
                key={idx}
                onClick={() => onSelectRole(role)}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-800 border border-indigo-200/80 text-xs font-bold transition-all shadow-2xs hover:scale-105"
              >
                {role}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
