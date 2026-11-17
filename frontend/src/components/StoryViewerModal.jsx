import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Send, Sparkles, ShieldCheck } from 'lucide-react';
import OwnerActions from './OwnerActions';

export default function StoryViewerModal({ stories, initialIndex, currentUserId, onDeleteStory, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  const story = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    setIsLiked(false);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((curr) => curr + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // 50 ticks ~ 5 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSentNotice(true);
    setCommentText('');
    setTimeout(() => setSentNotice(false), 2000);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 p-2.5 rounded-full transition-all hover:scale-110 z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Story Mobile Device Container */}
      <div className="relative w-full max-w-sm h-[90vh] max-h-[780px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
        {/* Progress Bars at top */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Author Header */}
        <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <img
              src={story.avatarUrl}
              alt={story.fullName}
              className="w-10 h-10 rounded-full object-cover border border-white"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">{story.fullName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <p className="text-[11px] text-white/80 font-medium">
                {story.professionTitle} • <span className="text-white/60">{story.timeAgo}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onDeleteStory && currentUserId && story.userId === currentUserId && (
              <OwnerActions
                label="story"
                tone="dark"
                onDelete={() => onDeleteStory(story.id)}
                confirmText="Delete this story now? It won't be shown to anyone anymore."
              />
            )}
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider">
              {story.professionTag}
            </span>
          </div>
        </div>

        {/* Story Media Background */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={story.mediaUrl}
            alt={story.caption}
            className="w-full h-full object-cover"
          />
          {/* Subtle gradient overlay for captions */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

          {/* Clickable tap zones for prev/next */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={handleNext} />
        </div>

        {/* Story Caption & Interactivity */}
        <div className="absolute bottom-0 inset-x-0 p-4 z-30 flex flex-col gap-3">
          {/* Caption text */}
          <div className="bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-white text-sm font-medium leading-relaxed">
            {story.caption}
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendComment} className="flex-1 relative">
              <input
                type="text"
                placeholder={`Ask ${story.fullName.split(' ')[0]} about this...`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white/20 hover:bg-white/25 focus:bg-white/30 text-white placeholder-white/70 text-xs rounded-full border border-white/20 outline-none backdrop-blur-md"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white hover:text-sky-300 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                isLiked 
                  ? 'bg-rose-500/80 border-rose-400 text-white scale-110' 
                  : 'bg-white/20 border-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
            </button>
          </div>

          {sentNotice && (
            <div className="text-center text-xs font-semibold text-emerald-400 animate-fade-in">
              Reply sent to {story.fullName}!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
