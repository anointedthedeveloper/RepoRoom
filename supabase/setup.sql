-- ============================================================
-- ChatFlow / RepoRoom — Full Supabase Setup SQL
-- Run this once in your Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- ── 1. Utility trigger function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 2. Core tables ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  icon_url TEXT,
  status TEXT DEFAULT NULL,           -- 'pending' | 'accepted' | NULL
  is_archived BOOLEAN DEFAULT false,
  pinned_message_id UUID,             -- FK added after messages table
  pinned_message_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_delivered BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  file_url TEXT,
  file_type TEXT,
  file_name TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reply_to_text TEXT,
  reply_to_sender TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add pinned_message_id FK now that messages exists
ALTER TABLE public.chat_rooms
  ADD CONSTRAINT IF NOT EXISTS chat_rooms_pinned_message_id_fkey
  FOREIGN KEY (pinned_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL,
  signal_data TEXT,
  call_type TEXT,
  from_username TEXT,
  chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── 3. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS chat_members_user_id_idx ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS chat_members_room_id_idx ON public.chat_members(chat_room_id);
CREATE INDEX IF NOT EXISTS messages_room_id_idx ON public.messages(chat_room_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS call_signals_to_user_idx ON public.call_signals(to_user);
CREATE INDEX IF NOT EXISTS call_signals_from_user_idx ON public.call_signals(from_user);

-- ── 4. RLS helper (avoids recursion in chat_members policies) ─
CREATE OR REPLACE FUNCTION public.is_chat_room_member(
  target_room_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_room_id = target_room_id AND user_id = target_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_room_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_room_member(UUID, UUID) TO authenticated;

-- ── 5. RPC: accept chat request (bypasses RLS for recipient) ──
CREATE OR REPLACE FUNCTION public.accept_chat_request(room_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_rooms SET status = 'accepted' WHERE id = room_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_chat_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_chat_request(UUID) TO authenticated;

-- ── 6. Auto-create profile on signup ─────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 7. Row Level Security ─────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- chat_rooms
DROP POLICY IF EXISTS "Members can view their chat rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their chat rooms" ON public.chat_rooms
  FOR SELECT TO authenticated USING (public.is_chat_room_member(id));

DROP POLICY IF EXISTS "Authenticated users can create chat rooms" ON public.chat_rooms;
CREATE POLICY "Authenticated users can create chat rooms" ON public.chat_rooms
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can update chat rooms" ON public.chat_rooms;
CREATE POLICY "Members can update chat rooms" ON public.chat_rooms
  FOR UPDATE TO authenticated USING (public.is_chat_room_member(id));

DROP POLICY IF EXISTS "Creator can delete chat room" ON public.chat_rooms;
CREATE POLICY "Creator can delete chat room" ON public.chat_rooms
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- chat_members
DROP POLICY IF EXISTS "Members can view chat members" ON public.chat_members;
CREATE POLICY "Members can view chat members" ON public.chat_members
  FOR SELECT TO authenticated USING (public.is_chat_room_member(chat_room_id));

DROP POLICY IF EXISTS "Room creators or self can add members" ON public.chat_members;
CREATE POLICY "Room creators or self can add members" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_room_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Users can remove themselves" ON public.chat_members;
CREATE POLICY "Users can remove themselves" ON public.chat_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_room_id AND created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Members can update roles" ON public.chat_members;
CREATE POLICY "Members can update roles" ON public.chat_members
  FOR UPDATE TO authenticated USING (public.is_chat_room_member(chat_room_id));

-- messages
DROP POLICY IF EXISTS "Members can view messages" ON public.messages;
CREATE POLICY "Members can view messages" ON public.messages
  FOR SELECT TO authenticated USING (public.is_chat_room_member(chat_room_id));

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND public.is_chat_room_member(chat_room_id));

DROP POLICY IF EXISTS "Users can update their own messages read status" ON public.messages;
CREATE POLICY "Users can update their own messages read status" ON public.messages
  FOR UPDATE TO authenticated USING (public.is_chat_room_member(chat_room_id));

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- reactions
DROP POLICY IF EXISTS "See reactions" ON public.reactions;
CREATE POLICY "See reactions" ON public.reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Add reaction" ON public.reactions;
CREATE POLICY "Add reaction" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Remove reaction" ON public.reactions;
CREATE POLICY "Remove reaction" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- call_signals
DROP POLICY IF EXISTS "Users can insert call signals" ON public.call_signals;
CREATE POLICY "Users can insert call signals" ON public.call_signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);

DROP POLICY IF EXISTS "Users can view their own call signals" ON public.call_signals;
CREATE POLICY "Users can view their own call signals" ON public.call_signals
  FOR SELECT TO authenticated USING (auth.uid() = to_user OR auth.uid() = from_user);

DROP POLICY IF EXISTS "Users can delete their own call signals" ON public.call_signals;
CREATE POLICY "Users can delete their own call signals" ON public.call_signals
  FOR DELETE TO authenticated USING (auth.uid() = to_user OR auth.uid() = from_user);

-- ── 8. Realtime ───────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; END IF; END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; END IF; END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions; END IF; END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='call_signals') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals; END IF; END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='chat_rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms; END IF; END $$;

-- ── 9. Storage buckets ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Attachments upload" ON storage.objects;
CREATE POLICY "Attachments upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Attachments public read" ON storage.objects;
CREATE POLICY "Attachments public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Attachments update" ON storage.objects;
CREATE POLICY "Attachments update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'chat-attachments');
