import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Admin User ──────────────────────────────────────────────────────────────
  const adminEmail = 'admin@meetscheduler.ai'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12)
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'ADMIN', name: 'Admin' },
    })
    console.log('✅ Admin user created: admin@meetscheduler.ai / Admin@1234')
  } else {
    console.log('ℹ️  Admin user already exists')
  }

  // ── Hero Section ────────────────────────────────────────────────────────────
  const heroExists = await prisma.heroSection.findFirst()
  if (!heroExists) {
    await prisma.heroSection.create({
      data: {
        badge:        'AI-Powered · Built for Modern Teams',
        headline:     'The AI Meeting Assistant that saves you hours and misses nothing.',
        subheadline:  'Say goodbye to calendar chaos and endless email threads. MeetScheduler intelligently schedules, reschedules, and coordinates meetings across all your platforms — so you focus on decisions, not logistics.',
        primaryCta:   'Connect Google Calendar',
        secondaryCta: 'Connect Microsoft Outlook',
        bookDemoCta:  'Book a Demo →',
      },
    })
    console.log('✅ Hero section seeded')
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const statsCount = await prisma.stat.count()
  if (statsCount === 0) {
    await prisma.stat.createMany({
      data: [
        { value: '50K+',      label: 'Meetings Scheduled',     order: 0 },
        { value: '4.2 hrs',   label: 'Saved Per User/Week',    order: 1 },
        { value: '99.8%',     label: 'Scheduling Accuracy',    order: 2 },
        { value: '5 Platforms', label: 'Seamlessly Integrated', order: 3 },
      ],
    })
    console.log('✅ Stats seeded')
  }

  // ── Features ────────────────────────────────────────────────────────────────
  const featCount = await prisma.feature.count()
  if (featCount === 0) {
    await prisma.feature.createMany({
      data: [
        {
          title: 'No More Back-and-Forth',
          description: 'Our AI reads everyone\'s calendar, finds the perfect slot that works for all attendees, and sends invites — all in seconds.',
          bullets: JSON.stringify([
            'Scans all attendee calendars simultaneously',
            'Respects working hours & time zones',
            'Sends calendar invites & reminders automatically',
          ]),
          iconName: 'Zap', order: 0,
        },
        {
          title: 'Automatic Follow-ups & Reminders',
          description: 'MeetScheduler sends smart reminders via email, Slack, or Teams — so no one forgets, and you never chase anyone again.',
          bullets: JSON.stringify([
            'Smart reminders 24h, 1h, and 5 min before',
            'Tracks RSVPs and nudges non-responders',
            'Delivers meeting agendas automatically',
          ]),
          iconName: 'Mail', order: 1,
        },
        {
          title: 'Proactive Conflict Management',
          description: 'AI detects overlapping meetings before they happen and automatically proposes the best reschedule — without any manual work from you.',
          bullets: JSON.stringify([
            'Real-time conflict detection across all calendars',
            'Auto-reschedule suggestions with one-click confirm',
            'Prioritizes by meeting importance & stakeholders',
          ]),
          iconName: 'Shield', order: 2,
        },
        {
          title: 'Instant AI Scheduling via Chat',
          description: 'Just type what you need in plain English. Our AI handles everything — scheduling, rescheduling, follow-ups — like having a personal assistant available 24/7.',
          bullets: JSON.stringify([
            'Natural language commands — no form filling',
            'Handles preferences like "avoid Mondays" or "30-min max"',
            'Available via Slack, Teams, and web app',
          ]),
          iconName: 'MessageSquare', order: 3,
        },
      ],
    })
    console.log('✅ Features seeded')
  }

  // ── Integrations ─────────────────────────────────────────────────────────────
  const intCount = await prisma.integration.count()
  if (intCount === 0) {
    await prisma.integration.createMany({
      data: [
        { name: 'Google Calendar',   iconType: 'google',  order: 0 },
        { name: 'Microsoft Outlook', iconType: 'outlook', order: 1 },
        { name: 'Microsoft Teams',   iconType: 'teams',   order: 2 },
        { name: 'Slack',             iconType: 'slack',   order: 3 },
        { name: 'Zoom',              iconType: 'zoom',    order: 4 },
      ],
    })
    console.log('✅ Integrations seeded')
  }

  // ── How It Works Steps ───────────────────────────────────────────────────────
  const stepsCount = await prisma.howItWorksStep.count()
  if (stepsCount === 0) {
    await prisma.howItWorksStep.createMany({
      data: [
        {
          stepNumber: 1,
          title: 'Connect Your Calendars',
          description: 'Link Google, Outlook, or both with one click. MeetScheduler reads your availability and team members\' schedules securely.',
          colorClass: 'bg-teal-600', order: 0,
        },
        {
          stepNumber: 2,
          title: 'Set Your Preferences',
          description: 'Tell AI your working hours, preferred meeting lengths, no-meeting days, and time zone. Takes 2 minutes, saves 2 hours a week.',
          colorClass: 'bg-teal-500', order: 1,
        },
        {
          stepNumber: 3,
          title: 'Let AI Handle the Rest',
          description: 'From now on, just say what you need. AI schedules, reschedules, notifies, and follows up — you just show up and lead.',
          colorClass: 'bg-coral-500', order: 2,
        },
      ],
    })
    console.log('✅ Steps seeded')
  }

  // ── Testimonials ─────────────────────────────────────────────────────────────
  const testCount = await prisma.testimonial.count()
  if (testCount === 0) {
    await prisma.testimonial.createMany({
      data: [
        {
          name: 'Jessica Liu', role: 'VP Engineering', company: 'Stripe',
          quote: 'MeetScheduler saved our team at least 6 hours a week. No more "Does Tuesday work?" — the AI just figures it out. Best productivity tool we\'ve adopted this year.',
          initials: 'JL', cardColor: 'green', order: 0,
        },
        {
          name: 'Marcus Reed', role: 'Product Manager', company: 'Figma',
          quote: 'The Slack integration is incredible. I just type "schedule a standup tomorrow with the design team" and it\'s done. No more context switching. Absolutely seamless.',
          initials: 'MR', cardColor: 'cyan', order: 1,
        },
        {
          name: 'Anya Patel', role: 'CTO', company: 'Notion',
          quote: 'We have a distributed team across 4 time zones. MeetScheduler eliminated the "meeting impossible" problem entirely. Everyone gets a fair slot and nobody misses.',
          initials: 'AP', cardColor: 'blue', order: 2,
        },
        {
          name: 'David Wu', role: 'Founder', company: 'Loom',
          quote: 'The conflict detection is next-level. It flagged a double-booking I didn\'t even notice and rescheduled it automatically. It\'s like having a super-smart EA.',
          initials: 'DW', cardColor: 'purple', order: 3,
        },
        {
          name: 'Sara Okonkwo', role: 'Head of Product', company: 'Shopify',
          quote: 'I was skeptical about AI scheduling tools, but this one genuinely impresses. It respects my "deep work" blocks and never schedules meetings in focus time. Brilliant.',
          initials: 'SO', cardColor: 'green', order: 4,
        },
        {
          name: 'Tom Kimura', role: 'COO', company: 'Atlassian',
          quote: 'Onboarded 40 team members in a day. Auto follow-ups alone saved my executive team from chasing responses. Indispensable for any modern organization.',
          initials: 'TK', cardColor: 'cyan', order: 5,
        },
      ],
    })
    console.log('✅ Testimonials seeded')
  }

  // ── Pricing Plans ─────────────────────────────────────────────────────────────
  const pricingCount = await prisma.pricingPlan.count()
  if (pricingCount === 0) {
    await prisma.pricingPlan.createMany({
      data: [
        {
          name: 'Starter', monthlyPrice: 0, yearlyPrice: 0,
          description: 'Forever free · No credit card',
          features: JSON.stringify([
            '10 AI scheduling requests/mo',
            'Google + Outlook integration',
            'Basic conflict detection',
            'Email reminders',
          ]),
          ctaText: 'Get Started Free', isPopular: false, order: 0,
        },
        {
          name: 'Pro', monthlyPrice: 29, yearlyPrice: 19,
          description: 'Per user · Billed monthly',
          features: JSON.stringify([
            'Unlimited AI scheduling',
            'All 5 platform integrations',
            'Advanced conflict detection',
            'Smart reminders & follow-ups',
            'Natural language scheduling',
            'Priority support',
          ]),
          ctaText: 'Start Free Trial', isPopular: true, order: 1,
        },
        {
          name: 'Business', monthlyPrice: 79, yearlyPrice: 53,
          description: 'Per team · Up to 20 users',
          features: JSON.stringify([
            'Everything in Pro',
            'Team-wide calendar management',
            'Admin dashboard & analytics',
            'Custom scheduling rules',
            'SSO & advanced security',
            'Dedicated success manager',
          ]),
          ctaText: 'Book a Demo', isPopular: false, order: 2,
        },
      ],
    })
    console.log('✅ Pricing plans seeded')
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────────
  const faqCount = await prisma.faqItem.count()
  if (faqCount === 0) {
    await prisma.faqItem.createMany({
      data: [
        {
          question: 'Is my calendar data secure?',
          answer: 'Absolutely. We use OAuth 2.0 for calendar access — we never store your passwords. Data is encrypted in transit and at rest. We only read availability, never event details. SOC 2 Type II certified.',
          order: 0,
        },
        {
          question: 'Can attendees without MeetScheduler join meetings?',
          answer: 'Yes! Only the scheduler needs a MeetScheduler account. Attendees receive standard calendar invites via email — no app download, no signup required.',
          order: 1,
        },
        {
          question: 'Does it work across time zones?',
          answer: 'Yes — time zones are automatically detected per attendee. The AI finds slots that fall within each person\'s working hours, so no one gets a 3 AM invite.',
          order: 2,
        },
        {
          question: 'Can I cancel anytime?',
          answer: 'Yes, cancel anytime with no penalties. Your subscription remains active until the end of the billing period. No long-term contracts and we offer a 14-day free trial on all paid plans.',
          order: 3,
        },
      ],
    })
    console.log('✅ FAQ seeded')
  }

  console.log('\n✨ Seeding complete!\n')
  console.log('Admin login: admin@meetscheduler.ai / Admin@1234')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
