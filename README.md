# RepoRoom

> A full-featured real-time messaging app — DMs, group chats, voice & video calls, voice notes, file sharing, and more.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-chatflowv.vercel.app-6d28d9?style=flat-square&logo=vercel)](https://chatflowv.vercel.app)
[![Built with React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

## Features

| Category | Features |
|---|---|
| **Messaging** | Real-time delivery, reply with quoted context, edit & delete, emoji picker |
| **Media** | Images, videos, documents, PDFs, voice notes, image lightbox |
| **Calls** | WebRTC audio & video calls, screen sharing, self-preview PiP, ringtones |
| **Groups** | Create groups, add members, admin roles, group name/icon editing |
| **UX** | Typing indicators, read receipts, push notifications, split-view mode |
| **Profiles** | Avatar upload, display name, username, online status |
| **Themes** | Default, Ocean, Forest, Rose — dark & light mode |
| **PWA** | Installable, app badge for unread count, wake lock during calls |

---

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite
- **Styling** — Tailwind CSS, Framer Motion
- **Backend** — Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Calls** — WebRTC with STUN + TURN (Open Relay)
- **Deployment** — Vercel

---

## Quick Start

.### 1. Clone & install

```bash
git clone https://github.com/anointedthedeveloper/ChatFlow.git
cd ChatFlow
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Fill in your Supabase URL and publishable key
```

### 3. Supabase setup

Run the SQL below in your **Supabase SQL Editor** (Dashboard → SQL Editor → New query):

<details>
<summary>Click to expand full SQL setup</summary>

```sql
-- Tables
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  status text default 'offline',
  last_seen timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean default false,
  created_by uuid references auth.users,
  icon_url text,
  created_at timestamptz default now()
);

create table if not exists chat_members (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid references chat_rooms on delete cascade,
  user_id uuid references auth.users on delete cascade,
  joined_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  chat_room_id uuid references chat_rooms on delete cascade,
  sender_id uuid references auth.users on delete cascade,
  content text not null,
  is_read boolean default false,
  file_url text,
  file_type text,
  file_name text,
  reply_to_id uuid references messages(id) on delete set null,
  reply_to_text text,
  reply_to_sender text,
  created_at timestamptz default now()
);

create table if not exists call_signals (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references auth.users on delete cascade,
  to_user uuid references auth.users on delete cascade,
  signal_type text not null,
  signal_data text,
  call_type text,
  from_username text,
  chat_room_id uuid references chat_rooms(id) on delete set null,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  ) on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table chat_rooms enable row level security;
alter table chat_members enable row level security;
alter table messages enable row level security;
alter table call_signals enable row level security;

-- Policies
create policy "Public profiles" on profiles for select using (true);
create policy "Update own profile" on profiles for update using (auth.uid() = id);
create policy "Members see rooms" on chat_rooms for select using (true);
create policy "Create rooms" on chat_rooms for insert with check (auth.uid() = created_by);
create policy "Update rooms" on chat_rooms for update using (true);
create policy "See memberships" on chat_members for select using (true);
create policy "Join rooms" on chat_members for insert with check (true);
create policy "See messages" on messages for select using (exists (select 1 from chat_members where chat_room_id = messages.chat_room_id and user_id = auth.uid()));
create policy "Send messages" on messages for insert with check (auth.uid() = sender_id);
create policy "Mark read" on messages for update using (true);
create policy "Insert signals" on call_signals for insert with check (auth.uid() = from_user);
create policy "Read own signals" on call_signals for select using (auth.uid() = to_user or auth.uid() = from_user);
create policy "Delete signals" on call_signals for delete using (auth.uid() = from_user or auth.uid() = to_user);

-- Realtime
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table call_signals;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', true) on conflict (id) do nothing;

create policy "Avatar upload" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Avatar public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "Avatar update" on storage.objects for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Attachments upload" on storage.objects for insert with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');
create policy "Attachments public read" on storage.objects for select using (bucket_id = 'chat-attachments');
create policy "Attachments update" on storage.objects for update using (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');
```

</details>

### 4. Auth settings

Supabase → Authentication → Providers → Email → **disable "Confirm email"**

### 5. Run

```bash
npm run dev
```

### 6. Build

```bash
npm run build
```

---

## Project Structure

```
src/
├── components/
│   ├── chat/          # ChatPanel, MessageBubble, CallOverlay, Sidebar, etc.
│   └── ui/            # shadcn/ui primitives
├── context/           # AuthContext, ThemeContext
├── hooks/             # useChat, useWebRTC, useTheme
├── integrations/      # Supabase client & generated types
├── lib/               # sounds.ts, utils.ts
└── pages/             # ChatPage, LoginPage, Index
```

---

## Screenshots

<p align="center">
  <img src="public/assets/img1 (1).png" width="48%" alt="Screenshot 1" />
  <img src="public/assets/img1 (2).png" width="48%" alt="Screenshot 2" />
</p>
<p align="center">
  <img src="public/assets/img1 (3).png" width="48%" alt="Screenshot 3" />
  <img src="public/assets/img1 (4).png" width="48%" alt="Screenshot 4" />
</p>
<p align="center">
  <img src="public/assets/img1 (5).png" width="48%" alt="Screenshot 5" />
  <img src="public/assets/img1 (6).png" width="48%" alt="Screenshot 6" />
</p>
<p align="center">
  <img src="public/assets/img1 (7).png" width="48%" alt="Screenshot 7" />
  <img src="public/assets/img1 (8).png" width="48%" alt="Screenshot 8" />
</p>
<p align="center">
  <img src="public/assets/img1 (9).png" width="48%" alt="Screenshot 9" />
</p>

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## Built by

[AnointedTheDeveloper](https://github.com/anointedthedeveloper) — Lagos, Nigeria 🇳🇬
