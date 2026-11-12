# KittenCord plugins

Plugins written for KittenCord itself. Inherited plugins stay in their upstream folders:
`src/plugins` (Vencord), `src/equicordplugins` (Equicord) and `src/testcordplugins` (TestCord).

| Folder | Plugin | Platform |
|---|---|---|
| `kittySecretGuard` | Secret Guard: masked local pre-send review for secret-like text | Desktop and web |
| `kittyMediaLab` | Media Lab: crop, resize and convert images; trim and compress videos with local FFmpeg | Desktop and web |
| `kittyMiniDock.desktop` | Mini Dock: a compact voice window with live participants and voice controls | Desktop |
| `kittyTimeCapsule` | Time Capsule: local message reminders with scheduling, snooze and a link back | Desktop and web |
| `kittyVoiceLog` | Voice Log: existing call recaps plus personal timestamped notes, markers and Markdown export | Desktop and web |
| `kittyVoiceLab.web` | Voice Lab: browser microphone effects with live presets | Web only |
| `kittyScamRadar` | ScamRadar: local lookalike and scam-phrase warnings; manual QR scans | Desktop and web |
| `kittyImpostorCheck` | Impostor Check: compare non-friend DM names against moderators already viewed; optional avatar comparison | Desktop and web |
| `kittyPanicKey` | Panic Key: mute, optional deafen, stop your stream and show a privacy screen | Desktop and web |
| `kittyUndoSend` | Undo Send: cancel a delayed user-submitted send without losing its original draft | Desktop and web |
| `kittyBidi` | Bidi: automatic parsed-text direction and isolated inline content | Desktop and web |
| `kittyArabizi` | Arabizi: local transliteration, per-channel live mode and ambiguous-word choices | Desktop and web |
| `kittySpellSwitch.desktop` | Spell Switch: per-channel/server Electron spellcheck languages with optional dictionary downloads | Desktop |
| `kittyDrafts` | Drafts: searchable account-specific local text draft history | Desktop and web |
| `kittySmartPaste` | Smart Paste: review JSON, XML, CSV/TSV and code formatting, or attach pasted text | Desktop and web |
| `kittyDiagrams` | Diagrams: on-demand local Mermaid and CSV/JSON chart previews | Desktop and web |
| `kittyGlossary` | Glossary: personal and explicitly imported server definitions with hover explanations | Desktop and web |
| `kittyCurrency` | Currency: optional on-demand conversions with cached daily reference rates | Desktop and web |
| `kittyOcr` | OCR: local Arabic/English recognition with optional first-use runtime and dictionary downloads | Desktop and web |
| `kittyQr` | QR: generate, copy and decode QR images without opening decoded links | Desktop and web |
| `kittyImageCompare` | Image Compare: before/after reveal, side-by-side previews and synchronized zoom | Desktop and web |
| `kittyEmojiKitchen` | Emoji Kitchen: optional Google legacy sticker combinations and explicit attachment insertion | Desktop and web |
| `kittyInboxZero` | Inbox Zero: prioritized unread channels, open and mark-read actions | Desktop and web |
| `kittyVip` | VIP: selected-user highlights, local alerts and an optional local tone | Desktop and web |
| `kittyBatchNotify` | Batch Notify: opt-in focus digests through the Discord notification patch | Desktop and web |
| `kittyShelf` | Shelf: searchable links and files from messages rendered this session | Desktop and web |
| `kittyBotFold` | Bot Fold: expandable native groups for consecutive messages from the same bot | Desktop and web |
| `kittyVoiceScenes` | Voice Scenes: named local playback volume/mute mixes and voice-channel assignments | Desktop and web |
| `kittyStreamHealth` | Stream Health: inspect your own outbound video counters when Discord exposes them | Desktop and web |
| `kittyPluginFirewall` | Plugin Firewall: best-effort monitoring and blocking of known request/access paths; not a sandbox | Desktop and web |
| `kittyServerAudit` | Server Audit: read-only loaded role and safety-setting review with limited scoring | Desktop and web |
| `kittyAccountDoctor` | Account Doctor: read-only account security checklist and already-loaded authorization scopes | Desktop and web |
| `kittyDevCards` | DevCards: optional GitHub, npm, PyPI and CVE metadata on demand | Desktop and web |
| `kittyMessageToCode` | Message to Code: escaped JSON, discord.js and supported discord.py source exports | Desktop and web |
| `kittyFlashcards` | Flashcards: local account-specific decks, SM-2 reviews and JSON import/export | Desktop and web |
| `kittyAccentSync.desktop` | Accent Sync: Windows accent for KittenCord-owned UI only | Desktop |
| `kittyPatchFinder` | Patch Finder: explicit UI picking and loaded-component patch drafts for Developer Tools | Desktop and web |

Each plugin sets `authors: [Devs.Kittencord]`. Plugins marked `kittencordOrigin: "original"` show under the
KittenCord filter in Plugins. Core KittenCord plugins that must always run (`kittycordCloud`, `nativeThemePreviews`)
stay in `src/plugins/_core`.

The additions are disabled by default. Network-backed features require their individual settings to be enabled.
Source patches and native voice integrations still require verification in the installed Discord version.
