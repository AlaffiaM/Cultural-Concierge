// Feed quality rules shared by every event scraper:
// 1. Hard ban on corporate / academic / B2B events.
// 2. Positive whitelist (core vibe) so only lifestyle events survive.
// 3. Type taxonomy enforced to the approved admin Types.

const ALLOWED_TYPES = [
  'Festival',
  'Exhibition',
  'Workshop',
  'Performance',
  'Dining',
  'Wellness',
  'Music',
  'Art',
  'Pop-up',
  'Brunch',
  'Sundowner',
]

const BANNED_TERMS = [
  // existing:
  'conference', 'corporate', 'seminar', 'summit', 'business',
  'hackathon', 'webinar', 'expo', 'forum', 'symposium', 'b2b',
  'trade show', 'panel', 'networking', 'delegate',
  'book', 'books', 'bookstore', 'bookshop', 'book club', 'bookclub',
  'literary', 'library', 'storytelling', 'meet the author',

  // professional training / technical / B2B:
  'training', 'skills training', 'certification', 'certified',
  'installation', 'technician', 'compliance', 'audit', 'regulatory',
  'human resource', 'hr management', 'recruitment', 'hiring',
  'career fair', 'job fair', 'bootcamp', 'onboarding', 'accreditation',
  'cctv', 'biometric', 'access control', 'project management',
  'procurement', 'logistics', 'supply chain', 'engineering skills',

  // AI / tech-professional:
  'ai masterclass', 'ai training', 'ai bootcamp', 'ai certification',
  'ai course', 'ai workshop', 'ai content creation', 'ai for business',
  'ai solutions', 'ai tools', 'ai skills', 'artificial intelligence',
  'machine learning', 'data science', 'generative ai',

  // real estate / property:
  'real estate', 'property expo', 'buy & sell', 'buy and sell',

  // agriculture / industrial trade:
  'agro', 'poultry', 'agriculture expo', 'agtech',
  'interplast', 'interplastpack', 'packaging expo', 'industrial expo', 'manufacturing expo',

  // private / personal celebrations:
  // NOTE: 'wedding' is safe because 'expo' is already banned above,
  // so "Wedding Expo" is already rejected. Only catches private weddings.
  'birthday', 'birthday party', 'birthday lunch', 'birthday dinner',
  'wedding', 'bridal shower', 'baby shower',
  'anniversary celebration', 'anniversary gala',
  'private celebration', 'private party',
  'invite only', 'by invitation',

  // tech-industry / corporate events:
  // NOTE: 'summit' and 'conference' already banned above — these are
  // explicit for grep-ability and catch compound forms like "tech summit".
  'tech fest', 'tech summit', 'tech exchange', 'tech conference',
  'the lagos exchange',
]

const CORE_VIBE_REGEX = new RegExp(
  [
    // Wellness
    '\\b(wellness|yoga|meditation|retreat|spa|fitness|pilates|reiki|breathwork|mindfulness|self.?care|healing|recovery|run.?club|workout)\\b',
    // Sip & paint / visual art
    '\\b(sip.{0,3}paint|paint.{0,3}sip|painting|art class|art workshop|arts? and crafts?)\\b',
    // Exhibitions / galleries
    '\\b(exhibition|gallery|art show|art fair|museum|vernissage|open.?studio)\\b',
    // Festivals / fairs
    '\\b(festival|fayre|fest|bazaar)\\b',
    // Live music
    '\\b(live music|concert|dj|gig|band|open mic|acoustic|afrobeats|amapiano|highlife|jazz)\\b',
    // Pop-ups / markets
    '\\b(pop.?up|popup|market|food fair|night market|stall|vendors?|boutique)\\b',
    // Food & drink
    '\\b(brunch|sundowner|dinner|degustation|wine tasting|tasting menu|food|dining|chef|cuisine)\\b',
    // Workshops / classes
    '\\b(workshop|masterclass|pottery|ceramics|craft|class|learn|course|journaling|knitting)\\b',
    // Performance / entertainment
    '\\b(comedy|theatre|theater|play|ballet|opera|dance|kizomba|performing arts|stand.?up)\\b',
  ].join('|'),
  'i'
)

const TYPE_RULES = [
  { type: 'Wellness', regex: /\b(wellness|yoga|meditation|retreat|spa|fitness|pilates|reiki|breathwork|mindfulness|self.?care|healing|recovery|run.?club|workout)\b/ },
  { type: 'Brunch', regex: /\bbrunch\b/ },
  { type: 'Sundowner', regex: /\b(sundowner|sunset)\b/ },
  { type: 'Exhibition', regex: /\b(exhibition|gallery|art show|art fair|museum|vernissage|open.?studio)\b/ },
  { type: 'Workshop', regex: /\b(sip.{0,3}paint|paint.{0,3}sip|workshop|masterclass|pottery|ceramics|craft|class|learn|course|journaling|knitting)\b/ },
  { type: 'Festival', regex: /\b(festival|fayre|fest|bazaar)\b/ },
  { type: 'Pop-up', regex: /\b(pop.?up|popup|market|food fair|night market|stall|vendors?|boutique)\b/ },
  { type: 'Dining', regex: /\b(dinner|degustation|wine tasting|tasting menu|food|dining|chef|cuisine)\b/ },
  { type: 'Music', regex: /\b(live music|concert|dj|gig|band|open mic|acoustic|afrobeats|amapiano|highlife|jazz)\b/ },
  { type: 'Performance', regex: /\b(comedy|theatre|theater|play|ballet|opera|dance|kizomba|performing arts|stand.?up)\b/ },
  { type: 'Art', regex: /\b(painting|art|artist|sculpture|canvas|sketch)\b/ },
]

function eventText(name, description) {
  return `${name || ''} ${description || ''}`.toLowerCase()
}

function isBanned(name, description) {
  const text = eventText(name, description)
  return BANNED_TERMS.some(term => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
}

function matchesCoreVibe(name, description) {
  return CORE_VIBE_REGEX.test(eventText(name, description))
}

function classifyType(name, description) {
  const text = eventText(name, description)
  for (const rule of TYPE_RULES) {
    if (rule.regex.test(text)) return rule.type
  }
  return ''
}

module.exports = { ALLOWED_TYPES, BANNED_TERMS, isBanned, matchesCoreVibe, classifyType }
