import type { GuidanceArticle, Service } from './types';

/**
 * STARTER CONTENT — this is site copy for the owner to replace, not customer
 * data. Edit the rows in the Supabase `services` / `guidance_articles` tables
 * (or this file when running in demo mode) to match your real offerings.
 */

export const SERVICES: Service[] = [
  {
    id: 'svc-jyotish',
    slug: 'jyotish-consultation',
    title: 'Jyotish Consultation',
    summary: 'A Vedic astrology reading that maps your birth chart and the cycles shaping your year.',
    description:
      'A one-to-one session over video or phone. We study your birth details, walk through the houses and dashās that matter most right now, and leave you with practical guidance rather than predictions you cannot act on.',
    duration: '45 minutes',
    priceLabel: 'Fee confirmed at booking',
    highlights: ['Birth-chart reading', 'Current planetary cycle', 'Remedies you can practise daily'],
  },
  {
    id: 'svc-numerology',
    slug: 'numerology-reading',
    title: 'Numerology Reading',
    summary: 'Your name and birth numbers, read as a quiet blueprint of temperament and timing.',
    description:
      'Numbers give language to patterns that are hard to describe. We look at your life-path and expression numbers, where they support you, and where they ask for patience.',
    duration: '40 minutes',
    priceLabel: 'Fee confirmed at booking',
    highlights: ['Life-path analysis', 'Name correction guidance', 'Personal-year forecast'],
  },
  {
    id: 'svc-tarot',
    slug: 'tarot-guidance',
    title: 'Tarot Guidance',
    summary: 'A focused spread for the one question you keep circling back to.',
    description:
      'Tarot does not decide for you — it shows the shape of the situation. Bring a single clear question and we will read the spread together, with space for your own reflection.',
    duration: '30 minutes',
    priceLabel: 'Fee confirmed at booking',
    highlights: ['Single-question spread', 'Guided reflection', 'Notes shared after the session'],
  },
  {
    id: 'svc-vastu',
    slug: 'vastu-consultation',
    title: 'Vastu Consultation',
    summary: 'Bring calm and balance to your home or workplace, one room at a time.',
    description:
      'Share your floor plan ahead of the session. We review the five elements in each zone and suggest corrections that do not require demolition, renovation or heavy expense.',
    duration: '60 minutes',
    priceLabel: 'Fee confirmed at booking',
    highlights: ['Floor-plan review', 'Element balancing', 'Simple, low-cost corrections'],
  },
  {
    id: 'svc-healing',
    slug: 'spiritual-healing',
    title: 'Spiritual Healing & Meditation',
    summary: 'Guided practice for restlessness, grief and the seasons that ask for stillness.',
    description:
      'A slow, unhurried session of breath work, mantra and guided meditation. Suitable for first-timers and for those returning to practice after a long gap.',
    duration: '45 minutes',
    priceLabel: 'Fee confirmed at booking',
    highlights: ['Breath and mantra practice', 'Guided meditation', 'A practice to continue at home'],
  },
];

export const GUIDANCE: GuidanceArticle[] = [
  {
    id: 'gd-stillness',
    slug: 'finding-stillness-in-a-busy-week',
    title: 'Finding stillness in a busy week',
    excerpt: 'Five minutes of deliberate quiet, repeated daily, changes more than an hour of hurried prayer.',
    category: 'Daily practice',
    readMinutes: 4,
    body: `Stillness is not the absence of work. It is the space you keep intact while the work moves around you.

Begin with five minutes. Sit with your spine easy, close your eyes, and let the breath arrive without managing it. When the mind wanders — and it will — return to the next inhale. That return is the practice, not a failure of it.

Choose the same time each day. Morning suits most people because the day has not yet asked anything of you. Keep the same seat, the same duration. Repetition is what turns a habit into a resting place.

If five minutes feels long, take two. Consistency matters far more than length, and a practice you return to is worth more than an ambitious one you abandon.`,
  },
  {
    id: 'gd-birth-chart',
    slug: 'reading-your-birth-chart',
    title: 'Reading your birth chart without fear',
    excerpt: 'A chart is a map of tendencies and timing — never a sentence you cannot appeal.',
    category: 'Jyotish',
    readMinutes: 6,
    body: `Many people come to astrology carrying anxiety about a difficult placement they have read about online. It is worth saying plainly: a chart describes tendencies and timing, not fixed outcomes.

Start with three things. The ascendant, which sets the frame of the chart. The moon, which describes your inner weather. And the current dasha, which tells you which chapter you are actually living through.

Notice the language you use about your own chart. "I am unlucky in career" is a conclusion. "This period emphasises effort with slow visible reward" is a description — and it leaves room for action.

Use the chart to ask better questions, not to close them.`,
  },
  {
    id: 'gd-vastu',
    slug: 'vastu-basics-for-a-rented-home',
    title: 'Vastu basics for a rented home',
    excerpt: 'You do not need to demolish anything to bring balance into a small flat.',
    category: 'Vastu',
    readMinutes: 5,
    body: `Most Vastu advice assumes you own the walls. If you rent, the work is about arrangement, not construction.

Keep the north-east corner light and uncluttered — it is the zone associated with clarity. Avoid storing heavy, unused objects there. In the south-west, weight and stability are welcome: a solid cupboard, a heavy bookshelf.

Sleep with your head to the south or east. It is one of the few corrections available to everyone, whatever the floor plan says.

Keep the entrance clean and well lit, and clear of footwear directly at the threshold. These are small, repeatable acts, and small acts repeated are what most homes are actually missing.`,
  },
  {
    id: 'gd-moon',
    slug: 'working-with-moon-phases',
    title: 'Working with the moon phases',
    excerpt: 'A simple rhythm for beginning, tending and releasing — no ritual experience required.',
    category: 'Ritual',
    readMinutes: 4,
    body: `The lunar month offers a rhythm you can borrow when your own sense of timing is unclear.

At the new moon, write one intention. Keep it small enough to finish. At the waxing quarter, tend it — do the unglamorous middle work. At the full moon, look at what has become visible, including what you would rather not see. In the waning fortnight, release what is complete.

The value is not in the sky. It is in having a calendar that reminds you to begin, to continue, and to stop.`,
  },
];
