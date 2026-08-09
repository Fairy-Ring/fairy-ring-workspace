/**
 * Harness-only canvas — pure Client-TS Canvas.ts stays stock.
 * Pixel scaling: nearest-neighbor when CSS upscales the 765×503 framebuffer.
 */
export const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
export const canvas2d: CanvasRenderingContext2D = canvas?.getContext('2d', {
    desynchronized: false,
    alpha: false
})!;

if (canvas2d) {
    canvas2d.imageSmoothingEnabled = false;
    const anyCtx = canvas2d as CanvasRenderingContext2D & {
        mozImageSmoothingEnabled?: boolean;
        webkitImageSmoothingEnabled?: boolean;
        msImageSmoothingEnabled?: boolean;
    };
    anyCtx.mozImageSmoothingEnabled = false;
    anyCtx.webkitImageSmoothingEnabled = false;
    anyCtx.msImageSmoothingEnabled = false;
}

export function saveDataURL(dataURL: string, filename: string) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
