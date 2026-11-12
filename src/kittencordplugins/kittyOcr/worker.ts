/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function ocrInput(file: Pick<File, "size" | "type">, language: string) {
    if (!file.size || file.size > 8 * 1024 * 1024 || !/^image\/(?:png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG or WebP image under 8 MB.");
    if (!["eng", "ara", "eng+ara"].includes(language)) throw new Error("Choose English, Arabic or both.");
}

export const workerSource = `
self.onmessage = async function(event) {
    let engine;
    try {
        const { image, language } = event.data;
        if (!(image instanceof ArrayBuffer) || image.byteLength > 8388608 || !["eng", "ara", "eng+ara"].includes(language)) throw Error("Invalid OCR input.");
        importScripts("https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js");
        engine = await Tesseract.createWorker(language, 1, {
            workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
            corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
            langPath: "https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0",
            cacheMethod: "write",
            logger: function(message) { self.postMessage({ progress: message.status, percent: message.progress }); }
        });
        const result = await engine.recognize(image);
        self.postMessage({ text: result.data.text.slice(0, 200000) });
    } catch { self.postMessage({ error: "OCR failed. Check dictionary download access or choose another image." }); }
    finally { if (engine) await engine.terminate(); }
};
`;
