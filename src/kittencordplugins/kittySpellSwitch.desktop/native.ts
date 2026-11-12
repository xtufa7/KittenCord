/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IpcMainInvokeEvent, Session } from "electron";

const original = new WeakMap<Session, string[]>();

export function info(event: IpcMainInvokeEvent) {
    if (process.platform === "darwin") return { available: false, supported: [] as string[], error: "macOS manages spellcheck languages automatically." };
    try { return { available: true, supported: event.sender.session.availableSpellCheckerLanguages, error: "" }; }
    catch { return { available: false, supported: [] as string[], error: "This Electron build does not expose spellcheck languages." }; }
}
export function apply(event: IpcMainInvokeEvent, languages: unknown, consent: unknown) {
    if (consent !== true || !Array.isArray(languages) || languages.length > 4 || languages.some(item => typeof item !== "string")) return { error: "Enable dictionary downloads before changing languages." };
    const { session } = event.sender;
    if (process.platform === "darwin" || languages.some(item => !session.availableSpellCheckerLanguages.includes(item))) return { error: "A selected language is not supported by this system." };
    try {
        if (!original.has(session)) original.set(session, session.getSpellCheckerLanguages());
        session.setSpellCheckerLanguages(languages);
        return { error: "" };
    } catch { return { error: "Spellcheck languages could not be changed." }; }
}
export function restore(event: IpcMainInvokeEvent) {
    const { session } = event.sender, languages = original.get(session);
    if (!languages) return { error: "" };
    try { session.setSpellCheckerLanguages(languages); original.delete(session); return { error: "" }; }
    catch { return { error: "Previous spellcheck languages could not be restored." }; }
}
