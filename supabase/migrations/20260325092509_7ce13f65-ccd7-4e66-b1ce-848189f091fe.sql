
-- Fix chat_rooms SELECT policy - it references chat_members.id instead of chat_rooms.id
DROP POLICY IF EXISTS "Members can view their chat rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their chat rooms" ON public.chat_rooms
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM chat_members
  WHERE chat_members.chat_room_id = chat_rooms.id AND chat_members.user_id = auth.uid()
));

-- Fix chat_members SELECT policy - self-referencing bug
DROP POLICY IF EXISTS "Members can view chat members" ON public.chat_members;
CREATE POLICY "Members can view chat members" ON public.chat_members
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM chat_members cm
  WHERE cm.chat_room_id = chat_members.chat_room_id AND cm.user_id = auth.uid()
));
