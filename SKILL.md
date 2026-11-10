---
name: my-job
description: Use when designing, developing, testing, or maintaining the MyJob application — a profession-centric social media platform (like Instagram) where workers from any profession (e.g., plumbers, bus drivers, lawyers, accountants, software engineers) share day-in-the-life stories, job tasks, workflows, and problem-solving techniques for followers to explore and understand how various professions operate.
---

# MyJob Application Development Skill

This skill guides the design, architecture, implementation, and enhancement of **MyJob** — an Instagram-style visual and story-driven social platform dedicated to showcasing real-world professions, daily workflows, and job task solutions.

---

## 1. Project Concept & Core Vision

**MyJob** bridges curiosity and real-world work by letting anyone—from manual trades to specialized corporate roles—share authentic glimpses into their daily tasks, professional challenges, and job workflows.

### Target Personas
1. **Professionals / Creators:**
   - Plumbers, electricians, mechanics, carpenters (Trades)
   - Bus drivers, pilots, train operators, couriers (Transportation & Logistics)
   - Lawyers, accountants, consultants, paralegals (Legal & Financial)
   - Software engineers, devops, product managers, designers (Tech)
   - Doctors, nurses, paramedics, pharmacists (Healthcare)
   - Teachers, chefs, artists, and every other profession.
2. **Followers / Explorers:**
   - Students & career switchers exploring what real jobs actually feel like.
   - Hobbyists and curious learners wanting to know how things work behind the scenes.
   - Peers looking for tips, tool recommendations, and best practices.

---

## 2. Core Functional Requirements

### 2.1 Stories & Ephemeral Highlights
- **Daily Job Stories:** 24-hour expiring photo/video snippets showing "A day in the life of a [Profession]".
- **Workflow Step Highlights:** Pinned story collections organized by task type (e.g., "Fixing a copper pipe leak", "Closing monthly accounting books", "Debugging a race condition in Go").

### 2.2 Feed & Task Walkthrough Posts
- **Visual Posts:** High-resolution photos, multi-image carousels, and short-form video reels.
- **Structured Task Breakdown:**
  - *Problem Statement:* What needed fixing or solving?
  - *Tools & Equipment Used:* List of physical or digital tools utilized.
  - *Step-by-Step Workflow:* Sequential steps executed to complete the job.
  - *Pro Tips & Pitfalls:* Key takeaways for peers or curious followers.

### 2.3 Profession Discovery & Taxonomy
- **Category & Job Tagging:** Hierarchical tagging (Industry → Profession → Specialization).
- **Profession Hubs:** Dedicated search/explore pages to filter accounts and posts by profession (e.g., `#Plumber`, `#SoftwareEngineer`, `#BusDriver`).
- **Location & Equipment Filters:** Filter stories and posts by region or tools used.

### 2.4 Social & Interactive Features
- **Follow & Activity Feed:** Follow individual accounts or subscribe to whole profession tags.
- **Task Q&A & Comments:** Threaded discussions with verified profession badges for commenting experts.
- **Appreciation & Bookmarks:** Save helpful workflow guides to custom collections (e.g., "Home Plumbing Tips", "Accounting Prep").

---

## 3. Data Model & Architecture Guidelines

When developing features for MyJob, adhere to the following schema paradigms:

### 3.1 User & Profession Profile
```json
{
  "userId": "usr_12345",
  "username": "sarah_plumber",
  "displayName": "Sarah Jenkins",
  "bio": "Licensed Master Plumber | Residential & Commercial Pipe Repair",
  "profession": {
    "industry": "Trades & Construction",
    "title": "Master Plumber",
    "yearsOfExperience": 8,
    "verified": true
  },
  "stats": {
    "followersCount": 14200,
    "followingCount": 350,
    "storiesCount": 89,
    "tasksCompletedCount": 215
  }
}
```

### 3.2 Story / Post Schema
```json
{
  "postId": "post_7890",
  "authorId": "usr_12345",
  "type": "task_walkthrough", // "story" | "post" | "task_walkthrough" | "reel"
  "title": "Replacing a corroded P-Trap under a commercial sink",
  "media": [
    {
      "type": "image",
      "url": "https://cdn.myjob.app/media/p-trap-before.jpg",
      "caption": "Initial corrosion check"
    },
    {
      "type": "video",
      "url": "https://cdn.myjob.app/media/p-trap-install.mp4",
      "duration": 45
    }
  ],
  "taskDetails": {
    "category": "Plumbing",
    "difficulty": "Intermediate",
    "tools": ["Pipe wrench", "PTFE tape", "Slip-joint pliers", "Bucket"],
    "steps": [
      "Shut off water supply valves",
      "Place catchment bucket under drain",
      "Loosen slip nuts and remove old trap",
      "Fit and seal new PVC P-trap"
    ]
  },
  "tags": ["plumbing", "diytips", "trades", "drainrepair"],
  "likesCount": 1240,
  "commentsCount": 85,
  "createdAt": "2026-11-10T12:00:00Z"
}
```

---

## 4. UI/UX Design System Guidelines

- **Mobile-First Responsive Layout:** High-fidelity touch navigation, swipeable story bars at top, responsive feed grid.
- **Visual Hierarchy:** Crisp photography/video embeds, clean typography with high readability in bright or dark workshop environments.
- **Badge Indicators:** Clear badges indicating profession category, verified professional status, and difficulty level.
- **Workflow Step Carousel:** Interactive step indicators with checkmarks as users progress through task slides.

---

## 5. Development & Contribution Standards

1. **Simplicity & Modularity:** Keep components modular and state management predictable.
2. **Accessible & Responsive:** Support keyboard navigation, screen readers, and adaptive media streaming.
3. **Clean Code & Testing:** Include unit tests and integration tests for core feeds, story uploads, and search filtering.
