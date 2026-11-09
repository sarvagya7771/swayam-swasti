-- ============================================================================
-- Optional starter content for the public pages (owner copy, not customer data).
-- Safe to edit or delete. Replace with your real service list and notes.
-- ============================================================================

insert into public.services (slug, title, summary, description, duration, price_label, highlights, position)
values
  ('jyotish-consultation', 'Vedic astrology reading',
   'A careful look at your birth chart, its timing and the questions you carry.',
   'We begin with your birth details, then read the chart together. You leave with a written summary of the main themes, the current period, and simple remedies you can actually keep up with.',
   '60 minutes', 'Fee on booking site',
   array['Written summary after the session', 'Current period and near-term timing', 'Practical, low-cost remedies'], 1),
  ('spiritual-counselling', 'Spiritual counselling',
   'A confidential conversation for grief, doubt, transitions and stuck places.',
   'An unhurried space to speak plainly. We work with what you bring — loss, a decision, a relationship, a practice that has gone dry — and look for the next honest step rather than a quick fix.',
   '50 minutes', 'Fee on booking site',
   array['Completely confidential', 'No fixed doctrine', 'Follow-up notes on request'], 2),
  ('puja-sankalpa', 'Puja and sankalpa',
   'A guided ritual intention performed on your behalf with your name and gotra.',
   'For those who cannot travel or do not know the procedure. We agree the intention, perform the ritual, and send you the details, timings and any prasad arrangements.',
   '45 minutes', 'Fee on booking site',
   array['Performed on your behalf', 'Details and timings shared afterwards', 'Family names included'], 3),
  ('guided-meditation', 'Guided meditation',
   'A simple, repeatable practice taught live and adjusted to your daily life.',
   'Ideal if meditation has felt abstract or difficult. We build one short practice around your actual routine, do it together twice, and troubleshoot what gets in the way.',
   '40 minutes', 'Fee on booking site',
   array['One practice built for your routine', 'Taught live, not scripted', 'Written instructions to keep'], 4)
on conflict (slug) do nothing;

insert into public.guidance_articles (slug, title, excerpt, body, category, read_minutes)
values
  ('beginning-a-practice', 'Beginning a practice when life is loud',
   'You do not need an hour, a mat, or a quiet room. You need one honest minute and a decision to return.',
   'Most people who ask about a spiritual practice are not short of technique. They are short of time and quiet, and they have quietly decided that a practice only counts if it is long and undisturbed. It does not.

Start with one minute. Sit where you already are, at the time you already have. Follow the breath, or repeat a single name, and stop when the minute ends. That is a complete practice.

The point is not the minute. The point is the returning. A practice that survives a bad week is worth more than one that only works on a good morning.

When you miss a day, begin again without commentary. The commentary — the story about being bad at this — is the only thing that actually breaks a practice.

If you would like help shaping something that fits your real routine, a short guided session is the fastest way to find it.',
   'Practice', 4),
  ('reading-your-chart', 'What a chart reading can and cannot tell you',
   'A chart is a map of timing and tendency. It is not a verdict, and it is never a substitute for your own judgement.',
   'A birth chart shows pattern and timing: the seasons of a life, the places where effort meets resistance, the periods that ask for patience. Read well, it can be genuinely useful and steadying.

What it cannot do is decide for you. It cannot tell you whether to take a job, marry a person, or move a city. Those decisions need your values, your circumstances and often a professional in the relevant field.

Be wary of any reading that trades in fear — that something must be bought, avoided or performed urgently to prevent disaster. That is not astrology, it is pressure.

A good reading leaves you clearer and calmer, with one or two things you can actually do. If you leave frightened, you were not read; you were sold to.',
   'Astrology', 5),
  ('sitting-with-grief', 'Sitting with grief without rushing it',
   'Grief does not follow a schedule, and no ritual is required to make it move faster.',
   'Grief has its own clock. Well-meaning advice to find closure, to look forward, or to be grateful tends to arrive long before grief is ready, and it mostly teaches people to grieve in private.

You do not have to move at anyone else''s pace. There is no correct number of months, and no requirement that you feel peaceful about a loss.

What helps is usually unremarkable: regular sleep where possible, food, someone who can listen without correcting you, and a small steadying practice — a walk, a lamp, a name repeated quietly.

Ritual can help. Not because it fixes anything, but because it gives the weight somewhere to go and lets other people stand beside you for an hour. If a ritual appeals to you, it does not need to be elaborate.

If grief is making ordinary life impossible, or if you are having thoughts of harming yourself, please speak to a doctor or a crisis line. That is not a failure of faith.',
   'Grief', 4)
on conflict (slug) do nothing;
