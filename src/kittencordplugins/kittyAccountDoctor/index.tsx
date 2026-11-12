/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CompactNotice, KcButton, PrefGroup, PrefRow } from "@components/settings/tabs/KittenUI";
import { Devs } from "@utils/constants";
import { closePluginPanels, openPluginPanel } from "@utils/kittyPluginPanel";
import definePlugin from "@utils/types";
import { AuthorizedAppsStore, ConnectedAccountsStore, React, SettingsRouter, UserStore, useStateFromStores } from "@webpack/common";

import { accountChecks, sensitiveScopes } from "./checks";

function show() { openPluginPanel("KittyAccountDoctor", "Account checkup", function Report() {
    const user = useStateFromStores([UserStore], () => UserStore.getCurrentUser());
    const apps = useStateFromStores([AuthorizedAppsStore], () => AuthorizedAppsStore.getNewestTokens());
    const fetched = useStateFromStores([AuthorizedAppsStore], () => AuthorizedAppsStore.getFetchState() === "FETCHED");
    const connections = useStateFromStores([ConnectedAccountsStore], () => ConnectedAccountsStore.getAccounts());
    if (!user) return <CompactNotice>Sign into Discord to inspect your own account.</CompactNotice>;
    const { checks, score } = accountChecks({ mfa: user.mfaEnabled, verified: user.verified, phone: typeof user.phone === "string" ? user.phone.length > 0 : undefined });
    return <><CompactNotice>Local checklist based on your account and authorization metadata already loaded by Discord. No authentication token, email address, phone number or grant ID is displayed, logged or saved. This score is a checklist, not a security guarantee.</CompactNotice><PrefGroup title={score === undefined ? "Account data unavailable" : `Checklist: ${score}%`}>{checks.map(check => <PrefRow key={check.label} label={check.label} description={check.why} detail={check.value === undefined ? "Unavailable" : check.value ? "Enabled" : "Not enabled"}/>)}</PrefGroup><KcButton onClick={() => SettingsRouter.openUserSettings("my_account")}>Account security</KcButton><PrefGroup title="Authorized applications">{!fetched && <CompactNotice>Open Authorized Apps in Discord to load the current list, then return here. No apps are fetched automatically.</CompactNotice>}{apps.map(app => { const name = typeof app.application.name === "string" ? app.application.name : app.application.id, scopes = sensitiveScopes(app.scopes); return <PrefRow key={app.application.id} label={name} description={app.scopes.join(", ")} detail={scopes.length ? `${scopes.length} sensitive scopes` : "Review scopes"}/>; })}</PrefGroup><KcButton onClick={() => SettingsRouter.openUserSettings("authorized_apps")}>Review authorized apps</KcButton><PrefGroup title="Connections"><PrefRow label="Linked accounts loaded by Discord" detail={connections.length}/></PrefGroup><KcButton onClick={() => SettingsRouter.openUserSettings("connections")}>Review connections</KcButton></>;
}); }
export default definePlugin({ name: "KittyAccountDoctor", description: "A read-only local checklist of your account security and already-loaded app scopes. No token access, automatic fetching or account changes.", authors: [Devs.Kittencord], kittencordOrigin: "original", enabledByDefault: false, tags: ["Utility"], settingsAboutComponent: () => <KcButton onClick={show}>Open account checkup</KcButton>, toolboxActions: { "Account checkup": show }, stop() { closePluginPanels("KittyAccountDoctor"); }, flux: { LOGOUT() { closePluginPanels("KittyAccountDoctor"); } } });
