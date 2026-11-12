/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CompactNotice, KcButton } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { Message, User } from "@vencord/discord-types";
import { ChannelStore, GuildMemberStore, GuildStore, PermissionsBits, PermissionStore, React, RelationshipStore, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { differenceHash, hashDistance, similarName } from "./similarity";
import style from "./style.css?managed";

const settings = definePluginSettings({ avatars: { type: OptionType.BOOLEAN, default: false, description: "Allow manual avatar comparisons to download two public avatars from cdn.discordapp.com. Images are processed locally and never uploaded.", onChange(value) { if (!value) { generation++; for (const request of requests) request.abort(); requests.clear(); } } } });
const seen = new Map<string, { id: string; guild: string; name: string; }>();
const requests = new Set<AbortController>();
let generation = 0, active = false;

async function avatarHash(user: User, signal: AbortSignal) {
    const url = new URL(user.getAvatarURL(undefined, 64, false, "png"));
    if (url.protocol !== "https:" || url.hostname !== "cdn.discordapp.com") throw new Error("Only Discord CDN avatars can be compared.");
    const response = await fetch(url, { signal, credentials: "omit", redirect: "error" });
    if (!response.ok || !response.body) throw new Error("An avatar could not be loaded.");
    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 512 * 1024) throw new Error("Avatar exceeds the image size limit.");
            chunks.push(new Uint8Array(value));
        }
    } finally { await reader.cancel(); }
    const bitmap = await createImageBitmap(new Blob(chunks), { resizeWidth: 9, resizeHeight: 8 });
    try {
        const canvas = new OffscreenCanvas(9, 8), context = canvas.getContext("2d");
        if (!context) throw new Error("Image processing is unavailable.");
        context.drawImage(bitmap, 0, 0, 9, 8);
        return differenceHash(context.getImageData(0, 0, 9, 8).data, 9, 8);
    } finally { bitmap.close(); }
}

const Check = ErrorBoundary.wrap(function Check({ message }: { message: Message; }) {
    const user = message.author, channel = ChannelStore.getChannel(message.channel_id);
    const [result, setResult] = useState(""), [busy, setBusy] = useState(false);
    const { avatars } = settings.use(["avatars"]);
    const alive = useRef(true);
    const local = useRef(new Set<AbortController>());
    useEffect(() => { alive.current = true; return () => { alive.current = false; for (const controller of local.current) controller.abort(); local.current.clear(); }; }, []);
    useEffect(() => {
        if (!active || !channel?.guild_id || user.bot || user.id === UserStore.getCurrentUser()?.id) return;
        const guild = GuildStore.getGuild(channel.guild_id);
        if (!guild || !PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel, guild.id, undefined, user.id)) return;
        const key = `${guild.id}:${user.id}`;
        seen.delete(key);
        seen.set(key, { id: user.id, guild: guild.id, name: GuildMemberStore.getMember(guild.id, user.id)?.nick || user.globalName || user.username });
        if (seen.size > 200) { const first = seen.keys().next().value; if (first) seen.delete(first); }
    }, [channel?.id, user.id]);
    if (!channel?.isDM() || user.bot || user.id === UserStore.getCurrentUser()?.id || RelationshipStore.isFriend(user.id)) return null;
    const candidate = [...seen.values()].find(other => other.id !== user.id && GuildMemberStore.isMember(other.guild, UserStore.getCurrentUser()?.id ?? "") && GuildMemberStore.isMember(other.guild, user.id)
        && (similarName(user.globalName || user.username, other.name) || similarName(user.username, other.name)));
    if (!candidate) return null;
    const original = UserStore.getUser(candidate.id);
    return <div className="kc-premium-settings vc-kitty-impostor-check"><CompactNotice tone="warning">This account ({user.id}) resembles {candidate.name} ({candidate.id}), a moderator previously seen in a shared server. Different account IDs. Similarity does not prove impersonation.</CompactNotice>{avatars && original?.avatar && user.avatar && <KcButton disabled={busy} onClick={async () => {
        const epoch = generation, controller = new AbortController();
        requests.add(controller); local.current.add(controller);
        const timeout = setTimeout(() => controller.abort(), 15000);
        setBusy(true);
        try {
            const [left, right] = await Promise.all([avatarHash(user, controller.signal), avatarHash(original, controller.signal)]);
            if (active && alive.current && epoch === generation) setResult(hashDistance(left, right) <= 6 ? "The avatars also look similar. Check the account IDs with a trusted moderator." : "The avatars differ. This does not verify either account's identity.");
        } catch (error) { if (active && alive.current && epoch === generation) setResult(error instanceof Error ? error.message : "Avatar comparison failed."); }
        finally { clearTimeout(timeout); requests.delete(controller); local.current.delete(controller); if (active && alive.current && epoch === generation) setBusy(false); }
    }}>Compare public avatars</KcButton>}{result && <CompactNotice>{result}</CompactNotice>}</div>;
}, { noop: true });

function clear() { generation++; seen.clear(); for (const request of requests) request.abort(); requests.clear(); }
export default definePlugin({
    name: "KittyImpostorCheck", description: "Compare non-friend DM names with moderators seen in loaded shared-server messages. Local and session-only; optional manual avatar downloads from cdn.discordapp.com.",
    authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility", "Chat"], dependencies: ["MessageAccessoriesAPI"], settings, managedStyle: style,
    settingsAboutComponent: () => <CompactNotice>Only moderators whose messages you have viewed this session can be compared. No member lists are fetched or saved. Warnings are not identity verification.</CompactNotice>,
    renderMessageAccessory: props => <Check message={props.message} />,
    flux: { LOGOUT: clear }, start() { active = true; }, stop() { active = false; clear(); }
});
