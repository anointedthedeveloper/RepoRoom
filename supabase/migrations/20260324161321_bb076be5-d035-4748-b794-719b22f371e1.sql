
-- Fix: Restrict chat member insertion to room creators or self-adding
DROP POLICY "Authenticated users can add members" ON public.chat_members;
CREATE POLICY "Room creators or self can add members" ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = chat_room_id AND created_by = auth.uid())
  );
