/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SceneMember { id: string; volume: number; muted: boolean; }
export interface VoiceScene { name: string; members: SceneMember[]; }
export function voiceScene(value: unknown): VoiceScene {
    if (!value || typeof value !== "object" || !("name" in value) || typeof value.name !== "string" || !value.name.trim() || value.name.length > 60 || !("members" in value) || !Array.isArray(value.members) || value.members.length > 100) throw new Error("Use a scene name up to 60 characters and at most 100 members.");
    const members = value.members.filter((item): item is SceneMember => item && typeof item.id === "string" && /^\d{17,20}$/.test(item.id) && typeof item.volume === "number" && Number.isFinite(item.volume) && item.volume >= 0 && item.volume <= 200 && typeof item.muted === "boolean");
    if (members.length !== value.members.length) throw new Error("Scene volumes must be between 0% and 200% with valid user IDs.");
    return { name: value.name.trim(), members };
}
