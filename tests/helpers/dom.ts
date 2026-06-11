// shared dom-test helpers (jsdom environment files only)

import { mount, nextTick } from "../../src/index.js";
import type { Store, MountHandle } from "../../src/index.js";

// wait for queued (async) effects to flush
export const flush = (): Promise<void> => nextTick();

export interface MountedFixture {
    container: HTMLDivElement;
    app: MountHandle;
    cleanup (): void;
}

// build a container from an html string, append it to the document,
// and mount it against the given store
export function mountHTML (html: string, store: Store): MountedFixture {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const app = mount(container, store);

    return {
        container,
        app,
        cleanup () {
            app.stop();
            container.remove();
        }
    };
}
