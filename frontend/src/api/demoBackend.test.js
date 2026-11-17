// The in-browser demo backend (used on GitHub Pages) must behave like the real API: same response shapes,
// same permissions and validation. One long scenario, in the order a user would do things.
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { demoRequest, demoSignOut } from './demoBackend';
import { toChallenge, toComment, toPost, toProfileUser, toQuestion, toStories } from './mappers';

const req = (e, method = 'GET', body) => demoRequest(e, { method, body: body && JSON.stringify(body) });
const rejects = async (p, status) => { await assert.rejects(p, (e) => e.status === status); };

describe('demo backend', () => {
  it('supports every endpoint the app uses, with the same rules as the server', async () => {
    await rejects(req('/auth/me'), 401);
    await rejects(req('/auth/login', 'POST', { username_or_email: 'sarah_plumber', password: 'wrong' }), 401);
    await rejects(req('/auth/login', 'POST', { username_or_email: 'nobody', password: 'demo1234' }), 401);
    const auth = await req('/auth/login', 'POST', { username_or_email: 'Sarah_Plumber', password: 'demo1234' });
    assert.equal(auth.user.username, 'sarah_plumber');
    assert.ok(auth.user.full_name && auth.user.avatar_url, 'Header needs snake_case me');
    assert.equal((await req('/auth/me')).username, 'sarah_plumber');

    const posts = (await req('/posts/feed?limit=50')).map(toPost);
    assert.ok(posts.length > 0 && posts.every((p) => p.id && p.authorUsername));
    toStories(await req('/stories/feed')).forEach((s) => assert.ok(s.id && s.mediaUrl));
    (await req('/community/challenges')).map(toChallenge);
    (await req('/community/qa')).map(toQuestion);
    (await req('/auth/professionals')).map(toProfileUser).forEach((u) => assert.ok(u.username));

    // Like toggles and returns numbers
    const target = posts.find((p) => p.authorUsername !== 'sarah_plumber');
    const l1 = await req(`/posts/${target.id}/like`, 'POST');
    assert.equal(l1.is_liked, !target.isLiked);
    assert.equal(typeof l1.likes_count, 'number');
    const l2 = await req(`/posts/${target.id}/like`, 'POST');
    assert.equal(l2.likes_count, target.likesCount);

    // Bookmarks
    assert.equal((await req(`/posts/${target.id}/bookmark`, 'POST')).is_bookmarked, true);
    assert.deepEqual((await req('/posts/bookmarks?limit=100')).map((p) => p.id), [target.id]);
    await rejects(req('/posts/nope/like', 'POST'), 404);
    await rejects(req('/posts/nope'), 404);

    // Follow
    await rejects(req('/auth/users/sarah_plumber/follow', 'POST'), 400);
    const before = toProfileUser(await req(`/auth/users/${target.authorUsername}`));
    const f = await req(`/auth/users/${target.authorUsername}/follow`, 'POST');
    assert.equal(f.is_following, true);
    assert.equal(f.followers_count, before.followersCount + 1);
    assert.equal(toProfileUser(await req(`/auth/users/${target.authorUsername}`)).isFollowing, true);
    const following = await req('/posts/feed?following=true&limit=50');
    assert.ok(following.every((p) => ['sarah_plumber', target.authorUsername].includes(p.authorUsername)));
    assert.equal((await req(`/auth/users/${target.authorUsername}/follow`, 'DELETE')).followers_count, before.followersCount);
    await rejects(req('/auth/users/ghost'), 404);

    // Profile posts are filtered by author
    const authored = await req(`/posts/feed?author_username=${target.authorUsername}&limit=100`);
    assert.ok(authored.length > 0 && authored.every((p) => p.authorUsername === target.authorUsername));

    // Create post, then it shows in feed and own profile
    const created = toPost(await req('/posts', 'POST', {
      title: 'T', caption: 'C', post_type: 'general_post', media: [], tags: ['x'], task_details: null,
    }));
    assert.equal(created.authorUsername, 'sarah_plumber');
    assert.equal(created.likesCount, 0);
    assert.equal((await req('/posts/feed?limit=1'))[0].id, created.id);
    assert.equal((await req(`/posts/${created.id}`)).id, created.id);

    // Story, challenge, suggestion, upvote, question
    const story = toStories([await req('/stories', 'POST', { media_url: 'https://x/y.jpg', caption: 'hi', profession_tag: null })])[0];
    assert.equal(story.username, 'sarah_plumber');
    const chal = toChallenge(await req('/community/challenges', 'POST', {
      title: 'T', scenario_description: 'S', profession_category: 'Trades & Craftsmanship', urgency_level: 'brainstorming',
    }));
    assert.equal(chal.workerUsername, 'sarah_plumber');
    assert.deepEqual(chal.suggestions, []);
    const sug = await req(`/community/challenges/${chal.id}/suggest`, 'POST', { suggestion_text: 'try', suggested_tool_or_reference: null });
    assert.equal(sug.suggesterUsername, 'sarah_plumber');
    const up = await req(`/community/suggestions/${sug.id}/upvote`, 'POST');
    assert.deepEqual([up.upvoted, up.upvotes_count], [true, 1]);
    const worker = (await req('/auth/professionals')).find((u) => u.username === 'elena_lawyer');
    const q = toQuestion(await req(`/community/qa/${worker.id}/ask`, 'POST', { question_text: 'Q?', topic_tag: null }));
    assert.equal(q.workerUsername, 'elena_lawyer');
    const qv = await req(`/community/qa/questions/${q.id}/upvote`, 'POST');
    assert.deepEqual([qv.upvoted, qv.upvotes_count], [true, 1]);

    // Answering: only the asked worker; inbox filter; edits keep the answer
    const sarahInbox = (await req('/community/qa?worker_id=usr_101&answered=false&limit=100')).map(toQuestion);
    assert.ok(sarahInbox.length >= 1 && sarahInbox.every((x) => x.workerId === 'usr_101' && !x.answerText));
    const inboxQ = sarahInbox[0];
    await rejects(req(`/community/qa/questions/${q.id}/answer`, 'POST', { answer_text: 'not mine' }), 403);
    await rejects(req(`/community/qa/questions/${inboxQ.id}/answer`, 'POST', { answer_text: '   ' }), 422);
    await rejects(req(`/community/qa/questions/${inboxQ.id}/answer`, 'POST', { answer_text: 'x', video_response_url: 'javascript:x' }), 422);
    await rejects(req('/community/qa/questions/nope/answer', 'POST', { answer_text: 'x' }), 404);
    const ans = toQuestion(await req(`/community/qa/questions/${inboxQ.id}/answer`, 'POST', {
      answer_text: '  Yes, for the bigger jobs.  ', video_response_url: 'https://v.example.com/1',
    }));
    assert.equal(ans.answerText, 'Yes, for the bigger jobs.');
    assert.equal(ans.videoResponseUrl, 'https://v.example.com/1');
    assert.ok(!(await req('/community/qa?worker_id=usr_101&answered=false')).some((x) => x.id === inboxQ.id));
    assert.ok((await req('/community/qa?worker_id=usr_101&answered=true')).some((x) => x.id === inboxQ.id));
    const edited = await req(`/community/qa/questions/${inboxQ.id}/answer`, 'POST', { answer_text: 'Edited' });
    assert.equal(edited.answerText, 'Edited');
    assert.equal(edited.videoResponseUrl, null);

    // Accepting suggestions: only the owner (sarah owns chal and chal_01), one accepted at a time
    const elenaChal = (await req('/community/challenges')).find((c) => c.id === 'chal_02');
    await rejects(req(`/community/suggestions/${elenaChal.suggestions[0].id}/accept`, 'POST'), 403);
    await rejects(req('/community/suggestions/nope/accept', 'POST'), 404);
    const sug2 = await req(`/community/challenges/${chal.id}/suggest`, 'POST', { suggestion_text: 'second idea' });
    let acc = toChallenge(await req(`/community/suggestions/${sug.id}/accept`, 'POST'));
    assert.equal(acc.isSolved, true);
    assert.deepEqual(acc.suggestions.filter((x) => x.isAccepted).map((x) => x.id), [sug.id]);
    acc = toChallenge(await req(`/community/suggestions/${sug2.id}/accept`, 'POST'));
    assert.deepEqual(acc.suggestions.filter((x) => x.isAccepted).map((x) => x.id), [sug2.id]);
    acc = toChallenge(await req(`/community/suggestions/${sug.id}/accept`, 'DELETE'));
    assert.equal(acc.isSolved, true, 'withdrawing a non-accepted idea changes nothing');
    acc = toChallenge(await req(`/community/suggestions/${sug2.id}/accept`, 'DELETE'));
    assert.equal(acc.isSolved, false);
    assert.equal(acc.suggestions.filter((x) => x.isAccepted).length, 0);
    assert.equal((await req('/community/challenges')).find((c) => c.id === 'chal_01').isSolved, true);

    // Review recomputes rating; own post and duplicates are refused
    const cs = posts.find((p) => p.taskDetails && p.authorUsername !== 'sarah_plumber');
    const review = { post_id: cs.id, clarity_score: 5, accuracy_score: 3, feedback_text: 'ok', reviewer_profession: 'Plumber' };
    await req('/community/reviews', 'POST', review);
    const fresh = toPost(await req(`/posts/${cs.id}`));
    assert.equal(fresh.reviewsCount, (cs.reviewsCount || 0) + 1);
    assert.equal(typeof fresh.rating, 'number');
    assert.equal((await req(`/community/reviews/${cs.id}`)).length, 1);
    await rejects(req('/community/reviews', 'POST', review), 409);
    await rejects(req('/community/reviews', 'POST', { ...review, post_id: created.id }), 400);

    // ---------- Comments (signed in as sarah_plumber) ----------
    for (const p of await req('/posts/feed?limit=100')) {
      const page = await req(`/posts/${p.id}/comments`);
      assert.equal(page.total, p.commentsCount, `count matches for ${p.id}`);
    }
    const elenaPost = (await req('/posts/feed?limit=100')).find((p) => p.id === 'post_503');
    let cpage = await req('/posts/post_503/comments?limit=1&offset=1');
    assert.equal(cpage.total, 2);
    assert.equal(cpage.comments.length, 1);
    assert.equal(cpage.comments[0].username, 'sarah_plumber');
    await rejects(req('/posts/nope/comments'), 404);
    await rejects(req('/posts/post_503/comments', 'POST', { body: '   ' }), 422);
    const cm = toComment(await req('/posts/post_503/comments', 'POST', { body: '  Nice one  ' }));
    assert.equal(cm.body, 'Nice one');
    assert.equal(cm.username, 'sarah_plumber');
    assert.equal((await req('/posts/post_503')).commentsCount, elenaPost.commentsCount + 1);
    const cmEdited = await req(`/posts/post_503/comments/${cm.id}`, 'PATCH', { body: 'Nice one!' });
    assert.equal(cmEdited.body, 'Nice one!');
    assert.equal(cmEdited.edited, true);
    await rejects(req('/posts/post_503/comments/cmt_01', 'PATCH', { body: 'x' }), 403);
    await rejects(req('/posts/post_503/comments/cmt_01', 'DELETE'), 403); // not hers, not her post
    await rejects(req(`/posts/post_501/comments/${cm.id}`, 'DELETE'), 404); // wrong post
    await req(`/posts/post_503/comments/${cm.id}`, 'DELETE');
    assert.equal((await req('/posts/post_503')).commentsCount, elenaPost.commentsCount);
    // Sarah moderates a comment on her own post
    await req('/posts/post_501/comments/cmt_04', 'DELETE');
    assert.equal((await req('/posts/post_501/comments')).total, 1);

    // ---------- Edit & delete (signed in as sarah_plumber) ----------
    // Posts: own only, partial update, task details replace/remove, validation, delete removes reviews
    const someoneElses = (await req('/posts/feed?limit=50')).find((p) => p.authorUsername !== 'sarah_plumber');
    await rejects(req(`/posts/${someoneElses.id}`, 'PATCH', { title: 'x' }), 403);
    await rejects(req(`/posts/${someoneElses.id}`, 'DELETE'), 403);
    await rejects(req('/posts/nope', 'PATCH', { title: 'x' }), 404);
    let ep = toPost(await req(`/posts/${created.id}`, 'PATCH', { title: '  Edited  ', tags: ['a'] }));
    assert.equal(ep.title, 'Edited');
    assert.deepEqual(ep.tags, ['a']);
    assert.equal(ep.caption, 'C');
    await rejects(req(`/posts/${created.id}`, 'PATCH', { title: '   ' }), 422);
    await rejects(req(`/posts/${created.id}`, 'PATCH', { media: [{ url: 'javascript:x' }] }), 422);
    ep = toPost(await req(`/posts/${created.id}`, 'PATCH', {
      media: [{ url: 'https://img.example.com/x.jpg' }],
      task_details: { problem_statement: 'p', category: 'Plumbing', difficulty: 'expert', estimated_time_mins: 90,
        tools_used: ['wrench'], steps: [{ step_number: 1, title: 'S1', description: 'd1' }] },
    }));
    assert.equal(ep.mediaUrl, 'https://img.example.com/x.jpg');
    assert.equal(ep.taskDetails.difficulty, 'Expert');
    assert.equal(ep.taskDetails.estimatedMins, 90);
    assert.equal(ep.taskDetails.steps[0].title, 'S1');
    ep = toPost(await req(`/posts/${created.id}`, 'PATCH', { task_details: null, media: [] }));
    assert.equal(ep.taskDetails, undefined);
    assert.ok(ep.mediaUrl.startsWith('data:image/svg'));
    assert.equal(await req(`/posts/${created.id}`, 'DELETE'), null);
    await rejects(req(`/posts/${created.id}`), 404);
    assert.ok(!(await req('/posts/feed?limit=100')).some((p) => p.id === created.id));

    // Stories
    const otherStory = (await req('/stories/feed')).find((x) => x.username !== 'sarah_plumber');
    await rejects(req(`/stories/${otherStory.id}`, 'DELETE'), 403);
    await req(`/stories/${story.id}`, 'DELETE');
    assert.ok(!(await req('/stories/feed')).some((x) => x.id === story.id));

    // Questions: sarah asks elena, edits until answered, deletes
    const mine = toQuestion(await req(`/community/qa/${worker.id}/ask`, 'POST', { question_text: 'First?' }));
    assert.equal(mine.askerId, auth.user.id);
    const eq = await req(`/community/qa/questions/${mine.id}`, 'PATCH', { question_text: ' Second? ', topic_tag: '' });
    assert.equal(eq.questionText, 'Second?');
    assert.equal(eq.topicTag, 'General Inquiry');
    await rejects(req(`/community/qa/questions/${mine.id}`, 'PATCH', { question_text: '' }), 422);
    await rejects(req('/community/qa/questions/qa_01', 'PATCH', { question_text: 'x' }), 403);
    await rejects(req('/community/qa/questions/qa_01', 'DELETE'), 403);
    await req(`/community/qa/questions/${mine.id}`, 'DELETE');
    assert.ok(!(await req('/community/qa')).some((x) => x.id === mine.id));
    // The worker (sarah) can delete a question addressed to her
    await req('/community/qa/questions/qa_02', 'DELETE');

    // Challenges & suggestions
    await rejects(req('/community/challenges/chal_02', 'PATCH', { title: 'x' }), 403);
    const ec = await req(`/community/challenges/${chal.id}`, 'PATCH', { title: ' New title ', profession_category: 'Legal' });
    assert.equal(ec.title, 'New title');
    assert.equal(ec.category, 'Legal');
    await rejects(req(`/community/challenges/${chal.id}`, 'PATCH', { title: '' }), 422);
    const mySug = await req('/community/challenges/chal_02/suggest', 'POST', { suggestion_text: 'idea' });
    const es = await req(`/community/suggestions/${mySug.id}`, 'PATCH', { suggestion_text: 'better idea', suggested_tool_or_reference: '' });
    assert.equal(es.suggestionText, 'better idea');
    assert.equal(es.suggestedTool, undefined);
    await rejects(req('/community/suggestions/sug_03', 'PATCH', { suggestion_text: 'x' }), 403);
    await rejects(req('/community/suggestions/sug_03', 'DELETE'), 403);
    await req(`/community/suggestions/${mySug.id}`, 'DELETE');
    assert.ok(!(await req('/community/challenges')).find((c) => c.id === 'chal_02').suggestions.some((x) => x.id === mySug.id));
    // Owner deletes the accepted idea on her own challenge: challenge reopens
    const own = (await req('/community/challenges')).find((c) => c.id === 'chal_01');
    const acceptedSug = own.suggestions.find((x) => x.isAccepted);
    await rejects(req(`/community/suggestions/${acceptedSug.id}`, 'PATCH', { suggestion_text: 'x' }), 403);
    await req(`/community/suggestions/${acceptedSug.id}`, 'DELETE');
    assert.equal((await req('/community/challenges')).find((c) => c.id === 'chal_01').isSolved, false);
    await req(`/community/challenges/${chal.id}`, 'DELETE');
    assert.ok(!(await req('/community/challenges')).some((c) => c.id === chal.id));

    // Register, persistence, sign-out
    await rejects(req('/auth/register', 'POST', { username: 'sarah_plumber', password: 'x' }), 409);
    await req('/auth/register', 'POST', { username: 'newbie', password: 'secret12', full_name: 'New Bie', profession: null });
    assert.equal((await req('/auth/me')).username, 'newbie');
    demoSignOut();
    await rejects(req('/auth/me'), 401);
    await rejects(req('/auth/login', 'POST', { username_or_email: 'newbie', password: 'demo1234' }), 401);
    assert.equal((await req('/auth/login', 'POST', { username_or_email: 'newbie', password: 'secret12' })).user.username, 'newbie');
    await rejects(req('/something/else'), 404);

    // ---------- Notifications & reactions ----------
    demoSignOut();
    await req('/auth/login', 'POST', { username_or_email: 'elena_lawyer', password: 'demo1234' });
    let en = await req('/notifications');
    assert.ok(en.total > 0 && en.unread_count === en.total, 'elena has seeded unread notifications');
    assert.ok(en.notifications.some((n) => n.type === 'comment') && en.notifications.some((n) => n.type === 'follow'));
    // Elena reacts to a comment by sarah on her post and comments on alex's post
    const p503 = await req('/posts/post_503/comments');
    const sarahsComment = p503.comments.find((c) => c.username === 'sarah_plumber');
    let rs = await req(`/posts/post_503/comments/${sarahsComment.id}/reaction`, 'PUT', { emoji: '😂' });
    assert.deepEqual([rs.my_reaction, rs.reactions['😂']], ['😂', 1]);
    rs = await req(`/posts/post_503/comments/${sarahsComment.id}/reaction`, 'PUT', { emoji: '👏' });
    assert.equal(rs.reactions['😂'], undefined);
    assert.equal(rs.reactions['👏'], 1);
    await rejects(req(`/posts/post_503/comments/${sarahsComment.id}/reaction`, 'PUT', { emoji: '🍕' }), 422);
    const viewed = (await req('/posts/post_503/comments')).comments.find((c) => c.id === sarahsComment.id);
    assert.equal(viewed.myReaction, '👏');
    assert.equal(viewed.reactionsBy, undefined, 'internal map not exposed');
    const cmt01 = (await req('/posts/post_503/comments')).comments.find((c) => c.id === 'cmt_01');
    assert.equal(cmt01.reactions['❤️'], 1);
    await req('/posts/post_501/comments', 'POST', { body: 'Nice valve work' });
    const readR = await req('/notifications/read', 'POST', { ids: null });
    assert.equal(readR.unread_count, 0);
    assert.equal((await req('/notifications/unread-count')).unread_count, 0);
    // Sarah sees: reaction (collapsed into one) + comment, both from elena
    demoSignOut();
    await req('/auth/login', 'POST', { username_or_email: 'sarah_plumber', password: 'demo1234' });
    const sn = (await req('/notifications?limit=100')).notifications.filter((n) => n.actorUsername === 'elena_lawyer' && n.timeAgo === 'Just now');
    assert.deepEqual(sn.map((n) => n.type).sort(), ['comment', 'reaction']);
    assert.ok(sn.find((n) => n.type === 'reaction').snippet.startsWith('👏'));
    assert.ok((await req('/notifications?limit=100')).notifications.every((n) => n.recipientId === auth.user.id));
    // Removing the reaction withdraws it
    demoSignOut();
    await req('/auth/login', 'POST', { username_or_email: 'elena_lawyer', password: 'demo1234' });
    rs = await req(`/posts/post_503/comments/${sarahsComment.id}/reaction`, 'DELETE');
    assert.equal(rs.my_reaction, null);
    demoSignOut();
    await req('/auth/login', 'POST', { username_or_email: 'sarah_plumber', password: 'demo1234' });
    assert.ok(!(await req('/notifications?limit=100')).notifications.some((n) => n.type === 'reaction' && n.actorUsername === 'elena_lawyer' && n.timeAgo === 'Just now'));
    // No self-notifications
    const unreadBefore = (await req('/notifications/unread-count')).unread_count;
    await req('/posts/post_501/comments', 'POST', { body: 'replying on my own post' });
    assert.equal((await req('/notifications/unread-count')).unread_count, unreadBefore);

    // ---------- Settings (as alex_driver) ----------
    demoSignOut();
    await req('/auth/login', 'POST', { username_or_email: 'alex_driver', password: 'demo1234' });
    let meA = await req('/auth/me');
    assert.ok(meA.survey && meA.interests.length > 0, 'demo accounts have settings data');
    assert.equal((await req('/auth/users/alex_driver')).email, undefined, 'public profile hides private fields');
    meA = await req('/auth/me', 'PATCH', { full_name: '  Alex R.  ', bio: 'Night routes', email: 'Alex@Example.com' });
    assert.equal(meA.full_name, 'Alex R.');
    assert.equal(meA.email, 'alex@example.com');
    assert.equal((await req('/posts/feed?author_username=alex_driver&limit=100'))[0].authorFullName, 'Alex R.');
    await rejects(req('/auth/me', 'PATCH', { full_name: '' }), 422);
    await rejects(req('/auth/me', 'PATCH', { avatar_url: 'javascript:x' }), 422);
    await rejects(req('/auth/me', 'PATCH', { interests: [] }), 422);
    await rejects(req('/auth/me', 'PATCH', { email: 'bad' }), 422);
    // Verified badge drops when the profession changes, not for small edits
    const verifiedBefore = meA.profession.is_verified_pro;
    assert.equal(verifiedBefore, true);
    meA = await req('/auth/me', 'PATCH', { profession: { ...meA.profession, years_of_experience: 9 } });
    assert.equal(meA.profession.is_verified_pro, true);
    meA = await req('/auth/me', 'PATCH', { profession: { ...meA.profession, title: 'Dispatcher' } });
    assert.equal(meA.profession.is_verified_pro, false);
    meA = await req('/auth/me', 'PATCH', { works: false });
    assert.equal(meA.profession, null);
    assert.ok(!(await req('/auth/professionals')).some((x) => x.username === 'alex_driver'));
    meA = await req('/auth/me', 'PATCH', { data_consent: false });
    assert.equal(meA.survey.data_consent, false);
    // Password
    await rejects(req('/auth/me/password', 'POST', { current_password: 'nope', new_password: 'longenough1' }), 400);
    await rejects(req('/auth/me/password', 'POST', { current_password: 'demo1234', new_password: 'short' }), 422);
    const pw = await req('/auth/me/password', 'POST', { current_password: 'demo1234', new_password: 'longenough1' });
    assert.equal(pw.user.username, 'alex_driver');
    demoSignOut();
    await rejects(req('/auth/login', 'POST', { username_or_email: 'alex_driver', password: 'demo1234' }), 401);
    await req('/auth/login', 'POST', { username_or_email: 'alex_driver', password: 'longenough1' });
    // Delete account
    const sarahBefore = (await req('/auth/users/sarah_plumber')).followers_count;
    await req('/auth/users/sarah_plumber/follow', 'POST');
    await req('/posts/post_501/comments', 'POST', { body: 'bye' });
    await rejects(req('/auth/me/delete', 'POST', { password: 'demo1234' }), 400);
    await req('/auth/me/delete', 'POST', { password: 'longenough1' });
    await rejects(req('/auth/me'), 401);
    await rejects(req('/auth/users/alex_driver'), 404);
    assert.ok(!(await req('/posts/feed?limit=100')).some((p) => p.authorUsername === 'alex_driver'));
    assert.ok(!(await req('/stories/feed')).some((x) => x.username === 'alex_driver'));
    assert.ok(!(await req('/community/qa')).some((q) => q.workerUsername === 'alex_driver'));
    assert.ok(!(await req('/posts/post_501/comments')).comments.some((c) => c.username === 'alex_driver'));
    assert.equal((await req('/posts/post_501')).commentsCount, (await req('/posts/post_501/comments')).total);
    assert.equal((await req('/auth/users/sarah_plumber')).followers_count, sarahBefore);
    await rejects(req('/auth/login', 'POST', { username_or_email: 'alex_driver', password: 'longenough1' }), 401);
  });
});

describe('demo backend: tags', () => {
  it('normalizes and validates tags like the server', async () => {
    await req('/auth/login', 'POST', { username_or_email: 'sarah_plumber', password: 'demo1234' });
    const p = toPost(await req('/posts', 'POST', {
      title: 'T', caption: 'C', post_type: 'general_post', media: [], tags: [' #Plumbing ', 'plumbing', 'valve-repair', 'צנרת'],
    }));
    assert.deepEqual(p.tags, ['plumbing', 'valve-repair', 'צנרת']);
    await rejects(req('/posts', 'POST', { title: 'T', caption: 'C', tags: ['two words'] }), 422);
    await rejects(req(`/posts/${p.id}`, 'PATCH', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }), 422);
    assert.deepEqual((await req(`/posts/${p.id}`, 'PATCH', { tags: ['#New'] })).tags, ['new']);
  });
});
