/**
 * In-picker / script params modal — port of rs2b0t ParamsModal.
 */
import { SettingsStore, type SettingsSchema } from '../runtime/Settings.ts';
import { groupSchema, isVisible, renderControl, visibilityDeps } from './paramControls.ts';
import { el } from './dom.ts';

export default class ParamsModal {
    private backdrop: HTMLElement;
    private titleEl: HTMLElement;
    private bodyEl: HTMLElement;
    private scriptName = '';
    private schema: SettingsSchema = {};
    private openTitle: string | null = null;
    private openIntro: string | null = null;
    private onCloseCb: (() => void) | null = null;
    private collapsed = new Map<string, Set<string>>();

    constructor(
        private isActive: () => boolean,
        private onChanged: () => void
    ) {
        this.backdrop = el('div', 'rs2b0t-modal-backdrop');
        Object.assign(this.backdrop.style, {
            display: 'none',
            position: 'fixed',
            inset: '0',
            background: 'rgba(0,0,0,0.55)',
            zIndex: '1200',
            alignItems: 'center',
            justifyContent: 'center'
        });
        this.backdrop.addEventListener('click', e => {
            if (e.target === this.backdrop) this.close();
        });

        const modal = el('div', 'rs2b0t-modal');
        Object.assign(modal.style, {
            background: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '12px 14px',
            width: 'min(480px, 94vw)',
            maxHeight: '80vh',
            overflow: 'auto',
            fontFamily: 'ui-monospace, Menlo, monospace'
        });
        const header = el('div', 'rs2b0t-modal-header');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        });
        this.titleEl = el('div', 'rs2b0t-modal-title');
        Object.assign(this.titleEl.style, { color: '#eee', fontWeight: '600', fontSize: '14px' });
        const close = document.createElement('button');
        close.className = 'rs2b0t-button';
        close.textContent = '✕';
        close.style.flex = '0 0 auto';
        close.addEventListener('click', () => this.close());
        header.appendChild(this.titleEl);
        header.appendChild(close);
        modal.appendChild(header);

        this.bodyEl = el('div', 'rs2b0t-params-body');
        modal.appendChild(this.bodyEl);

        this.backdrop.appendChild(modal);
        document.body.appendChild(this.backdrop);

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.isOpen()) {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            }
        });
    }

    isOpen(): boolean {
        return this.backdrop.style.display === 'flex';
    }

    open(
        scriptName: string,
        schema: SettingsSchema,
        opts?: { title?: string; zIndex?: number; onClose?: () => void; intro?: string }
    ): void {
        this.scriptName = scriptName;
        this.schema = schema;
        this.openTitle = opts?.title ?? null;
        this.openIntro = opts?.intro ?? null;
        this.onCloseCb = opts?.onClose ?? null;
        this.backdrop.style.zIndex = opts?.zIndex !== undefined ? String(opts.zIndex) : '1200';
        this.render();
        this.backdrop.style.display = 'flex';
    }

    close(): void {
        if (!this.isOpen()) return;
        this.backdrop.style.display = 'none';
        this.openIntro = null;
        const cb = this.onCloseCb;
        this.onCloseCb = null;
        cb?.();
    }

    private render(): void {
        this.titleEl.textContent = this.openTitle ?? `${this.scriptName} · parameters`;
        this.bodyEl.replaceChildren();
        if (this.openIntro) {
            const intro = el('div', 'rs2b0t-param-intro');
            Object.assign(intro.style, {
                margin: '0 0 10px',
                padding: '8px 10px',
                borderRadius: '4px',
                border: '1px solid #333',
                background: '#141414',
                color: '#aaa',
                fontSize: '12px',
                lineHeight: '1.45'
            });
            intro.textContent = this.openIntro;
            this.bodyEl.appendChild(intro);
        }
        const disabled = this.isActive();
        const deps = visibilityDeps(this.schema);
        const valueOf = (key: string): string =>
            this.schema[key]
                ? SettingsStore.displayString(this.scriptName, key, this.schema[key]!)
                : '';
        const collapsed = this.collapsed.get(this.scriptName) ?? new Set<string>();
        this.collapsed.set(this.scriptName, collapsed);

        for (const group of groupSchema(this.schema)) {
            const visibleKeys = group.keys.filter(key => isVisible(this.schema[key]!, valueOf));
            if (visibleKeys.length === 0) continue;

            let host: HTMLElement = this.bodyEl;
            if (group.name !== '') {
                const isCollapsed = collapsed.has(group.name);
                const header = el('button', 'rs2b0t-param-group');
                header.type = 'button';
                header.textContent = `${isCollapsed ? '▸' : '▾'} ${group.name}`;
                Object.assign(header.style, {
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: '#8ab4f8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 0',
                    marginTop: '6px'
                });
                header.addEventListener('click', () => {
                    if (!collapsed.delete(group.name)) collapsed.add(group.name);
                    this.render();
                });
                this.bodyEl.appendChild(header);
                if (isCollapsed) continue;
                host = el('div', 'rs2b0t-param-groupbody');
                this.bodyEl.appendChild(host);
            }

            for (const key of visibleKeys) {
                host.appendChild(this.renderRow(key, disabled, deps));
            }
        }
    }

    private renderRow(key: string, disabled: boolean, deps: Set<string>): HTMLElement {
        const def = this.schema[key]!;
        const row = el('div', 'rs2b0t-param-row');
        Object.assign(row.style, { marginBottom: '10px' });

        const label = el('div', 'rs2b0t-param-label');
        Object.assign(label.style, { color: '#ddd', fontSize: '12px', marginBottom: '2px' });
        label.textContent = def.label ?? key;
        row.appendChild(label);

        if (def.help) {
            const help = el('div', 'rs2b0t-param-help');
            Object.assign(help.style, {
                color: '#888',
                fontSize: '11px',
                marginBottom: '4px',
                lineHeight: '1.35'
            });
            help.textContent = def.help;
            row.appendChild(help);
        }

        const current = SettingsStore.displayString(this.scriptName, key, def);
        const control = renderControl(
            def,
            current,
            raw => {
                SettingsStore.save(this.scriptName, key, raw);
                this.onChanged();
                if (deps.has(key)) this.render();
            },
            { disabled }
        );
        control.classList.add('rs2b0t-param-control');
        row.appendChild(control);
        return row;
    }
}
