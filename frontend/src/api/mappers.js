// Translates between the API's snake_case payloads and the camelCase shapes the UI components use.
import { timeAgoNow, tNow } from '../i18n';

// A Q&A topic ("Daily Routine & Worklife", stored in English) in the current language.
export function topicName(value) {
  if (!value) return value;
  const key = `topic.${value}`;
  const text = tNow(key);
  return text === key ? value : text;
}

// A field of work ("Trades & Craftsmanship", stored in English) in the current language.
export function fieldName(value) {
  if (!value) return value;
  const key = `field.${value}`;
  const text = tNow(key);
  return text === key ? value : text;
}

// Neutral silhouette for people without a profile photo (never a real person's picture).
export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ccfbf1"/>' +
      '<circle cx="32" cy="25" r="12" fill="#5eead4"/><path d="M10 60c2-13 11-20 22-20s20 7 22 20" fill="#5eead4"/></svg>'
  );

// Soft teal cover for posts that have no photo, so text-only posts still look intentional.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<g fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2">' +
      '<circle cx="1050" cy="120" r="180"/><circle cx="1050" cy="120" r="260"/><circle cx="150" cy="600" r="200"/></g></svg>'
  );

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// "5 min ago" in the current language (the app reloads its data when the language changes).
export const timeAgo = (iso) => timeAgoNow(iso);

export function formatDuration(mins) {
  if (!mins) return null;
  if (mins < 60) return tNow('duration.minutes', { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? tNow('duration.hoursMinutes', { h, m }) : tNow('duration.hours', { count: h });
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
    authorProfessionTitle: p.author_profession_title || tNow('role.explorer'),
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
    professionTitle: s.author_profession_title || tNow('role.explorer'),
    mediaUrl: s.media_url,
    caption: s.caption || '',
    timeAgo: timeAgo(s.created_at),
    professionTag: s.profession_tag || s.author_profession_title || tNow('stories.tag'),
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
    suggesterProfession: s.suggester_profession || tNow('role.explorer'),
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
    workerProfessionTitle: q.worker_profession_title || tNow('role.professional'),
    workerAvatarUrl: q.worker_avatar_url || DEFAULT_AVATAR,
    askerId: q.asker_id,
    askerUsername: q.asker_username,
    askerAvatarUrl: q.asker_avatar_url || DEFAULT_AVATAR,
    questionText: q.question_text,
    topicTag: q.topic_tag || tNow('qa.generalTopic'),
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
  const all = { id: 'cat_all', name: tNow('discover.allProfessions'), slug: 'all', icon: 'briefcase' };
  if (!Array.isArray(list)) return [all];
  if (list.some((c) => c.slug === 'all')) return list;
  return [
    all,
    ...list.map((c) => ({
      id: c.id,
      name: c.name, // the field's English name (what the API uses); shown with fieldName()
      slug: c.slug,
      icon: c.icon,
      activePros: c.activePros || (c.professions_count ? tNow('discover.prosCount', { count: c.professions_count }) : null),
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
    professionTitle: p?.title || tNow('role.explorer'),
    professionSlug: p?.catalog_slug || null,
    industry: p?.industry || tNow('role.exploring'),
    specialization: p?.specialization || '',
    yearsExp: p?.years_of_experience ?? 0,
    isVerified: !!p?.is_verified_pro,
    bio:
      u.bio ||
      (p
        ? `${p.title}${p.company_or_freelance ? ` @ ${p.company_or_freelance}` : ''}`
        : tNow('profile.defaultBio')),
    followersCount: u.followers_count,
    isFollowing: u.is_following,
    isBlocked: !!u.is_blocked,
    isPrivate: !!u.is_private,
    followRequested: !!u.follow_requested,
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
