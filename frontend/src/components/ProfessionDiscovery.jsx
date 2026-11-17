import React from 'react';
import {
  Briefcase, Scale, Wrench, Truck, Code, HeartPulse,
  GraduationCap, ChefHat, Palette, FlaskConical, Shield,
  Compass
} from 'lucide-react';

const iconMap = {
  briefcase: Briefcase,
  scale: Scale,
  wrench: Wrench,
  truck: Truck,
  code: Code,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  'chef-hat': ChefHat,
  palette: Palette,
  'flask-conical': FlaskConical,
  shield: Shield,
};

const categoryGradients = {
  all: 'from-slate-900 to-teal-900',
  trades: 'from-teal-600 via-cyan-600 to-cyan-600',
  transportation: 'from-emerald-600 via-teal-600 to-cyan-600',
  'legal-finance': 'from-teal-600 via-cyan-600 to-cyan-600',
  technology: 'from-sky-600 via-teal-600 to-teal-600',
  healthcare: 'from-cyan-600 via-cyan-600 to-cyan-600',
  education: 'from-cyan-600 via-cyan-600 to-cyan-600',
  hospitality: 'from-yellow-600 via-teal-600 to-cyan-600',
  creative: 'from-cyan-600 via-cyan-600 to-cyan-500',
  science: 'from-teal-600 via-cyan-600 to-sky-600',
  'public-service': 'from-slate-700 via-slate-600 to-teal-700',
};

export default function ProfessionDiscovery({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  onSelectRole 
}) {
  return (
    <div className="bg-white/95 border border-teal-100 rounded-3xl p-4 sm:p-5 shadow-sm mb-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div>
          <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-600" />
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
          const gradientClass = categoryGradients[cat.slug] || 'from-teal-600 to-cyan-600';

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex-shrink-0 border ${
                isSelected
                  ? `bg-gradient-to-r ${gradientClass} text-white border-transparent shadow-md scale-102`
                  : 'bg-slate-50 hover:bg-teal-50/60 text-slate-700 border-slate-200/90 hover:border-teal-200'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
              <span>{cat.name}</span>
              {cat.activePros && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-teal-100 text-teal-800'
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
        <div className="mt-3.5 pt-3 border-t border-teal-100/70 flex items-center gap-2 flex-wrap animate-fade-in">
          <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider">
            Popular in {categories.find((c) => c.slug === selectedCategory)?.name}:
          </span>
          {categories
            .find((c) => c.slug === selectedCategory)
            ?.popularRoles?.map((role, idx) => (
              <button
                key={idx}
                onClick={() => onSelectRole(role)}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 text-teal-800 border border-teal-200/80 text-xs font-bold transition-all shadow-2xs hover:scale-105"
              >
                {role}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
