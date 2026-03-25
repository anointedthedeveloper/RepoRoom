# Changelog

All notable changes to ChatFlow are documented here.

## [1.3.0] - 2025-03-12

### Fixed
- Self-preview PiP now appears immediately for both caller and callee using ref callbacks (no useEffect timing race)
- Call setup is ~500ms faster — `getUserMedia` and room lookup now run in parallel
- Removed duplicate PWA badge `useEffect` that ran twice on every chat update
- Fixed stale closure in realtime message subscription (`fetchMessages` missing from deps)
- Removed `remoteStream` from `createPeerConnection` deps — was tearing down peer connections mid-call
- Removed double `callAccept` sound on incoming call accept

## [1.2.0] - 2025-03-10

### Added
- Split-view mode — open two chats side by side on desktop
- Message request system — new DMs start as pending until accepted
- Group admin roles — owner, admin, member with promote/demote actions
- Edit and delete messages
- System messages for group events (member added/removed, left)
- PWA app badge showing total unread count
- Wake lock during calls to prevent screen sleep

### Fixed
- ICE candidate queuing before remote description is set
- ICE restart on connection failure
- 5s grace period before ending on `disconnected` state

## [1.1.0] - 2025-03-05

### Added
- Voice & video calls via WebRTC with STUN/TURN servers
- Ringtone with 4 selectable tones (default, classic, soft, pulse)
- Call indicators in chat (ended, missed, declined, no answer)
- Screen sharing during video calls
- Camera preview before accepting a video call
- Swap local/remote video by tapping PiP
- Push notifications for incoming calls and background messages
- Voice notes — record and send audio inline

### Changed
- Improved ICE server config with Open Relay TURN fallback

## [1.0.0] - 2025-02-28

### Added
- Real-time messaging via Supabase Realtime
- Direct messages and group chats
- File sharing — images, videos, documents, PDFs
- Image lightbox
- Reply to messages (double-tap or hover)
- Typing indicators
- Read receipts (single/double tick)
- User profiles with avatar upload
- Group management — edit name/icon, add members
- Themes — Default, Ocean, Forest, Rose
- Dark & light mode
- Responsive layout with sidebar toggle
- Emoji picker
