import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, MessageCircle, Bookmark, Share2, Volume2, 
  VolumeX, Play, Pause, ChevronUp, ChevronDown, 
  Music, ShieldCheck, UserPlus, Check
} from 'lucide-react';

export default function ReelsHub({ 
  reels, 
  onLikeReel, 
  onBookmarkReel, 
  onOpenUserProfile 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const currentReel = reels[currentIndex] || reels[0];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!currentReel) return null;

  return (
    <div className="relative w-full max-w-sm sm:max-w-md mx-auto h-[84vh] max-h-[740px] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-between select-none">
      {/* Background Video */}
      <div className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={currentReel.videoUrl}
          poster={currentReel.posterUrl}
          playsInline
          loop
          muted={isMuted}
          autoPlay
          className="w-full h-full object-cover"
        />

        {/* Play/Pause Center Indicator on pause */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white scale-110">
              <Play className="w-8 h-8 fill-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Top Header: Volume Toggle & Navigation Indicator */}
      <div className="relative z-20 p-4 flex items-center justify-between text-white">
        <span className="font-extrabold text-xs uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
          Pro Reels • #{currentReel.professionTag}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 border border-white/10 transition-all"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Up / Down Navigation Floating Controls */}
      <div className="absolute right-3 top-16 z-30 flex flex-col gap-1.5">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === reels.length - 1}
          className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Right Action Rail (Likes, Comments, Bookmarks, Share) */}
      <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center gap-4 text-white">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onLikeReel(currentReel.id)}
            className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-125 ${
              currentReel.isLiked ? 'bg-rose-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart className={`w-6 h-6 ${currentReel.isLiked ? 'fill-white' : ''}`} />
          </button>
          <span className="text-[11px] font-bold drop-shadow-md">{currentReel.likesCount}</span>
        </div>

        {/* Comments */}
        <div className="flex flex-col items-center gap-1">
          <button className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all">
            <MessageCircle className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-bold drop-shadow-md">{currentReel.commentsCount}</span>
        </div>

        {/* Bookmark */}
        <button
          onClick={() => onBookmarkReel(currentReel.id)}
          className={`p-3 rounded-full backdrop-blur-md transition-all ${
            currentReel.isBookmarked ? 'bg-brand-500/80 text-white' : 'bg-black/40 text-white hover:bg-black/60'
          }`}
        >
          <Bookmark className={`w-6 h-6 ${currentReel.isBookmarked ? 'fill-white' : ''}`} />
        </button>

        {/* Share */}
        <button className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all">
          <Share2 className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Author & Caption Bar */}
      <div className="relative z-20 p-4 space-y-2.5 max-w-[82%] text-white">
        {/* Author details */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => onOpenUserProfile && onOpenUserProfile(currentReel.authorUsername)}
        >
          <img
            src={currentReel.authorAvatarUrl}
            alt={currentReel.authorFullName}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight drop-shadow-md group-hover:underline">
                {currentReel.authorFullName}
              </span>
              <ShieldCheck className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-[11px] text-white/80 font-medium">
              {currentReel.authorProfessionTitle}
            </p>
          </div>
        </div>

        {/* Caption */}
        <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium line-clamp-3 drop-shadow-md">
          {currentReel.caption}
        </p>

        {/* Audio Track Tag */}
        <div className="flex items-center gap-2 text-[11px] text-white/80">
          <Music className="w-3.5 h-3.5 animate-spin" />
          <span className="truncate">{currentReel.audioTitle}</span>
        </div>
      </div>
    </div>
  );
}
