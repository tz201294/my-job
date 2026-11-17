import React from 'react';
import { Bell, UserPlus, MessageSquareText, CheckCircle2, Star, MessageCircle } from 'lucide-react';

const COMING = [
  { icon: UserPlus, text: 'Someone follows you' },
  { icon: MessageSquareText, text: 'Someone asks you a question, or answers yours' },
  { icon: CheckCircle2, text: 'Your idea is accepted as the solution' },
  { icon: Star, text: 'Someone reviews your case study' },
  { icon: MessageCircle, text: 'Someone comments on your post' },
];

// Notifications need a backend feature that doesn't exist yet (see ROADMAP.md). Until then this page says so,
// rather than showing made-up alerts.
export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700"><Bell className="w-5 h-5" /></span>
        <h2 className="font-black text-xl text-slate-900">Notifications</h2>
      </div>
      <section className="bg-white border border-teal-100 rounded-3xl p-6 text-center shadow-2xs">
        <Bell className="w-10 h-10 mx-auto text-teal-200 mb-3" />
        <p className="text-sm font-extrabold text-slate-800">Notifications are coming soon</p>
        <p className="text-xs text-slate-500 mt-1 mb-5">You'll be told here when:</p>
        <ul className="inline-flex flex-col gap-2.5 text-left">
          {COMING.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
              <Icon className="w-4 h-4 text-teal-500" /> {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
