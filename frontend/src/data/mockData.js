export const INITIAL_USERS = {
  "elena_lawyer": {
    id: "usr_103",
    username: "elena_lawyer",
    fullName: "Elena Vance, Esq.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Commercial Litigation Partner",
    industry: "Legal & Regulatory",
    specialization: "Commercial Litigation & IP",
    yearsExp: 12,
    isVerified: true,
    bio: "Commercial Litigation Partner @ Vance & Associates | Complex Tech Contracts, Federal IP Disputes, and Courtroom Strategy ⚖️",
    followersCount: 21500,
    followingCount: 420,
    postsCount: 62,
    rating: 4.9,
    keyTools: ["Westlaw Legal", "LexisNexis", "FRCP Rule 45", "Clio Suite", "Adobe Redaction"],
    highlights: [
      { id: "hl_01", title: "Subpoenas", cover: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_02", title: "Court Prep", cover: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_03", title: "Arbitration", cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_04", title: "Daily Coffee", cover: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80" }
    ]
  },
  "sarah_plumber": {
    id: "usr_101",
    username: "sarah_plumber",
    fullName: "Sarah Jenkins",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Master Plumber",
    industry: "Trades & Craftsmanship",
    specialization: "Commercial High-Rise Piping",
    yearsExp: 10,
    isVerified: true,
    bio: "Licensed Master Plumber @ Jenkins Pro Plumbing | Demystifying water pressure, commercial boilers, & drain acoustics 🛠️",
    followersCount: 14200,
    followingCount: 310,
    postsCount: 48,
    rating: 4.8,
    keyTools: ["24-inch Pipe Wrench", "Digital Manometer", "PTFE Sealant", "Drain Camera", "PEX Crimper"],
    highlights: [
      { id: "hl_11", title: "PRV Valves", cover: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_12", title: "Boiler Rigs", cover: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_13", title: "Tool Bag", cover: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80" }
    ]
  },
  "alex_driver": {
    id: "usr_102",
    username: "alex_driver",
    fullName: "Alex Rivera",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Transit Bus Operator",
    industry: "Transportation & Logistics",
    specialization: "60ft Articulated Hybrid Fleet",
    yearsExp: 6,
    isVerified: true,
    bio: "City Transit Bus Operator @ Metro Express | 60ft articulated hybrid buses through urban rush hour corridors 🚌",
    followersCount: 8900,
    followingCount: 140,
    postsCount: 29,
    rating: 4.9,
    keyTools: ["Route Telematics", "Convex Mirrors", "Regen Braking", "Dispatch CAD/AVL"],
    highlights: [
      { id: "hl_21", title: "60ft Pivots", cover: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80" },
      { id: "hl_22", title: "Pre-Trips", cover: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=400&q=80" }
    ]
  },
  "david_cpa": {
    id: "usr_104",
    username: "david_cpa",
    fullName: "David Chen, CPA",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Senior Forensic Accountant",
    industry: "Legal & Finance",
    specialization: "Fraud Audit & Section 1031 Exchanges",
    yearsExp: 8,
    isVerified: true,
    bio: "Forensic Accountant | Tracing multi-currency wire trails, ledger discrepancies & 1031 tax structuring 📊",
    followersCount: 11200,
    followingCount: 280,
    postsCount: 35,
    rating: 4.9,
    keyTools: ["Excel PowerQuery", "Alteryx", "IDEA Audit", "QuickBooks Enterprise"],
    highlights: [
      { id: "hl_31", title: "Audit Trails", cover: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" }
    ]
  }
};

export const INITIAL_STORIES = [
  {
    id: "story_03",
    userId: "usr_103",
    username: "elena_lawyer",
    fullName: "Elena Vance, Esq.",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Litigation Partner",
    mediaUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    caption: "Early morning cortado & binder prep before today's 9:00 AM federal injunction hearing ☕⚖️",
    timeAgo: "2h ago",
    professionTag: "Legal"
  },
  {
    id: "story_01",
    userId: "usr_101",
    username: "sarah_plumber",
    fullName: "Sarah Jenkins",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Master Plumber",
    mediaUrl: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80",
    caption: "Diagnostic camera run through a 40-year old cast iron main line 🛠️",
    timeAgo: "4h ago",
    professionTag: "Trades"
  },
  {
    id: "story_02",
    userId: "usr_102",
    username: "alex_driver",
    fullName: "Alex Rivera",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Transit Bus Operator",
    mediaUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
    caption: "Pre-trip morning safety inspection & regenerative brake check completed 🚌✅",
    timeAgo: "5h ago",
    professionTag: "Transport"
  },
  {
    id: "story_04",
    userId: "usr_104",
    username: "david_cpa",
    fullName: "David Chen, CPA",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    professionTitle: "Forensic Accountant",
    mediaUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    caption: "Coffee #3 while cross-referencing multi-currency wire trails for a Q3 audit 📊",
    timeAgo: "6h ago",
    professionTag: "Finance"
  }
];

export const INITIAL_POSTS = [
  {
    id: "post_503",
    authorId: "usr_103",
    authorUsername: "elena_lawyer",
    authorFullName: "Elena Vance, Esq.",
    authorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Commercial Litigation Attorney",
    isAuthorVerified: true,
    postType: "pro_case_study",
    title: "Mastering the Subpoena Duces Tecum: How to Compel Critical Server Evidence Step-by-Step",
    caption: "A deep dive into how litigation attorneys draft, scope, and serve third-party discovery subpoenas without getting them quashed on grounds of undue burden.",
    mediaUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    tags: ["litigation", "subpoena", "lawpractice", "evidence", "discovery"],
    likesCount: 1450,
    commentsCount: 88,
    isLiked: false,
    isBookmarked: false,
    rating: 4.9,
    reviewsCount: 18,
    timeAgo: "3 hours ago",
    taskDetails: {
      problemStatement: "In a corporate breach of contract dispute, the opposing party claimed all communication logs were permanently purged. We needed to compel the third-party cloud hosting provider to preserve and produce unedited authentication records before statutory deadlines.",
      category: "Legal & Regulatory",
      difficulty: "Expert",
      estimatedDuration: "3 Hours Prep",
      toolsUsed: ["Westlaw Legal Research", "Federal Rules of Civil Procedure (Rule 45)", "PDF Redaction Suite", "Licensed Process Server"],
      safetyWarnings: "Ensure mandatory prior notice is served on all parties at least 5 business days before third-party service to prevent sanctions under FRCP 45(a)(4).",
      steps: [
        {
          stepNumber: 1,
          title: "Draft Narrowly Tailored Document Requests (Schedule A)",
          description: "Avoid overly broad catch-alls that invite undue burden motions. Specify exact server log date ranges, IP tables, and user authentication tokens.",
          imageUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
          tip: "Define technical terms clearly so IT custodians cannot exploit ambiguities."
        },
        {
          stepNumber: 2,
          title: "Issue Mandatory Notice of Intent to Serve",
          description: "Serve a copy of the subpoena on all parties to the action at least 5 business days before service on the third-party witness.",
          imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
          tip: "Retain timestamped electronic service receipts in the litigation docket."
        },
        {
          stepNumber: 3,
          title: "Execute Personal Service & Monitor Compliance Window",
          description: "Engage a certified process server in the target jurisdiction. Track the 14-day statutory objection window.",
          imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80",
          tip: "Follow up with a courteous call to the cloud provider's in-house legal counsel to clarify file delivery formats."
        }
      ]
    }
  },
  {
    id: "post_504",
    authorId: "usr_103",
    authorUsername: "elena_lawyer",
    authorFullName: "Elena Vance, Esq.",
    authorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Commercial Litigation Attorney",
    isAuthorVerified: true,
    postType: "general_post",
    title: "14-Month Tech Licensing Arbitration Concluded!",
    caption: "After 14 months of heated arbitration hearings and over 80,000 discovery pages reviewed, our litigation team secured a complete dismissal of all IP infringement claims for our client. Celebrating with the associate team tonight! 🥂⚖️",
    mediaUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    tags: ["verdict", "litigationwin", "teamwork", "milestone"],
    likesCount: 2310,
    commentsCount: 114,
    isLiked: false,
    isBookmarked: false,
    timeAgo: "1 day ago"
  },
  {
    id: "post_501",
    authorId: "usr_101",
    authorUsername: "sarah_plumber",
    authorFullName: "Sarah Jenkins",
    authorAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Master Plumber",
    isAuthorVerified: true,
    postType: "pro_case_study",
    title: "Diagnosing Hydraulic Water Hammer in High-Rise Risers & PRV Cartridge Swap",
    caption: "Step-by-step diagnostic on why commercial building pipes hammer when high-flow flushometers cycle, and how to calibrate the pressure reducing valve.",
    mediaUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80",
    tags: ["plumbing", "commercialtrades", "valverepair", "waterhammer"],
    likesCount: 894,
    commentsCount: 42,
    isLiked: false,
    isBookmarked: false,
    rating: 4.8,
    reviewsCount: 12,
    timeAgo: "2 days ago",
    taskDetails: {
      problemStatement: "A 12-story residential building was suffering severe pipe vibration whenever upper-floor flush valves closed. Diagnostic manometer revealed static supply pressure of 115 PSI with defective PRV diaphragm.",
      category: "Trades & Craftsmanship",
      difficulty: "Advanced",
      estimatedDuration: "90 Minutes",
      toolsUsed: ["24-inch Pipe Wrench", "Digital Pressure Manometer", "PTFE Thread Sealant", "Flange Spreader"],
      safetyWarnings: "Depressurize the riser and tag out the booster pump before breaking flanges.",
      steps: [
        {
          stepNumber: 1,
          title: "Isolate the Riser Section & Bleed Line",
          description: "Close upstream and downstream isolation ball valves and lock out the booster pumps. Drain residual water into catchment bins.",
          imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
          tip: "Always check test cock for zero gauge reading before removing flange bolts."
        },
        {
          stepNumber: 2,
          title: "Extract Damaged Diaphragm & Clean Seat",
          description: "Unbolt the valve bonnet and inspect for cavitation pitting on the brass valve seat.",
          imageUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
          tip: "Scrape mineral scale using a soft brass wire brush to avoid scratching the seat."
        },
        {
          stepNumber: 3,
          title: "Install New Cartridge & Dynamic Calibration",
          description: "Torque bolts in a crisscross pattern and dial the set screw to 55 PSI dynamic pressure.",
          imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
          tip: "Open upstream gate valve very slowly over 60 seconds to prevent hydraulic shock."
        }
      ]
    }
  },
  {
    id: "post_502",
    authorId: "usr_102",
    authorUsername: "alex_driver",
    authorFullName: "Alex Rivera",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Transit Bus Operator",
    isAuthorVerified: true,
    postType: "pro_case_study",
    title: "Navigating 60ft Articulated Buses Through Dense Downtown Intersections",
    caption: "How we calculate turn pivot points, compensate for 3-foot tail swing, and keep passengers safe in tight metropolitan traffic.",
    mediaUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
    tags: ["transit", "busdriver", "roadsafety", "logistics"],
    likesCount: 612,
    commentsCount: 19,
    isLiked: false,
    isBookmarked: false,
    rating: 4.9,
    reviewsCount: 8,
    timeAgo: "3 days ago",
    taskDetails: {
      problemStatement: "Making tight 90-degree right turns on historic 2-lane city streets with outdoor dining barriers and bike lanes without mounting curbs or clipping obstacles.",
      category: "Transportation & Logistics",
      difficulty: "Intermediate",
      estimatedDuration: "Daily Route Protocol",
      toolsUsed: ["Convex Curb Mirrors", "Telematics Route Tablet", "Pneumatic Kneeling Airbag System"],
      safetyWarnings: "Always ensure pedestrian countdown has elapsed and mirror scan is completed before rolling forward.",
      steps: [
        {
          stepNumber: 1,
          title: "Establish Approach Line & Lane Dominance",
          description: "Position front axle 4 feet from curb and maintain lane ownership to prevent cyclists squeezing into blind zone.",
          imageUrl: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
          tip: "Keep right mirror fixed on the rear pivot axle."
        },
        {
          stepNumber: 2,
          title: "Execute Deep Pivot & Counter-Steer Arc",
          description: "Pull deep into the intersection before cranking wheel, then counter-steer smoothly as the articulation joint straightens.",
          imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
          tip: "Feather regenerative braking for smooth deceleration."
        }
      ]
    }
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: "cat_all",
    name: "All Professions",
    slug: "all",
    icon: "briefcase",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "cat_legal",
    name: "Legal & Regulatory",
    slug: "legal",
    icon: "scale",
    color: "from-indigo-600 to-purple-600",
    activePros: "2,400+ Pros",
    popularRoles: ["Litigation Attorney", "Corporate Counsel", "Paralegal", "Public Defender"]
  },
  {
    id: "cat_trades",
    name: "Trades & Craftsmanship",
    slug: "trades",
    icon: "wrench",
    color: "from-amber-600 to-orange-600",
    activePros: "5,800+ Pros",
    popularRoles: ["Master Plumber", "Electrician", "HVAC Tech", "Carpenter", "Welder"]
  },
  {
    id: "cat_transit",
    name: "Transportation & Logistics",
    slug: "transportation",
    icon: "truck",
    color: "from-emerald-600 to-teal-600",
    activePros: "3,100+ Pros",
    popularRoles: ["Transit Bus Operator", "Commercial Airline Pilot", "Freight Conductor", "Harbor Pilot"]
  },
  {
    id: "cat_tech",
    name: "Technology & Engineering",
    slug: "technology",
    icon: "code",
    color: "from-sky-600 to-cyan-600",
    activePros: "8,900+ Pros",
    popularRoles: ["Site Reliability Engineer", "Frontend Architect", "Cybersecurity Analyst", "Embedded Systems Dev"]
  },
  {
    id: "cat_health",
    name: "Healthcare & Medicine",
    slug: "healthcare",
    icon: "heart-pulse",
    color: "from-rose-600 to-pink-600",
    activePros: "4,600+ Pros",
    popularRoles: ["ER Trauma Nurse", "Surgical Tech", "Flight Paramedic", "Radiology Tech"]
  }
];

export const INITIAL_CHALLENGES = [
  {
    id: "chal_01",
    workerId: "usr_101",
    workerUsername: "sarah_plumber",
    workerFullName: "Sarah Jenkins",
    workerProfessionTitle: "Master Plumber",
    workerAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    title: "Unexplained Water Hammer Knocking at 3:00 AM in a 1920s Brownstone",
    scenarioDescription: "We isolated all radiator loops and tested the expansion tank diaphragm (20 PSI intact). Yet the homeowner still records a rhythmic 3 AM pipe knock. What subtle thermal siphon or solenoid issue would you test next?",
    category: "Trades & Craftsmanship",
    urgencyLevel: "Brainstorming",
    timeAgo: "5h ago",
    isSolved: false,
    suggestions: [
      {
        id: "sug_01",
        suggesterId: "usr_777",
        suggesterUsername: "mike_hvac",
        suggesterProfession: "HVAC Specialist",
        suggestionText: "Check if an automatic refrigerator ice-maker or reverse osmosis filter solenoid valve cycles precisely at 3 AM with no arrestor installed on that branch line.",
        suggestedTool: "Mini in-line water hammer arrestor (1/4-inch push-fit)",
        upvotes: 28,
        isAccepted: true
      },
      {
        id: "sug_02",
        suggesterId: "usr_888",
        suggesterUsername: "dan_plumbing",
        suggesterProfession: "Journeyman Plumber",
        suggestionText: "Check the check-valve on the recirculating loop; thermal expansion can cause flap chattering in the dead of night when municipal pressure peaks.",
        suggestedTool: "Spring-loaded silent check valve",
        upvotes: 14,
        isAccepted: false
      }
    ]
  },
  {
    id: "chal_02",
    workerId: "usr_103",
    workerUsername: "elena_lawyer",
    workerFullName: "Elena Vance, Esq.",
    workerProfessionTitle: "Litigation Partner",
    workerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    title: "Jurisdictional Conflict with Third-Party Cloud Server Located in Ireland (GDPR vs US FRCP 45)",
    scenarioDescription: "The opposing corporate subsidiary stores server logs exclusively in Dublin, Ireland. US Court ordered production, but Irish counsel cites GDPR Art. 48. How would you structure the Hague Evidence Convention letter of request to expedite without triggering European sanctions?",
    category: "Legal & Regulatory",
    urgencyLevel: "Urgent",
    timeAgo: "8h ago",
    isSolved: false,
    suggestions: [
      {
        id: "sug_03",
        suggesterId: "usr_104",
        suggesterUsername: "david_cpa",
        suggesterProfession: "Forensic Accountant",
        suggestionText: "Consider filing for a dual-qualified protective order with standard contractual clauses (SCCs) and redaction protocols approved by a designated Special Master.",
        suggestedTool: "Hague Evidence Convention Art. 23 Formulation",
        upvotes: 19,
        isAccepted: false
      }
    ]
  }
];

export const INITIAL_QA_ITEMS = [
  {
    id: "qa_01",
    workerId: "usr_103",
    workerUsername: "elena_lawyer",
    workerFullName: "Elena Vance, Esq.",
    workerProfessionTitle: "Commercial Litigation Attorney",
    workerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    askerUsername: "law_student_sam",
    askerAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    questionText: "How many hours a week do commercial litigation partners actually spend in a physical courtroom vs analyzing discovery documents at their desk?",
    topicTag: "Daily Routine & Worklife",
    answerText: "In commercial litigation, about 85% of our billable time is actually deep document analysis, strategy briefs, motion drafting, and depositions. Courtroom appearances happen for critical hearings and trials ~15% of the time, which is why written persuasion skills are 10x more important than dramatic speeches!",
    upvotes: 42,
    timeAgo: "1 day ago"
  },
  {
    id: "qa_02",
    workerId: "usr_101",
    workerUsername: "sarah_plumber",
    workerFullName: "Sarah Jenkins",
    workerProfessionTitle: "Master Plumber",
    workerAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    askerUsername: "homeowner_dave",
    askerAvatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    questionText: "What is the #1 plumbing mistake you see homeowners make when attempting DIY drain repairs?",
    topicTag: "DIY Pitfalls & Advice",
    answerText: "1. Over-tightening plastic slip nuts until the washer splits and creates a slow hidden leak. 2. Pouring caustic chemical drain cleaners into 30+ year old pipes which eats away the solder and turns a $100 clog into a $3,000 drywall reconstruction!",
    upvotes: 91,
    timeAgo: "2 days ago"
  },
  {
    id: "qa_03",
    workerId: "usr_102",
    workerUsername: "alex_driver",
    workerFullName: "Alex Rivera",
    workerProfessionTitle: "Transit Bus Operator",
    workerAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    askerUsername: "transit_enthusiast",
    askerAvatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    questionText: "How difficult was it transitioning from standard 40ft buses to the 60ft articulated hybrid buses?",
    topicTag: "Career Progression",
    answerText: "The hardest part is mental: you have to train yourself not to steer into the turn until the articulation accordion reaches the curb edge. Once you master the pivot point geometry, it's actually smoother than a rigid 40-footer!",
    upvotes: 67,
    timeAgo: "3 days ago"
  },
  // Unanswered, so each demo professional has something waiting in their Q&A inbox.
  {
    id: "qa_04",
    workerId: "usr_101",
    workerUsername: "sarah_plumber",
    workerFullName: "Sarah Jenkins",
    workerProfessionTitle: "Master Plumber",
    workerAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    askerUsername: "law_student_sam",
    askerAvatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
    questionText: "Is it worth getting a master plumber licence, or do most jobs only need a journeyman?",
    topicTag: "Career & Salary Advice",
    answerText: null,
    upvotes: 5,
    timeAgo: "40m ago"
  },
  {
    id: "qa_05",
    workerId: "usr_102",
    workerUsername: "alex_driver",
    workerFullName: "Alex Rivera",
    workerProfessionTitle: "Transit Bus Operator",
    workerAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    askerUsername: "homeowner_dave",
    askerAvatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    questionText: "How do you stay alert on the last loop of a split shift?",
    topicTag: "Daily Routine & Worklife",
    answerText: null,
    upvotes: 3,
    timeAgo: "2h ago"
  },
  {
    id: "qa_06",
    workerId: "usr_103",
    workerUsername: "elena_lawyer",
    workerFullName: "Elena Vance, Esq.",
    workerProfessionTitle: "Commercial Litigation Attorney",
    workerAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    askerUsername: "homeowner_dave",
    askerAvatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
    questionText: "Which legal research tool would you pick if you could only keep one?",
    topicTag: "Tools & Software",
    answerText: null,
    upvotes: 8,
    timeAgo: "5h ago"
  }
];

export const INITIAL_REELS = [
  {
    id: "reel_01",
    authorId: "usr_103",
    authorUsername: "elena_lawyer",
    authorFullName: "Elena Vance, Esq.",
    authorAvatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Commercial Litigation Partner",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-lawyer-reading-documents-in-his-office-42798-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
    caption: "The #1 objection rookie lawyers botch in federal depositions: 'Form of the question'. Here is what you MUST state on the record! ⚖️",
    tags: ["litigationtips", "lawschool", "depositions"],
    professionTag: "Legal",
    likesCount: 3820,
    commentsCount: 240,
    isLiked: false,
    isBookmarked: false,
    audioTitle: "Elena Vance • Original Court Audio"
  },
  {
    id: "reel_02",
    authorId: "usr_101",
    authorUsername: "sarah_plumber",
    authorFullName: "Sarah Jenkins",
    authorAvatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Master Plumber",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-plumber-working-with-pipes-40810-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80",
    caption: "Clockwise or counter-clockwise? If you wrap PTFE tape the wrong way, tightening the brass nipple will unthread your seal! 🛠️🚿",
    tags: ["plumbingtips", "trades", "diyrepair"],
    professionTag: "Trades",
    likesCount: 5410,
    commentsCount: 312,
    isLiked: false,
    isBookmarked: false,
    audioTitle: "Workshop Sounds • Real Plumber Audio"
  },
  {
    id: "reel_03",
    authorId: "usr_102",
    authorUsername: "alex_driver",
    authorFullName: "Alex Rivera",
    authorAvatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    authorProfessionTitle: "Transit Bus Operator",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-traffic-in-a-big-city-at-night-42861-large.mp4",
    posterUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
    caption: "The 3-point convex mirror sweep we perform every 7 seconds when driving through congested cycling zones 🚌💨",
    tags: ["roadsafety", "transitlife", "citybus"],
    professionTag: "Transport",
    likesCount: 2940,
    commentsCount: 156,
    isLiked: false,
    isBookmarked: false,
    audioTitle: "Alex Rivera • City Rush Hour Ambiance"
  }
];
