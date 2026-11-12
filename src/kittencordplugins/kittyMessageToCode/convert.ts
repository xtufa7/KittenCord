/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function embed(value: unknown) {
    const input = object(value), result: Record<string, unknown> = {};
    for (const key of ["title", "description", "url", "timestamp", "color"]) if (["string", "number"].includes(typeof input[key])) result[key] = input[key];
    if (typeof input.rawTitle === "string") result.title = input.rawTitle;
    if (typeof input.rawDescription === "string") result.description = input.rawDescription;
    if (input.timestamp instanceof Date && Number.isFinite(input.timestamp.getTime())) result.timestamp = input.timestamp.toISOString();
    if (typeof input.color === "string" && /^#[\da-f]{6}$/i.test(input.color)) result.color = parseInt(input.color.slice(1), 16);
    for (const [key, fields] of Object.entries({ author: ["name", "url", "icon_url"], footer: ["text", "icon_url"], image: ["url"], thumbnail: ["url"] })) {
        const item = object(input[key]), output = Object.fromEntries(fields.filter(field => typeof item[field] === "string").map(field => [field, item[field]]));
        if (fields.includes("icon_url") && typeof item.iconURL === "string") output.icon_url = item.iconURL;
        if (Object.keys(output).length) result[key] = output;
    }
    if (Array.isArray(input.fields)) result.fields = input.fields.slice(0, 25).map(field => { const value = object(field); return { name: String(value.rawName ?? value.name ?? "").slice(0, 256), value: String(value.rawValue ?? value.value ?? "").slice(0, 1024), inline: value.inline === true }; });
    return result;
}
function component(value: unknown, depth = 0): Record<string, unknown> {
    if (depth > 4) throw new Error("Components are nested too deeply.");
    const input = object(value), output: Record<string, unknown> = {};
    if (typeof input.type !== "number" || ![1, 2, 3, 5, 6, 7, 8].includes(input.type)) throw new Error("This message uses an unsupported component type. Components V2 need a version-specific export.");
    for (const key of ["type", "style", "label", "custom_id", "url", "disabled", "placeholder", "min_values", "max_values", "content", "accent_color", "spoiler", "divider", "spacing"]) if (["string", "number", "boolean"].includes(typeof input[key])) output[key] = input[key];
    if (Array.isArray(input.components)) output.components = input.components.slice(0, 40).map(item => component(item, depth + 1));
    if (input.accessory) output.accessory = component(input.accessory, depth + 1);
    if (input.emoji) { const emoji = object(input.emoji); output.emoji = { ...(typeof emoji.id === "string" ? { id: emoji.id } : {}), ...(typeof emoji.name === "string" ? { name: emoji.name } : {}), animated: emoji.animated === true }; }
    if (Array.isArray(input.options)) output.options = input.options.slice(0, 25).map(option => { const data = object(option); return { label: String(data.label ?? ""), value: String(data.value ?? ""), ...(typeof data.description === "string" ? { description: data.description } : {}), default: data.default === true }; });
    return output;
}
export function messagePayload(value: unknown) {
    const input = object(value);
    return { content: typeof input.content === "string" ? input.content.slice(0, 4000) : "", embeds: Array.isArray(input.embeds) ? input.embeds.slice(0, 10).map(embed) : [], components: Array.isArray(input.components) ? input.components.slice(0, 40).map(value => component(value)) : [], allowed_mentions: { parse: [] as string[] } };
}
export function messageCode(value: unknown, target: "json" | "js" | "py") {
    const payload = messagePayload(value), json = JSON.stringify(payload, null, 2);
    if (json.length > 100000) throw new Error("This message is too large to export.");
    if (target === "json") return json;
    if (target === "js") return `const payload = ${json};\nawait channel.send({ ...payload, allowed_mentions: undefined, allowedMentions: { parse: [] } });`;
    if (payload.components.length) throw new Error("discord.py components need a View matching the installed library version. Export Webhook JSON or discord.js for this message instead.");
    return `import json\nimport discord\npayload = json.loads(${JSON.stringify(json)})\nawait channel.send(content=payload["content"] or None, embeds=[discord.Embed.from_dict(item) for item in payload["embeds"]], allowed_mentions=discord.AllowedMentions.none())`;
}
