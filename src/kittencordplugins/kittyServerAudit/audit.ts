/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AuditRole { id: string; name: string; permissions: bigint; bot?: boolean; }
export function auditRoles(guild: string, roles: AuditRole[], verification: number, filter: number) {
    const findings: { id: string; label: string; why: string; weight: number; section: string; }[] = [];
    const admin = 1n << 3n, everyone = roles.find(role => role.id === guild);
    for (const role of roles) if ((role.permissions & admin) !== 0n) findings.push({ id: `admin:${role.id}`, label: `${role.name} has Administrator`, why: role.bot ? "A compromised bot with Administrator can manage almost the entire server." : "Administrator bypasses channel permissions. Keep this role restricted to trusted people.", weight: role.id === guild ? 40 : 10, section: "ROLES" });
    if (everyone) for (const [bit, label] of [[1n << 17n, "Mention everyone"], [1n << 29n, "Manage webhooks"], [1n, "Create invites"]] as const) if ((everyone.permissions & bit) !== 0n) findings.push({ id: `everyone:${bit}`, label: `@everyone can ${label.toLowerCase()}`, why: "Review whether all members need this capability. Invites and mass mentions can increase abuse during a raid.", weight: bit === 1n ? 5 : 15, section: "ROLES" });
    if (verification === 0) findings.push({ id: "verification", label: "No verification requirement", why: "New accounts face fewer barriers before participating.", weight: 10, section: "SAFETY" });
    if (filter !== 2) findings.push({ id: "media", label: "Media scanning does not cover every member", why: "Review your server's explicit media filter and age-restricted channels.", weight: 10, section: "SAFETY" });
    return { findings, score: Math.max(0, 100 - findings.reduce((sum, finding) => sum + finding.weight, 0)) };
}
