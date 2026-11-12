/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function accountChecks(input: { mfa?: boolean; verified?: boolean; phone?: boolean; }) {
    const checks = [{ label: "Two-factor authentication", value: input.mfa, why: "A second factor helps protect your account if your password is compromised." }, { label: "Verified email", value: input.verified, why: "A verified recovery email helps you recover access." }, { label: "Phone added", value: input.phone, why: "Optional recovery information. A phone is not a replacement for MFA." }];
    const known = checks.filter(check => typeof check.value === "boolean");
    return { checks, score: known.length ? Math.round(known.filter(check => check.value).length / known.length * 100) : undefined };
}
export function sensitiveScopes(scopes: readonly string[]) { const sensitive = new Set(["email", "connections", "guilds.join", "webhook.incoming", "messages.read", "dm_channels.read", "rpc", "rpc.notifications.read", "activities.write"]); return scopes.filter(scope => sensitive.has(scope)); }
