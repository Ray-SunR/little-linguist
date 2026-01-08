Below is the complete “final” PRD + Supabase data model for your current direction:
	•	Keep BookV1 exactly as-is (single JSON array today; images live under /public/books/...)
	•	Store BookV1 in Supabase in a way that lets you later migrate to the richer BookV2 model without redesigning tables
	•	Household = one guardian account
	•	Parent-only profile switching
	•	Polly TTS (store audio + speech-mark-derived timing later; for now store settings + scaffolding)
	•	Subscription + quotas/credits
	•	SRS-ready vocabulary tracking

I’m also including a single “Codex prompt” at the end that tells Codex exactly what to implement (tables, RLS, seed/import from your existing JSON file, and a compatibility view returning the same array shape your app expects).

⸻

1) PRD — Little Linguist (Full Version)

1.1 Product Summary

Little Linguist is a guardian-managed learning app where children read stories, tap words for meaning/pronunciation, review words using Spaced Repetition (SRS), earn points, and spend points to co-create AI stories (optionally using family photos as reference images).

1.2 Personas
	•	Guardian (Admin/Payer): creates child profiles, manages safety, uploads photos, pays subscription, sees progress reports.
	•	Child (Learner, 4–10): reads books, taps words, reviews words, earns points, generates stories. No login; guardian controls profile switching.

1.3 Goals
	•	Vocabulary acquisition that is measurable (words encountered → learned → mastered).
	•	Sticky daily engagement via Daily Plan + Rewards.
	•	A content model that supports TTS karaoke highlighting with AWS Polly.
	•	Subscription monetization with enforceable quotas and clear UX messaging.

1.4 Non-goals (V1)
	•	No child auth / PIN / separate accounts.
	•	No teacher classroom mode.
	•	No public sharing/community.
	•	No full Anki UI; start with simple SRS scheduling.

⸻

2. Functional Requirements (User Stories)

2.1 Account & Household

US-A1 Guardian Login
	•	Guardian can sign up/login (email + optional social).
	•	One account = one household.

US-A2 Parent Gate
	•	Child cannot access settings/billing/profile switching without a parent gate.

2.2 Child Profiles

US-C1 Create child profile
	•	Fields: first/last name, birth year (or age band), gender (optional), interests tags, ability tier, learning objectives.

US-C2 Switch profiles
	•	Only guardian can switch active child.

US-C3 Upload child avatar/photo
	•	Stored privately (Supabase Storage).
	•	Used for UI and optional story personalization.

2.3 Guardian Photos (for story personalization)

US-P1 Upload guardian photos
	•	Stored privately.
	•	Used as reference input for AI illustration (future).

2.4 Home & Daily Plan

US-H1 Today’s plan
	•	Shows recommended books + “words due” + small daily goal.
	•	Cached per child per day. Fallback if AI is down.

2.5 Library & Reading

US-L1 Library
	•	Shows:
	•	System books (curated)
	•	Saved AI stories
	•	Imported stories (future)
	•	Sort: recent, favorites, difficulty, genre.

US-R1 Read a book
	•	Reader supports: scroll / swipe / flip.
	•	No durable “page index”. Progress must be screen-independent.

US-R2 Resume
	•	Resume where the child left off using a screen-independent position:
	•	Now: position_char_offset (minimal refactor)
	•	Later: position_wi (word index) when you migrate to BookV2.

US-R3 TTS narration
	•	Playback + speed change.
	•	Karaoke highlight will come from Polly speech marks later.

2.6 Word Taps & Vocabulary

US-V1 Tap a word
	•	Show child-friendly definition + pronunciation (AI).
	•	Log tap event for learning analytics.

US-V2 Add word to word list
	•	Store source (book/session/time; imported vs clicked vs manual).
	•	Dedup by normalized lemma/term.

US-V3 Word list views
	•	Child + Guardian views:
	•	by letter
	•	by time
	•	by book
	•	by session
	•	due today (SRS)

2.7 SRS Review (Memory Engine)

US-S1 Review session
	•	Present due words (simple quiz types first: meaning selection).
	•	Update SRS scheduling: next_review_at, interval, ease, reps.

2.8 Rewards & Story Creation

US-G1 Earn points
	•	Earn from reading minutes, finishing sessions, review accuracy, streaks.
	•	Must be ledger-based (audit + no drift).

US-G2 Generate story (spend points)
	•	Spend points atomically.
	•	Create generation job.
	•	Result is saved as a book (origin=ai_generated) or discarded.

2.9 Word Import

US-I1 Import words
	•	Input: free text / CSV / image file.
	•	Runs as an async job; adds to SRS queue with source=imported.

2.10 Monetization

US-M1 Subscription
	•	Plans define quotas (stories/month, TTS chars, image gen calls).
	•	Enforced server-side using usage metering.

⸻

3. Data & AI Pipelines (Conceptual)

3.1 Current content (BookV1) pipeline
	•	App loads system books as a JSON array today.
	•	Migration step: seed Supabase with the same content.

3.2 Word definition pipeline
	•	On first request for a term, generate definition/pronunciation via AI.
	•	Cache in vocab_terms.
	•	Child word list references cached terms.

3.3 Polly TTS pipeline (later)
	•	Generate audio + speech marks for a book (likely segmented).
	•	Convert provider offsets → stable internal timing mapping.
	•	Store audio in Storage; store timing JSON in DB.

⸻

4. Non-Functional Requirements
	•	Security: strict RLS; private buckets for photos and generated content.
	•	Performance: fast library list; caching for daily plan and definitions.
	•	Reliability: idempotency for point spending and job completion.
	•	Compliance posture: parent gate, safe content filters for AI output, data deletion capability.

⸻

5. Success Metrics
	•	Activation: households with ≥1 child profile; first session completed.
	•	Learning: words added/week; words mastered; review completion rate.
	•	Engagement: sessions/week/child; reading minutes/day; streak rate.
	•	Monetization: trial→paid conversion; quota hit rate; churn.

⸻

6. Phases

MVP (now, minimal refactor)
	•	Supabase persistence for household/children/progress/word lists/points
	•	Store BookV1 in DB (payload jsonb)
	•	Continue serving system images from /public
	•	Jobs tables for story generation/import (can be stubbed)
	•	Basic SRS + points

V2 (later)
	•	Migrate books to BookV2 tokenized wi model
	•	Switch progress from char offsets to position_wi
	•	Polly karaoke highlighting stored per word index
	•	Richer daily plan + review games

⸻

2) Supabase Data Model (Final, BookV1-first but V2-ready)

2.1 Storage buckets
	•	guardian-photos (private)
	•	child-avatars (private)
	•	ai-images (private)
	•	tts-audio (private)
	•	(System book images remain in your app /public/books/... for now.)

⸻

2.2 Tables (DDL)

profiles (guardian/household)

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  email text,
  subscription_status text not null default 'free',
  stripe_customer_id text
);

children

create table children (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  first_name text not null,
  last_name text,
  birth_year int,
  gender text,

  interests text[] not null default '{}',
  ability_tier text,
  learning_objectives jsonb not null default '{}',

  avatar_asset_path text -- storage path (private); nullable
);
create index on children (owner_user_id);

media_assets (for private storage references)

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,

  bucket text not null,
  path text not null,
  mime_type text,
  bytes bigint,
  sha256 text,
  created_at timestamptz not null default now(),
  unique(bucket, path)
);
create index on media_assets (owner_user_id);
create index on media_assets (child_id);


⸻

2.3 Books (BookV1 payload now; V2 later)

books

create table books (
  id uuid primary key default gen_random_uuid(),

  -- stable id from your JSON: "ginger-the-giraffe"
  book_key text not null unique,

  title text not null,
  origin text not null default 'system', -- system | ai_generated | imported
  schema_version int not null default 1, -- 1 = BookV1 payload; later 2 = BookV2

  -- system books => owner_user_id null; user books => owner_user_id set
  owner_user_id uuid references profiles(id) on delete cascade,
  created_by_child_id uuid references children(id) on delete set null,

  -- store your current structure unchanged
  payload jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on books (origin);
create index on books (owner_user_id);

Optional: compatibility view that returns a single JSON array (like your current file)

create view system_books_v1_array as
select jsonb_agg(payload order by book_key) as books
from books
where origin='system' and schema_version=1;


⸻

2.4 Library, favorites, progress

create table child_library (
  child_id uuid references children(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (child_id, book_id)
);

create table child_book_favorites (
  child_id uuid references children(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (child_id, book_id)
);

-- No durable page index; store best-effort char offset now.
-- Add position_wi later when you migrate to BookV2.
create table child_book_progress (
  child_id uuid references children(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,

  updated_at timestamptz not null default now(),
  last_read_at timestamptz,
  position_char_offset int not null default 0,
  position_wi int, -- future (nullable now)
  completed_at timestamptz,
  total_read_seconds int not null default 0,

  primary key (child_id, book_id)
);
create index on child_book_progress (child_id, last_read_at desc);


⸻

2.5 Sessions and events

create table learning_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  book_id uuid references books(id) on delete set null,
  session_type text not null default 'reading', -- reading|review|story_creation
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary jsonb not null default '{}'
);
create index on learning_sessions (child_id, started_at desc);

create table session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references learning_sessions(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null, -- word_tap|add_word|speed_change|etc
  payload jsonb not null default '{}' -- include rawWord, charOffset now; wi later
);
create index on session_events (session_id, created_at);


⸻

2.6 Vocabulary (AI definitions) + SRS-ready child vocab

create table vocab_terms (
  id uuid primary key default gen_random_uuid(),
  language text not null default 'en',
  normalized text not null,
  display text not null,
  ai_definition jsonb, -- {definition_kid, ipa, examples...}
  updated_at timestamptz not null default now(),
  unique(language, normalized)
);

create table child_vocab (
  child_id uuid references children(id) on delete cascade,
  term_id uuid references vocab_terms(id) on delete cascade,

  source_type text not null, -- clicked|imported|manual
  origin_book_id uuid references books(id) on delete set null,
  origin_session_id uuid references learning_sessions(id) on delete set null,

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'learning',

  next_review_at timestamptz,
  interval_days int not null default 0,
  ease numeric not null default 2.5,
  reps int not null default 0,

  primary key (child_id, term_id)
);
create index on child_vocab (child_id, next_review_at);

(Optional but useful later: lemma_cache for normalization cost savings.)

⸻

2.7 Points ledger (must be ledger-based)

create table point_transactions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  session_id uuid references learning_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  amount int not null, -- +earn, -spend
  reason text,
  idempotency_key text,
  unique(child_id, idempotency_key)
);
create index on point_transactions (child_id, created_at desc);


⸻

2.8 Story generation + moderation

create table story_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null, -- queued|running|succeeded|failed|discarded
  request jsonb not null default '{}',
  result_book_id uuid references books(id) on delete set null,
  error text
);
create index on story_generation_jobs (child_id, created_at desc);

create table content_moderation_results (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null, -- story_job|book
  ref_id uuid not null,
  status text not null, -- pass|fail|review
  flags jsonb not null default '{}',
  created_at timestamptz not null default now()
);


⸻

2.9 Imports + daily plans

create table word_import_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null, -- queued|running|done|failed
  source_type text not null, -- text|csv|image
  file_asset_id uuid references media_assets(id),
  stats jsonb not null default '{}',
  error text
);

create table daily_learning_plans (
  child_id uuid references children(id) on delete cascade,
  plan_date date not null,
  created_at timestamptz not null default now(),
  plan jsonb not null default '{}',
  generated_by text not null default 'fallback',
  primary key (child_id, plan_date)
);


⸻

2.10 Subscription plans + quotas + usage metering

create table subscription_plans (
  code text primary key, -- free|basic|premium
  quotas jsonb not null -- {stories_per_month, tts_chars, img_gen, ...}
);

create table subscriptions (
  owner_user_id uuid primary key references profiles(id) on delete cascade,
  plan_code text not null references subscription_plans(code),
  status text not null default 'active',
  current_period_start date,
  current_period_end date,
  stripe_subscription_id text,
  updated_at timestamptz not null default now()
);

create table usage_meter (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete set null,
  created_at timestamptz not null default now(),
  category text not null, -- story_gen|tts_chars|img_gen|llm_tokens
  quantity bigint not null,
  ref_type text,
  ref_id uuid
);
create index on usage_meter (owner_user_id, created_at desc);


⸻

2.11 (Optional) TTS tracks table (Polly-ready, can be empty for now)

If you want to persist Polly output later without changing book schema:

create table tts_tracks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  child_id uuid references children(id) on delete set null, -- if voice/settings are child-specific
  provider text not null default 'polly',
  voice_id text,
  engine text,
  speech_rate numeric,

  -- store in Storage
  audio_asset_id uuid references media_assets(id),

  -- store derived timings mapped to your internal position (char offsets now, wi later)
  timings jsonb, -- [{pos_char:123, s:0, e:120}] or later [{wi:..., s:..., e:...}]
  created_at timestamptz not null default now()
);


⸻

3) RLS (Policy Summary)

Enable RLS on all household/child tables.
	•	profiles: only auth.uid() = profiles.id
	•	children: only rows where children.owner_user_id = auth.uid()
	•	books:
	•	readable if origin='system' (authenticated users) OR owner_user_id = auth.uid()
	•	writable only if owner_user_id = auth.uid() (for user-generated/imported)
	•	child_*, sessions, vocab, points, jobs, usage:
	•	join through children.owner_user_id = auth.uid()

(Implementation detail: add helper SQL functions or use exists (...) joins.)

⸻

4) Query Patterns (Core App Operations)
	•	List system books (same as your JSON array):
	•	select books from system_books_v1_array;
	•	Child library list:
	•	join child_library → books
	•	Resume progress:
	•	select position_char_offset from child_book_progress where child_id=? and book_id=?;
	•	Word tap logging:
	•	insert session_events(event_type='word_tap', payload={rawWord, charOffset, bookKey})
	•	Add to word list:
	•	upsert vocab_terms by normalized
	•	upsert child_vocab (child_id, term_id)
	•	Due words:
	•	select ... from child_vocab where next_review_at <= now() order by next_review_at limit N;
	•	Points balance:
	•	select coalesce(sum(amount),0) from point_transactions where child_id=?;

⸻

5) The “Final Data Model Prompt” for Codex (implement everything)

Copy/paste this into Codex:

⸻

Codex Prompt

You are a senior full-stack engineer. Implement Supabase persistence for my kids reading app with minimal refactor. My current “system books” are in a local JSON file containing an array of BookV1 objects:

type BookV1 = { id: string; title: string; text: string; images: { id: string; afterWordIndex: number; src: string; caption?: string; alt?: string; sourceUrl?: string }[] }

Images referenced by src are in my app /public/books/... and must remain unchanged for now.

Goals
	1.	Store books in Supabase as-is (BookV1 payload) so my app can load them from Supabase the same way it loads from JSON today.
	2.	Add full data model for: household (guardian), children, library, progress, sessions/events, vocab/SRS, points ledger, story jobs, imports, daily plans, subscription quotas, usage metering.
	3.	Implement RLS policies for a single-household model: one authenticated user owns one household; only that user can access their children and data.
	4.	Provide a compatibility view that returns the entire system book list as a JSON array (so the app can fetch one row and get the array).

Deliverables
	•	Supabase SQL migrations (DDL + indexes + RLS policies) implementing these tables:
	•	profiles, children, media_assets
	•	books (payload jsonb, book_key unique, origin, schema_version)
	•	child_library, child_book_favorites, child_book_progress (position_char_offset now, position_wi nullable for future)
	•	learning_sessions, session_events
	•	vocab_terms, child_vocab (SRS fields)
	•	point_transactions (ledger with idempotency_key)
	•	story_generation_jobs, content_moderation_results
	•	word_import_jobs, daily_learning_plans
	•	subscription_plans, subscriptions, usage_meter
	•	(optional) tts_tracks table scaffolding
	•	Create a view system_books_v1_array:
	•	select jsonb_agg(payload order by book_key) as books from books where origin='system' and schema_version=1
	•	Seed script:
	•	reads my existing JSON file (array of BookV1)
	•	upserts into books with:
	•	book_key = payload.id
	•	title = payload.title
	•	origin = ‘system’
	•	schema_version = 1
	•	payload = original object
	•	Provide a small repository module in the app:
	•	getSystemBooks(): Promise<BookV1[]> that queries the view and returns the books array
	•	getBookByKey(book_key): Promise<BookV1> querying books by key and returning payload
	•	Provide documentation in README: how to run migrations and seed.

RLS rules
	•	profiles: user can select/update their own row (profiles.id = auth.uid())
	•	children/media_assets: only where owner_user_id = auth.uid()
	•	books:
	•	select allowed if origin=‘system’ OR owner_user_id = auth.uid()
	•	insert/update/delete only if owner_user_id = auth.uid() OR (for seeding) allow service role only
	•	all child-specific tables must enforce guardian ownership via join to children

Make minimal app changes. Do not modify the BookV1 JSON structure. Keep image src paths unchanged. Ensure seed uses service role key and runtime access uses anon key with RLS.

Output:
	•	list of new/changed files
	•	SQL migrations
	•	seed script
	•	repo module for book fetching
	•	brief usage instructions

⸻

If you want, tell me:
	•	your Supabase project structure (do you use Supabase CLI migrations already?)
	•	where the JSON file currently lives in the repo
…and I’ll tailor the seed script paths + module locations exactly.