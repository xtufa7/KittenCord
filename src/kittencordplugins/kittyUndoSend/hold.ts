/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function holdSend(milliseconds: number, valid: () => boolean) {
    let settle: (allow: boolean) => void = () => undefined;
    let done = false;
    const promise = new Promise<boolean>(resolve => { settle = resolve; });
    const finish = (allow: boolean) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        settle(allow && valid());
    };
    const timer = setTimeout(() => finish(true), milliseconds);
    return { promise, finish, deadline: Date.now() + milliseconds };
}
