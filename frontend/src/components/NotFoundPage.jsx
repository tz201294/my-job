import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { paths } from '../routes';
import { useI18n } from '../i18n';

export default function NotFoundPage({ title, message }) {
  const { t } = useI18n();
  return (
    <section className="bg-white border border-teal-100 rounded-3xl p-8 text-center shadow-2xs">
      <Compass className="w-12 h-12 mx-auto text-teal-300 mb-3" />
      <h2 className="font-black text-xl text-slate-900">{title || t('notFound.title')}</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        {message || t('notFound.text')}
      </p>
      <Link to={paths.home}
        className="inline-flex px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold">
        {t('notFound.home')}
      </Link>
    </section>
  );
}
