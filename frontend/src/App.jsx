import React, { useState } from 'react';
import Header from './components/Header';
import StoryTray from './components/StoryTray';
import StoryViewerModal from './components/StoryViewerModal';
import PostCard from './components/PostCard';
import CaseStudyDetailModal from './components/CaseStudyDetailModal';
import ReviewRatingModal from './components/ReviewRatingModal';
import ProfessionDiscovery from './components/ProfessionDiscovery';
import ChallengesHub from './components/ChallengesHub';
import QAHub from './components/QAHub';
import CreatePostModal from './components/CreatePostModal';

import { 
  INITIAL_POSTS, 
  INITIAL_STORIES, 
  INITIAL_CATEGORIES, 
  INITIAL_CHALLENGES, 
  INITIAL_QA_ITEMS 
} from './data/mockData';

import { 
  Flame, Sparkles, Filter, Layers, Puzzle, 
  HelpCircle, Compass, ShieldCheck 
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState('worker'); // 'worker' | 'explorer'
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'challenges' | 'qa'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data States
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [stories, setStories] = useState(INITIAL_STORIES);
  const [categories] = useState(INITIAL_CATEGORIES);
  const [challenges, setChallenges] = useState(INITIAL_CHALLENGES);
  const [qaItems, setQaItems] = useState(INITIAL_QA_ITEMS);

  // Modals
  const [activeStoryIdx, setActiveStoryIdx] = useState(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState(null);
  const [reviewModalPost, setReviewModalPost] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Handlers
  const handleLikePost = (postId) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    }));
  };

  const handleBookmarkPost = (postId) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return { ...p, isBookmarked: !p.isBookmarked };
      }
      return p;
    }));
  };

  const handleAddReview = (reviewData) => {
    setPosts(posts.map(p => {
      if (p.id === reviewData.postId) {
        const newCount = (p.reviewsCount || 0) + 1;
        return {
          ...p,
          reviewsCount: newCount,
          rating: Number(((p.rating || 4.8) * 0.9 + reviewData.clarityScore * 0.1).toFixed(1))
        };
      }
      return p;
    }));
  };

  const handleAddPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handleAddStory = (newStory) => {
    setStories([newStory, ...stories]);
  };

  const handleAddChallenge = (newChallenge) => {
    setChallenges([newChallenge, ...challenges]);
  };

  const handleAddSuggestion = (challengeId, newSuggestion) => {
    setChallenges(challenges.map(c => {
      if (c.id === challengeId) {
        return {
          ...c,
          suggestions: [newSuggestion, ...(c.suggestions || [])]
        };
      }
      return c;
    }));
  };

  const handleUpvoteSuggestion = (challengeId, suggestionId) => {
    setChallenges(challenges.map(c => {
      if (c.id === challengeId) {
        return {
          ...c,
          suggestions: c.suggestions.map(s => {
            if (s.id === suggestionId) {
              return { ...s, upvotes: s.upvotes + 1 };
            }
            return s;
          })
        };
      }
      return c;
    }));
  };

  const handleAskQuestion = (newQA) => {
    setQaItems([newQA, ...qaItems]);
  };

  const handleUpvoteQA = (qaId) => {
    setQaItems(qaItems.map(q => {
      if (q.id === qaId) {
        return { ...q, upvotes: q.upvotes + 1 };
      }
      return q;
    }));
  };

  // Filtered Posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      !searchTerm ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.authorProfessionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.taskDetails?.toolsUsed?.some(tool => tool.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory = 
      selectedCategory === 'all' ||
      (selectedCategory === 'legal' && post.authorProfessionTitle.toLowerCase().includes('attorney')) ||
      (selectedCategory === 'trades' && post.authorProfessionTitle.toLowerCase().includes('plumber')) ||
      (selectedCategory === 'transportation' && post.authorProfessionTitle.toLowerCase().includes('bus'));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <Header
        currentRole={currentRole}
        onToggleRole={setCurrentRole}
        onOpenCreate={() => setIsCreateOpen(true)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Story Tray (24h Ephemeral Shifts) */}
        <StoryTray
          stories={stories}
          onSelectStory={(_, idx) => setActiveStoryIdx(idx)}
          currentRole={currentRole}
          onOpenAddStory={() => setIsCreateOpen(true)}
        />

        {/* Profession Discovery & Filter Slider */}
        <ProfessionDiscovery
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onSelectRole={(role) => setSearchTerm(role)}
        />

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl mb-6 text-xs font-bold border border-slate-300/60 max-w-md">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-brand-600" />
            <span>Feed & Case Studies</span>
          </button>

          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'challenges'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Work Dilemmas ({challenges.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('qa')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all ${
              activeTab === 'qa'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Q&A AMAs</span>
          </button>
        </div>

        {/* FEED TAB CONTENT */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-600">No posts matched your search filters.</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                  className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLikePost}
                  onBookmark={handleBookmarkPost}
                  onOpenCaseStudy={setSelectedCaseStudy}
                  onOpenReviewModal={setReviewModalPost}
                />
              ))
            )}
          </div>
        )}

        {/* CHALLENGES TAB CONTENT */}
        {activeTab === 'challenges' && (
          <ChallengesHub
            challenges={challenges}
            onAddSuggestion={handleAddSuggestion}
            onUpvoteSuggestion={handleUpvoteSuggestion}
            currentRole={currentRole}
            onOpenCreateChallenge={() => setIsCreateOpen(true)}
          />
        )}

        {/* QA AMAs TAB CONTENT */}
        {activeTab === 'qa' && (
          <QAHub
            qaItems={qaItems}
            onAskQuestion={handleAskQuestion}
            onUpvoteQA={handleUpvoteQA}
          />
        )}
      </main>

      {/* Story Viewer Modal */}
      {activeStoryIdx !== null && (
        <StoryViewerModal
          stories={stories}
          initialIndex={activeStoryIdx}
          onClose={() => setActiveStoryIdx(null)}
        />
      )}

      {/* Case Study Deep-Dive Walkthrough Modal */}
      {selectedCaseStudy && (
        <CaseStudyDetailModal
          post={selectedCaseStudy}
          onClose={() => setSelectedCaseStudy(null)}
          onOpenReviewModal={(post) => {
            setSelectedCaseStudy(null);
            setReviewModalPost(post);
          }}
        />
      )}

      {/* Review & Technique Rating Modal */}
      {reviewModalPost && (
        <ReviewRatingModal
          post={reviewModalPost}
          onClose={() => setReviewModalPost(null)}
          onSubmitReview={handleAddReview}
        />
      )}

      {/* Worker Post/Story/Challenge Creator Studio Modal */}
      {isCreateOpen && (
        <CreatePostModal
          onClose={() => setIsCreateOpen(false)}
          onCreatePost={handleAddPost}
          onCreateStory={handleAddStory}
          onCreateChallenge={handleAddChallenge}
        />
      )}
    </div>
  );
}
