import React, { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { api } from '../api/client';
import { useI18n } from '../i18n';

// Whether this server takes uploads (asked once per page load). If not, only the link box is shown.
let statusPromise = null;
const uploadStatus = () => {
  statusPromise = statusPromise || api.getUploadStatus().catch(() => ({ images: false }));
  return statusPromise;
};

/**
 * A photo: upload one from the device, or paste a link. The value is always the photo's address.
 * purpose: 'post' | 'story' | 'step' | 'avatar' (decides how much the server shrinks it).
 */
export default function ImageField({
  label, value, onChange, purpose = 'post', required = false, compact = false, preview = 'wide', inputId,
}) {
  const { t } = useI18n();
  const autoId = useId();
  const id = inputId || `image-${autoId}`;
  const fileRef = useRef(null);
  const [canUpload, setCanUpload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let live = true;
    uploadStatus().then((s) => { if (live) setCanUpload(!!s.images); });
    return () => { live = false; };
  }, []);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same file again still triggers a change
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('image.notPhoto'));
      return;
    }
    setBusy(true); setError('');
    try {
      const r = await api.uploadImage(file, purpose);
      setBroken(false);
      onChange(r.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = compact
    ? 'flex-1 min-w-0 p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] outline-none'
    : 'flex-1 min-w-0 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500';
  const previewCls = {
    wide: 'mt-2 w-full aspect-video max-h-40',
    tall: 'mt-3 w-32 h-44',
    small: 'w-24 h-16',
  }[preview];

  return (
    <div>
      {label && <label htmlFor={id} className="block text-xs font-bold text-slate-800 mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        {canUpload && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className={`shrink-0 inline-flex items-center gap-1.5 font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 disabled:opacity-60 ${
                compact ? 'px-2 py-1.5 rounded-lg text-[11px]' : 'px-3 py-2 rounded-xl text-xs'}`}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {busy ? t('image.uploading') : t('image.upload')}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
              onChange={pick} data-testid={`${id}-file`} />
          </>
        )}
        <input id={id} type="url" value={value} required={required && !busy}
          placeholder={canUpload ? t('image.orPaste') : 'https://…'}
          onChange={(e) => { setBroken(false); onChange(e.target.value); }}
          className={inputCls} />
      </div>
      {error && <p role="alert" className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
      {!canUpload && !compact && <p className="mt-1 text-[11px] text-slate-400">{t('image.pasteLink')}</p>}
      {value && preview !== 'none' && (
        <div className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 ${previewCls}`}>
          {broken ? (
            <p className="h-full flex items-center justify-center text-[11px] text-slate-500 p-2 text-center">{t('image.cantShow')}</p>
          ) : (
            <img src={value} alt={t('image.preview')} onError={() => setBroken(true)} className="w-full h-full object-cover" />
          )}
          <button type="button" onClick={() => onChange('')} aria-label={t('image.remove')}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
