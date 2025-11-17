### Project Name
MindFlow

### Brief Description
Description: A journal app powered by AI that provides summaries, insights, and advice for users.
In other words, the app allows users to write daily journal entries, track moods, and receive AI-generated insights about their writing patterns.

### Target Audience
People who want to write better, more productive, and more creative journal entries.

### Core Value Proposition
## Core Problems It Solves
- Problem 1: "I journal but never read my old entries"
  - Traditional journaling means you write 365 entries per year but never look back, missing patterns and growth. With MindFlow, you can ask things like "Show me how I've changed this year" or "When did I last feel this way?" The AI surfaces patterns you'd never notice manually.
- Problem 2: "I don't know what to write about"
  - Blank page syndrome is real. MindFlow helps with smart prompts like "What's on your mind today?", reminders like "You haven't written about work in 2 weeks", and motivation like "Last time you felt stressed, writing helped."
- Problem 3: "I can't afford therapy"
  - Therapy costs $100-200 per session while MindFlow would be $5-10 per month. It's not a replacement for therapy, but it works as a self-reflection tool to track mood patterns, identify triggers, and practice emotional awareness.

---

## Functional Requirements

### Must Have (MVP)
- [ ] User authentication (sign up, login, password reset)
- [ ] Create, edit, and delete journal entries (text-based)
- [ ] View list of all journal entries (sorted by date)
- [ ] Mood tracking (select mood for each entry - e.g., happy, sad, anxious, calm, stressed)
- [ ] Basic AI insights (daily/weekly summaries of entries)
- [ ] AI sentiment analysis (detect emotional tone of entries)
- [ ] Search entries by keyword or date
- [ ] Basic security (row-level security, HTTPS)
- [ ] Mobile-responsive design (works on phone screens)

### Should Have (Post-MVP)
- [ ] Offline mode: Allow writing entries offline, sync when back online
- [ ] AI pattern recognition (identify recurring themes, triggers, mood patterns over time)
- [ ] Smart writing prompts based on past entries
- [ ] Weekly/monthly AI-generated summaries and progress reports
- [ ] Photo attachments for journal entries
- [ ] Voice note journaling (record and transcribe)
- [ ] Tags/categories for entries (work, relationships, health, etc.)
- [ ] Export entries (PDF, text file)
- [ ] Push notifications (reminders to journal, streaks)
- [ ] Calendar view of entries
- [ ] Favorite/pin important entries

### Nice to Have (Future)
- [ ] Vector database integration for semantic search ("find entries similar to this feeling")
- [ ] Emotion timeline visualization (graph mood trends over time)
- [ ] Share specific entries with therapist (secure sharing link)
- [ ] Multiple journals (separate work, personal, gratitude journals)
- [ ] Gratitude-specific features (daily gratitude prompts)
- [ ] Integration with health apps (sleep data, exercise correlation)
- [ ] Web/desktop version (currently mobile-first)
- [ ] Dark mode
- [ ] AI chat feature (ask questions about your journal history)
- [ ] Custom AI insights preferences (what patterns to track)
- [ ] Collaborative journaling (shared journals with partner/friend)
- [ ] Therapy journal templates (CBT, DBT worksheets)

---

## Technical Constraints

### Tech Stack

## Front end
- Ionic with React and Capacitor
  - PWA app (iOS + Android + Web) from a single codebase 
  - Rich ecosystem for journal/text input features 
  - Good offline support for private journaling 
  - State Management: Zustand 

## Back end
- Node.js with Express or Fastify
  - Fast development
  - Easy integration with AI services 
  - Great for handling text processing

## Database
- PostgreSQL with Supabase (primary database)
  - Reliable for structured data (users, entries, moods)
  - Strong full-text search capabilities 
  - Good for analytics queries

- Vector Database: Pinecone 
  - Store embeddings of journal entries for semantic search 
  - Find similar past entries for better insights

## AI/ML Layer
- OpenAI

## Authentication
- Supabase Auth

## Storage
- Supabase Storage
  - Store images, voice notes (future features)

## Hosting/Deployment
- Frontend: Expo EAS for app distribution
- Backend: Railway 
- Database: Supabase (all-in-one)