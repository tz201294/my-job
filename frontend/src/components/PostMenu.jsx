import React, { useState } from 'react';
import { Flag, Pencil, Trash2 } from 'lucide-react';
import MoreMenu from './MoreMenu';
import { ReportDialog } from './ReportButton';
import { useI18n } from '../i18n';

// The "⋯" menu on a post: Edit / Delete on your own, Report on other people's.
export default function PostMenu({ postId, isOwn, onEdit, onDelete, confirmText }) {
  const { t } = useI18n();
  const [reporting, setReporting] = useState(false);
  const what = t('item.post');
  const items = isOwn
    ? [
      { key: 'edit', label: t('owner.edit', { item: what }), icon: Pencil, onSelect: onEdit },
      {
        key: 'delete', label: t('owner.delete', { item: what }), icon: Trash2, danger: true,
        onSelect: () => { if (window.confirm(confirmText || t('owner.confirmDelete'))) onDelete(); },
      },
    ]
    : [{ key: 'report', label: t('report.button', { item: what }), icon: Flag, onSelect: () => setReporting(true) }];
  return (
    <>
      <MoreMenu items={items} />
      {reporting && <ReportDialog targetType="post" targetId={postId} label="post" onClose={() => setReporting(false)} />}
    </>
  );
}
