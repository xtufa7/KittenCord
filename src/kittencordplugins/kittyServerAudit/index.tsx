/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { GuildRoleStore, GuildStore, PermissionsBits, PermissionStore, React, SelectedGuildStore, useStateFromStores } from "@webpack/common";

import { auditRoles } from "./audit";

const GuildSettings: { open(id: string, section: string): void; } = findByPropsLazy("open", "selectRole", "updateGuild");
function show() { openPluginPanel("KittyServerAudit", "Server permission review", function Report() {
    const id = useStateFromStores([SelectedGuildStore], () => SelectedGuildStore.getGuildId() ?? "");
    const guild = useStateFromStores([GuildStore], () => GuildStore.getGuild(id), [id]);
    const allowed = useStateFromStores([PermissionStore, GuildStore], () => !!guild && (PermissionStore.can(PermissionsBits.MANAGE_GUILD, guild) || PermissionStore.can(PermissionsBits.MANAGE_ROLES, guild)), [guild]);
    const roles = useStateFromStores([GuildRoleStore], () => GuildRoleStore.getRolesSnapshot(id), [id]);
    if (!guild || !allowed) return <CompactNotice>Select a server where you have Manage Server or Manage Roles.</CompactNotice>;
    const { findings, score } = auditRoles(id, Object.values(roles).map(role => ({ id: role.id, name: role.name, permissions: role.permissions, bot: !!role.tags?.bot_id })), guild.verificationLevel, guild.explicitContentFilter);
    return <><CompactNotice>Read-only review of currently loaded server settings. No member inventory is fetched. Webhook count is unavailable in this local report; review Integrations manually. The score summarizes these checks and is not a complete security assessment.</CompactNotice><PrefGroup title={`${guild.name} · ${score}/100`}>{findings.map(finding => <PrefRow key={finding.id} label={finding.label} description={finding.why} control={<KcButton onClick={() => GuildSettings.open(id, finding.section)}>Review setting</KcButton>}/>)}</PrefGroup>{!findings.length && <CompactNotice>No issues found in these limited checks.</CompactNotice>}<KcButton onClick={() => GuildSettings.open(id, "INTEGRATIONS")}>Review webhooks and integrations</KcButton></>;
}); }
export default definePlugin({ name: "KittyServerAudit", description: "Read-only review of loaded server role permissions and safety settings where you have management access. No bulk member fetching or automatic changes.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility"], settingsAboutComponent: () => <KcButton onClick={show}>Review current server</KcButton>, toolboxActions: { "Server permission review": show }, stop() { closePluginPanels("KittyServerAudit"); }, flux: { LOGOUT() { closePluginPanels("KittyServerAudit"); } } });
