/**
 * Minimal DOM helpers — same shape as rs2b0t `src/bot/ui/dom.ts`.
 * Keep class names under `rs2b0t-*` so full BotPanel CSS ports cleanly later.
 */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.className = className;
    return node;
}

export function sectionTitle(text: string): HTMLElement {
    const t = el('div', 'rs2b0t-section-title');
    t.textContent = text;
    return t;
}

export function row(parent: HTMLElement, key: string): HTMLElement {
    const r = el('div', 'rs2b0t-row');
    const k = el('span', 'rs2b0t-key');
    k.textContent = key;
    const v = el('span', 'rs2b0t-value');
    v.textContent = '—';
    r.appendChild(k);
    r.appendChild(v);
    parent.appendChild(r);
    return v;
}

export function button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'rs2b0t-button';
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
}
