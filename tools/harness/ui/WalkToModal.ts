/**
 * WalkTo config modal — same pattern as rs2b0t ParamsModal / script config.
 *
 * Panel stays slim (one button + status). Coords, presets, and map picker live here.
 */
import { el, button } from './dom.ts';
import { WALK_DESTINATIONS, resolveDestination, type WalkDestination } from './walkDestinations.ts';
import { openWorldMapPicker } from './WorldMapPicker.ts';
import { isPanelWalkActive, panelWalkTo } from './panelWalk.ts';
import { LogBus } from '../script/logBus.ts';

export type WalkToSelection = {
    x: number;
    z: number;
    level: number;
    label: string;
    radius: number;
};

/** Last confirmed destination (panel summary). */
let lastSelection: WalkToSelection | null = {
    x: 3092,
    z: 3243,
    level: 0,
    label: 'Draynor bank',
    radius: 3
};

export function getLastWalkToSelection(): WalkToSelection | null {
    return lastSelection;
}

export class WalkToModal {
    private backdrop: HTMLElement;
    private destSelect!: HTMLSelectElement;
    private tileX!: HTMLInputElement;
    private tileZ!: HTMLInputElement;
    private tileLvl!: HTMLInputElement;
    private radiusIn!: HTMLInputElement;
    private goBtn!: HTMLButtonElement;
    private mapBtn!: HTMLButtonElement;
    private onClosed: (() => void) | null = null;

    constructor() {
        this.backdrop = el('div', 'rs2b0t-modal-backdrop');
        this.backdrop.addEventListener('click', e => {
            if (e.target === this.backdrop) this.close();
        });

        const modal = el('div', 'rs2b0t-modal rs2b0t-walk-modal');
        const header = el('div', 'rs2b0t-modal-header');
        const title = el('div', 'rs2b0t-modal-title');
        title.textContent = 'WalkTo';
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'rs2b0t-button';
        close.textContent = '✕';
        close.style.flex = '0 0 auto';
        close.style.minWidth = '2.2em';
        close.addEventListener('click', () => this.close());
        header.appendChild(title);
        header.appendChild(close);
        modal.appendChild(header);

        const body = el('div', 'rs2b0t-params-body');

        // Destination preset
        const destRow = el('div', 'rs2b0t-param-row');
        const destLabel = el('div', 'rs2b0t-param-label');
        destLabel.textContent = 'Destination';
        const destHelp = el('div', 'rs2b0t-param-help');
        destHelp.textContent = 'Preset hub / bank, or custom tile below';
        destRow.appendChild(destLabel);
        destRow.appendChild(destHelp);
        this.destSelect = document.createElement('select');
        this.destSelect.className = 'rs2b0t-param-select';
        this.destSelect.style.width = '100%';
        this.destSelect.style.marginTop = '8px';
        const customOpt = document.createElement('option');
        customOpt.value = '__custom__';
        customOpt.textContent = '(custom tile)';
        this.destSelect.appendChild(customOpt);
        for (const d of WALK_DESTINATIONS) {
            const o = document.createElement('option');
            o.value = d.name;
            o.textContent = `${d.name}  ·  ${d.x},${d.z}`;
            this.destSelect.appendChild(o);
        }
        this.destSelect.addEventListener('change', () => this.onDestSelectChange());
        destRow.appendChild(this.destSelect);
        body.appendChild(destRow);

        // Tile coords
        const tileRow = el('div', 'rs2b0t-param-row');
        const tileLabel = el('div', 'rs2b0t-param-label');
        tileLabel.textContent = 'Tile';
        tileRow.appendChild(tileLabel);
        const tileHelp = el('div', 'rs2b0t-param-help');
        tileHelp.textContent = 'World x / z / level (0–3)';
        tileRow.appendChild(tileHelp);

        const tileCtl = el('div', 'rs2b0t-ctl-tile');
        tileCtl.style.marginTop = '8px';
        this.tileX = this.mkTileField(tileCtl, 'x', '3092');
        this.tileZ = this.mkTileField(tileCtl, 'z', '3243');
        this.tileLvl = this.mkTileField(tileCtl, 'lvl', '0');
        tileRow.appendChild(tileCtl);

        // Sync custom when typing
        for (const inp of [this.tileX, this.tileZ, this.tileLvl]) {
            inp.addEventListener('input', () => {
                const sel = this.readSelection();
                const preset = resolveDestination(this.destSelect.value);
                if (
                    !preset ||
                    preset.x !== sel.x ||
                    preset.z !== sel.z ||
                    preset.level !== sel.level
                ) {
                    this.destSelect.value = '__custom__';
                }
            });
        }
        body.appendChild(tileRow);

        // Map picker
        const mapRow = el('div', 'rs2b0t-param-row');
        const mapLabel = el('div', 'rs2b0t-param-label');
        mapLabel.textContent = 'Map';
        mapRow.appendChild(mapLabel);
        const mapHelp = el('div', 'rs2b0t-param-help');
        mapHelp.textContent =
            'Walkable-dot map (collision pack) · zoom / pan · click snaps to walkable';
        mapRow.appendChild(mapHelp);
        const mapBtns = el('div', 'rs2b0t-buttons');
        mapBtns.style.marginTop = '8px';
        this.mapBtn = button(mapBtns, 'Pick on map…', () => void this.handleMap());
        mapRow.appendChild(mapBtns);
        body.appendChild(mapRow);

        // Radius
        const radRow = el('div', 'rs2b0t-param-row');
        const radLabel = el('div', 'rs2b0t-param-label');
        radLabel.textContent = 'Arrival radius';
        radRow.appendChild(radLabel);
        const radHelp = el('div', 'rs2b0t-param-help');
        radHelp.textContent = 'Chebyshev tiles — stop when this close';
        radRow.appendChild(radHelp);
        const radCtl = el('div', 'rs2b0t-param-control');
        this.radiusIn = document.createElement('input');
        this.radiusIn.type = 'number';
        this.radiusIn.className = 'rs2b0t-param-num';
        this.radiusIn.min = '0';
        this.radiusIn.max = '20';
        this.radiusIn.value = '3';
        radCtl.appendChild(this.radiusIn);
        radRow.appendChild(radCtl);
        body.appendChild(radRow);

        modal.appendChild(body);

        // Footer actions
        const footer = el('div', 'rs2b0t-modal-footer');
        const footerBtns = el('div', 'rs2b0t-buttons');
        footerBtns.style.marginBottom = '0';
        button(footerBtns, 'Cancel', () => this.close());
        this.goBtn = button(footerBtns, 'Go', () => void this.handleGo());
        this.goBtn.style.borderColor = '#04A800';
        this.goBtn.style.color = '#9be05b';
        footer.appendChild(footerBtns);
        modal.appendChild(footer);

        this.backdrop.appendChild(modal);
        document.body.appendChild(this.backdrop);

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.isOpen()) {
                e.preventDefault();
                this.close();
            }
        });
    }

    private mkTileField(parent: HTMLElement, label: string, def: string): HTMLInputElement {
        const wrap = el('label', 'rs2b0t-param-tilef');
        wrap.textContent = label;
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'rs2b0t-param-tilein';
        inp.value = def;
        wrap.appendChild(inp);
        parent.appendChild(wrap);
        return inp;
    }

    isOpen(): boolean {
        return this.backdrop.style.display === 'flex';
    }

    open(opts?: { onClosed?: () => void }): void {
        this.onClosed = opts?.onClosed ?? null;
        // Restore last selection
        if (lastSelection) {
            const preset = resolveDestination(lastSelection.label);
            this.destSelect.value = preset ? preset.name : '__custom__';
            this.tileX.value = String(lastSelection.x);
            this.tileZ.value = String(lastSelection.z);
            this.tileLvl.value = String(lastSelection.level);
            this.radiusIn.value = String(lastSelection.radius);
        } else {
            this.destSelect.value = 'Draynor bank';
            this.onDestSelectChange();
        }
        this.goBtn.disabled = isPanelWalkActive();
        this.goBtn.textContent = isPanelWalkActive() ? 'Walking…' : 'Go';
        this.backdrop.style.display = 'flex';
        this.tileX.focus();
    }

    close(): void {
        this.backdrop.style.display = 'none';
        const cb = this.onClosed;
        this.onClosed = null;
        cb?.();
    }

    private onDestSelectChange(): void {
        const name = this.destSelect.value;
        if (name === '__custom__') return;
        const d = resolveDestination(name);
        if (!d) return;
        this.applyDest(d);
    }

    private applyDest(d: WalkDestination): void {
        this.tileX.value = String(d.x);
        this.tileZ.value = String(d.z);
        this.tileLvl.value = String(d.level);
    }

    private readSelection(): WalkToSelection {
        const x = Number(this.tileX.value) | 0;
        const z = Number(this.tileZ.value) | 0;
        const level = Number(this.tileLvl.value) | 0;
        const radius = Math.max(0, Math.min(20, Number(this.radiusIn.value) | 0));
        const name = this.destSelect.value;
        const preset = name !== '__custom__' ? resolveDestination(name) : null;
        const matches =
            preset && preset.x === x && preset.z === z && preset.level === level;
        return {
            x,
            z,
            level,
            radius,
            label: matches ? preset!.name : `custom ${x},${z},${level}`
        };
    }

    private async handleMap(): Promise<void> {
        const lvl = Number(this.tileLvl.value) | 0;
        const cx = Number(this.tileX.value) | 0;
        const cz = Number(this.tileZ.value) | 0;
        // Hide this modal while map is up (both full-screen overlays)
        this.backdrop.style.display = 'none';
        const picked = await openWorldMapPicker({
            level: lvl,
            x: cx || undefined,
            z: cz || undefined
        });
        this.backdrop.style.display = 'flex';
        if (!picked) return;
        this.destSelect.value = '__custom__';
        this.tileX.value = String(picked.x);
        this.tileZ.value = String(picked.z);
        this.tileLvl.value = String(picked.level);
        LogBus.add('info', `map pick ${picked.x},${picked.z},lv${picked.level} (walkable snap)`);
    }

    private async handleGo(): Promise<void> {
        if (isPanelWalkActive()) {
            LogBus.add('warn', 'WalkTo: already walking — use Stop');
            return;
        }
        const sel = this.readSelection();
        lastSelection = sel;
        this.close();
        await panelWalkTo(
            { x: sel.x, z: sel.z, level: sel.level },
            { label: sel.label, radius: sel.radius, timeoutMs: 300_000 }
        );
    }
}
