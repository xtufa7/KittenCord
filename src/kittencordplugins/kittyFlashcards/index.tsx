/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get, set } from "@api/DataStore";
import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import type { Message } from "@vencord/discord-types";
import { Alerts, Menu, React, TextArea, TextInput, UserStore, useState } from "@webpack/common";

import { type Flashcard, parseDeck, reviewCard } from "./schedule";

let cards: Flashcard[] = [], account = "", active = false, generation = 0, revision = 0, failure = "";
let writes = Promise.resolve();
const listeners = new Set<() => void>();
const publish = () => { revision++; for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
function save(next: Flashcard[]) {
    if (!active || !account || account !== UserStore.getCurrentUser()?.id) throw new Error("Wait for your local decks to load.");
    const id = account; cards = next; publish(); const value = structuredClone(cards);
    writes = writes.then(() => set(`KittenCord:Flashcards:${id}`, value)).catch(() => { failure = "Decks could not be saved. Export a backup before closing Discord."; publish(); });
}
async function load() {
    const id = UserStore.getCurrentUser()?.id, current = ++generation; account = ""; cards = []; failure = ""; publish(); if (!id) return;
    try { await writes; const stored = await get(`KittenCord:Flashcards:${id}`); if (!active || current !== generation) return; cards = parseDeck(JSON.stringify(stored ?? [])); account = id; publish(); }
    catch { if (current === generation) { failure = "Saved decks could not load. Editing is paused to protect them."; publish(); } }
}
function show(initial = "") {
    openPluginPanel("KittyFlashcards", "Flashcards", function Decks() {
        React.useSyncExternalStore(subscribe, () => revision);
        const [deck, setDeck] = useState("Personal"), [front, setFront] = useState(initial.slice(0, 6000)), [back, setBack] = useState(""), [error, setError] = useState(""), [revealed, setRevealed] = useState<string>();
        const due = cards.filter(card => card.deck === deck && card.due <= Date.now()).sort((a, b) => a.due - b.due)[0];
        const act = (work: () => void) => { try { work(); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : "Deck action failed."); } };
        return <><CompactNotice>Cards are stored locally for your account. Only text you explicitly save is included.</CompactNotice>{failure && <CompactNotice tone="warning">{failure}</CompactNotice>}<TextInput value={deck} onChange={value => { setDeck(value); setRevealed(undefined); }} maxLength={100} placeholder="Deck"/><PrefGroup title="Your decks">{[...new Set(cards.map(card => card.deck))].map(name => <KcButton key={name} onClick={() => { setDeck(name); setRevealed(undefined); }}>{name}</KcButton>)}</PrefGroup><TextArea value={front} onChange={setFront} placeholder="Question"/><TextArea value={back} onChange={setBack} placeholder="Answer"/><KcButton disabled={!account} onClick={() => act(() => { if (cards.length >= 1000) throw new Error("Keep up to 1,000 cards."); const [card] = parseDeck(JSON.stringify([{ id: crypto.randomUUID(), deck, front, back }])); save([...cards, card]); setFront(""); setBack(""); })}>Add card</KcButton><PrefGroup title="Review">{due ? <><PrefRow label={due.front} description={revealed === due.id ? due.back : "Answer hidden"}/><KcButton onClick={() => setRevealed(due.id)}>Reveal answer</KcButton>{revealed === due.id && [0, 3, 4, 5].map((grade, index) => <KcButton key={grade} onClick={() => act(() => { save(cards.map(card => card.id === due.id ? reviewCard(card, grade, Date.now()) : card)); setRevealed(undefined); })}>{["Again", "Hard", "Good", "Easy"][index]}</KcButton>)}<KcButton onClick={() => Alerts.show({ title: "Delete this card?", body: due.front.slice(0, 200), confirmText: "Delete", cancelText: "Cancel", onConfirm: () => act(() => save(cards.filter(card => card.id !== due.id))) })}>Delete card</KcButton></> : <CompactNotice>No cards are due in this deck.</CompactNotice>}</PrefGroup><KcButton onClick={async () => {
            const id = account;
            try { const file = await chooseFile("application/json,.json"); if (!file) return; if (file.size > 5000000) throw new Error("Keep imports under 5 MB."); const imported = parseDeck(await file.text()); if (!active || !id || id !== account) return;
                Alerts.show({ title: "Import flashcards?", body: `Merge ${imported.length} cards. Matching IDs will be replaced; all other cards are preserved.`, confirmText: "Import", cancelText: "Cancel", onConfirm: () => act(() => { if (account !== id) throw new Error("Your account changed."); const merged = [...cards.filter(card => !imported.some(item => item.id === card.id)), ...imported]; if (merged.length > 1000) throw new Error("The merged deck exceeds 1,000 cards."); save(merged); }) });
            } catch (failure) { setError(failure instanceof Error ? failure.message : "Import failed."); }
        }}>Import JSON</KcButton><KcButton onClick={() => saveFile(new File([JSON.stringify(cards, null, 2)], "flashcards.json", { type: "application/json" }))}>Export all decks</KcButton>{error && <CompactNotice tone="warning">{error}</CompactNotice>}</>;
    });
}
function clear() { generation++; account = ""; cards = []; failure = ""; publish(); closePluginPanels("KittyFlashcards"); }
export default definePlugin({ name: "KittyFlashcards", description: "Save selected message text to local study decks, review with spaced repetition, and import or export validated JSON.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility", "Chat"], settingsAboutComponent: () => <KcButton onClick={() => show()}>Open flashcards</KcButton>, toolboxActions: { Flashcards: () => show() }, contextMenus: { message(children, { message }: { message: Message; }) { children.push(<Menu.MenuItem key="kitty-flashcards" id="kitty-flashcards" label="Save text as flashcard" action={() => show(window.getSelection()?.toString() || message.content)}/>); } }, start() { active = true; void load(); }, stop() { active = false; clear(); }, flux: { CONNECTION_OPEN() { void load(); }, LOGOUT: clear } });
