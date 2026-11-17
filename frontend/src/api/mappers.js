// Translates between the API's snake_case payloads and the camelCase shapes the UI components use.

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

// Neutral grey tile for posts that have no media.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#1e293b"/></svg>'
  );

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The API sends naive UTC timestamps without a zone suffix; treat them as UTC.
export function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  const secs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function formatDuration(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// ---------- API -> UI ----------

export function toPost(p) {
  if (p.authorUsername && p.mediaUrl !== undefined) return p;
  const td = p.task_details;
  return {
    id: p.id,
    authorId: p.author_id,
    authorUsername: p.author_username,
    authorFullName: p.author_full_name,
    authorAvatarUrl: p.author_avatar_url || DEFAULT_AVATAR,
    authorProfessionTitle: p.author_profession_title || 'Explorer',
    authorIndustry: p.author_industry || null,
    isAuthorVerified: p.is_author_verified,
    postType: p.post_type,
    title: p.title,
    caption: p.caption,
    mediaUrl: p.media?.[0]?.url || PLACEHOLDER_IMAGE,
    tags: p.tags || [],
    likesCount: p.likes_count,
    commentsCount: p.comments_count,
    isLiked: p.is_liked_by_me,
    isBookmarked: p.is_bookmarked_by_me,
    rating: p.rating, // null until the first review
    reviewsCount: p.reviews_count,
    timeAgo: timeAgo(p.created_at),
    taskDetails: td
      ? {
          problemStatement: td.problem_statement,
          category: td.category,
          difficulty: capitalize(td.difficulty),
          estimatedDuration: formatDuration(td.estimated_time_mins),
          estimatedMins: td.estimated_time_mins || null,
          toolsUsed: td.tools_used || [],
          safetyWarnings: td.safety_warnings,
          steps: (td.steps || []).map((s) => ({
            stepNumber: s.step_number,
            title: s.title,
            description: s.description,
            imageUrl: s.image_url,
            tip: s.tip,
          })),
        }
      : undefined,
  };
}

export function toStory(s) {
  if (s.userId && s.professionTag !== undefined) return s;
  return {
    id: s.id,
    userId: s.user_id,
    username: s.author_username,
    fullName: s.author_full_name || s.author_username,
    avatarUrl: s.author_avatar_url || DEFAULT_AVATAR,
    professionTitle: s.author_profession_title || 'Explorer',
    mediaUrl: s.media_url,
    caption: s.caption || '',
    timeAgo: timeAgo(s.created_at),
    professionTag: s.profession_tag || s.author_profession_title || 'Story',
  };
}

// The tray shows one flat list, so story groups are flattened (newest first as sent by the API).
export const toStories = (groups) => Array.isArray(groups) ? (groups[0]?.stories ? groups.flatMap((g) => g.stories.map(toStory)) : groups.map(toStory)) : [];

export function toSuggestion(s) {
  if (s.suggesterUsername && s.suggestionText !== undefined) return s;
  return {
    id: s.id,
    suggesterId: s.suggester_id,
    suggesterUsername: s.suggester_username,
    suggesterProfession: s.suggester_profession || 'Explorer',
    suggestionText: s.suggestion_text,
    suggestedTool: s.suggested_tool_or_reference || undefined,
    upvotes: s.upvotes_count,
    upvotedByMe: s.upvoted_by_me,
    isAccepted: s.is_accepted_by_worker,
  };
}

export function toChallenge(c) {
  if (c.workerUsername && c.scenarioDescription !== undefined) return c;
  return {
    id: c.id,
    workerId: c.worker_id,
    workerUsername: c.worker_username,
    workerFullName: c.worker_full_name || c.worker_username,
    workerProfessionTitle: c.worker_profession_title,
    workerAvatarUrl: c.worker_avatar_url || DEFAULT_AVATAR,
    title: c.title,
    scenarioDescription: c.scenario_description,
    category: c.profession_category,
    urgencyLevel: capitalize(c.urgency_level),
    timeAgo: timeAgo(c.created_at),
    isSolved: c.is_solved,
    suggestions: (c.suggestions || []).map(toSuggestion),
  };
}

export function toQuestion(q) {
  if (q.workerUsername && q.questionText !== undefined) return q;
  return {
    id: q.id,
    workerId: q.worker_id,
    workerUsername: q.worker_username,
    workerFullName: q.worker_full_name || q.worker_username,
    workerProfessionTitle: q.worker_profession_title || 'Professional',
    workerAvatarUrl: q.worker_avatar_url || DEFAULT_AVATAR,
    askerId: q.asker_id,
    askerUsername: q.asker_username,
    askerAvatarUrl: q.asker_avatar_url || DEFAULT_AVATAR,
    questionText: q.question_text,
    topicTag: q.topic_tag || 'General Inquiry',
    answerText: q.answer_text,
    videoResponseUrl: q.video_response_url || null,
    answeredTimeAgo: q.answered_at ? timeAgo(q.answered_at) : null,
    upvotes: q.upvotes_count,
    upvotedByMe: q.upvoted_by_me,
    timeAgo: timeAgo(q.created_at),
  };
}

export function toComment(c) {
  if (c.userId && c.body !== undefined && c.timeAgo !== undefined) return c;
  return {
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    username: c.username,
    fullName: c.full_name || c.username,
    avatarUrl: c.avatar_url || DEFAULT_AVATAR,
    professionTitle: c.profession_title || null,
    body: c.body,
    timeAgo: timeAgo(c.created_at),
    edited: !!c.updated_at,
    reactions: c.reactions || {},
    myReaction: c.my_reaction || null,
  };
}

// The emoji people can react to a comment with (same list as the server).
export const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '👏', '💡'];

export function toNotification(n) {
  if (n.actorUsername && n.timeAgo !== undefined) return n;
  return {
    id: n.id,
    type: n.type,
    actorId: n.actor_id,
    actorUsername: n.actor_username,
    actorFullName: n.actor_full_name || n.actor_username,
    actorAvatarUrl: n.actor_avatar_url || DEFAULT_AVATAR,
    postId: n.post_id || null,
    commentId: n.comment_id || null,
    questionId: n.question_id || null,
    challengeId: n.challenge_id || null,
    suggestionId: n.suggestion_id || null,
    snippet: n.snippet || '',
    timeAgo: timeAgo(n.created_at),
    read: !!n.read,
  };
}

export function toCategories(list) {
  if (!Array.isArray(list)) return [{ id: 'cat_all', name: 'All Professions', slug: 'all', icon: 'briefcase' }];
  if (list.some((c) => c.slug === 'all')) return list;
  const all = { id: 'cat_all', name: 'All Professions', slug: 'all', icon: 'briefcase' };
  return [
    all,
    ...list.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      activePros: c.activePros || (c.professions_count ? `${c.professions_count} ${c.professions_count === 1 ? 'Pro' : 'Pros'}` : null),
      popularRoles: c.popularRoles || c.popular_roles,
    })),
  ];
}

export function toProfileUser(u) {
  if (u.username && u.professionTitle !== undefined) return u;
  const p = u.profession;
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    avatarUrl: u.avatar_url || DEFAULT_AVATAR,
    professionTitle: p?.title || 'Explorer',
    industry: p?.industry || 'Exploring professions',
    specialization: p?.specialization || '',
    yearsExp: p?.years_of_experience ?? 0,
    isVerified: !!p?.is_verified_pro,
    bio:
      u.bio ||
      (p
        ? `${p.title}${p.company_or_freelance ? ` @ ${p.company_or_freelance}` : ''}`
        : 'Curious about how every profession works.'),
    followersCount: u.followers_count,
    isFollowing: u.is_following,
    followingCount: u.following_count,
    postsCount: u.posts_count,
    rating: u.rating, // null until one of their posts is reviewed
    keyTools: p?.key_tools || [],
    highlights: [],
  };
}

// ---------- UI -> API ----------

export function toPostPayload(d) {
  const t = d.taskDetails;
  return {
    title: d.title.trim(),
    caption: d.caption.trim(),
    post_type: d.postType,
    media: d.mediaUrl ? [{ url: d.mediaUrl, media_type: 'image' }] : [],
    tags: d.tags,
    task_details: t
      ? {
          problem_statement: t.problemStatement.trim(),
          category: t.category,
          difficulty: t.difficulty,
          estimated_time_mins: t.estimatedMins || null,
          tools_used: t.toolsUsed,
          safety_warnings: t.safetyWarnings?.trim() || null,
          steps: t.steps.map((s, i) => ({
            step_number: i + 1,
            title: s.title.trim(),
            description: s.description.trim(),
            image_url: s.imageUrl?.trim() || null,
            tip: s.tip?.trim() || null,
          })),
        }
      : null,
  };
}

// Same fields as a new post, minus the type, which can't change after publishing.
export function toPostUpdatePayload(d) {
  const { post_type: _postType, ...rest } = toPostPayload(d);
  return rest;
}

export const toStoryPayload = (d) => ({
  media_url: d.mediaUrl,
  caption: d.caption.trim(),
  profession_tag: d.professionTag || null,
});

export const toChallengePayload = (d) => ({
  title: d.title.trim(),
  scenario_description: d.scenarioDescription.trim(),
  profession_category: d.category,
  urgency_level: 'brainstorming',
});

export const toReviewPayload = (d) => ({
  post_id: d.postId,
  clarity_score: d.clarityScore,
  accuracy_score: d.accuracyScore,
  feedback_text: d.feedbackText.trim(),
  reviewer_profession: d.reviewerRole,
});
