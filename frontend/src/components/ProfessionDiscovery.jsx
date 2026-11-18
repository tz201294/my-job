import { fieldName } from '../api/mappers';
import { useCatalog } from '../catalog';
import React from 'react';
import {
  Briefcase, Scale, Wrench, Truck, Code, HeartPulse,
  GraduationCap, ChefHat, Palette, FlaskConical, Shield,
} from 'lucide-react';
import { useI18n } from '../i18n';

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


export default function ProfessionDiscovery({ 
  categories, 
  selectedCategory, 
  onSelectCategory,
  onSelectRole,
  onOpenProfession,
}) {
  const { t } = useI18n();
  const { professions } = useCatalog();
  const selectedName = categories.find((c) => c.slug === selectedCategory)?.name;
  const catalogInField = professions.filter((p) => p.field === selectedName);
  return (
    <nav aria-label={t('discover.fields')} className="mb-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => {
          const IconComp = iconMap[cat.icon] || Briefcase;
          const isSelected = selectedCategory === cat.slug;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              aria-pressed={isSelected}
              className={`chip flex-shrink-0 ${isSelected ? 'chip-on' : ''}`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-teal-600'}`} aria-hidden="true" />
              <span>{cat.slug === 'all' ? t('discover.allProfessions') : fieldName(cat.name)}</span>
            </button>
          );
        })}
      </div>

      {/* Popular Role Quick Chips for current selection */}
      {selectedCategory !== 'all' && (
        <div className="mt-2.5 flex items-center gap-2 flex-wrap animate-fade-in">
          <span className="text-[11px] font-black text-teal-400 uppercase tracking-wider">
            {t('discover.popularIn', { field: fieldName(categories.find((c) => c.slug === selectedCategory)?.name) })}
          </span>
          {/* Catalog professions in this field; if none match (the demo's sample fields), its popular roles. */}
          {catalogInField.length > 0 ? catalogInField.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => onOpenProfession(p.slug)}
              className="chip"
            >
              {p.name}
            </button>
          )) : categories
            .find((c) => c.slug === selectedCategory)
            ?.popularRoles?.map((role, idx) => (
              <button
                key={idx}
                onClick={() => onSelectRole(role)}
                className="chip"
              >
                {role}
              </button>
            ))}
        </div>
      )}
    </nav>
  );
}
