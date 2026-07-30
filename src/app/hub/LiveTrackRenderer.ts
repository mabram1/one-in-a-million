import type {
  LiveTrackAssetPaths,
  LiveTrackOptions,
  PracticeDistance
} from "./types";

type LoadedAssets = Record<keyof LiveTrackAssetPaths, HTMLImageElement>;

interface Particle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

const COLORS = {
  void: "#0d0305",
  deep: "#1c060b",
  wall: "#5e1229",
  coral: "#b8304f",
  glow: "#ffb9c8",
  player: "#43e0cf",
  rival: "#ff6a5c",
  gold: "#ffd24d"
} as const;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load menu asset: ${src}`));
    image.src = src;
  });

const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export class LiveTrackRenderer {
  private context: CanvasRenderingContext2D;
  private assets?: LoadedAssets;
  private particles: Particle[] = [];
  private frame = 0;
  private lastTime = 0;
  private elapsed = 0;
  private running = false;
  private resizeObserver: ResizeObserver;
  private visibilityHandler = (): void => this.syncVisibility();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private options: LiveTrackOptions
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas2D is required for Main Hub v2.");
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.createParticles(options.seed ?? 1_000_001);
  }

  async preload(paths: LiveTrackAssetPaths): Promise<void> {
    const entries = await Promise.all(
      (Object.keys(paths) as Array<keyof LiveTrackAssetPaths>).map(async key => [
        key,
        await loadImage(paths[key])
      ] as const)
    );
    this.assets = Object.fromEntries(entries) as LoadedAssets;
    this.draw(0);
  }

  setDistance(distance: PracticeDistance): void {
    this.options = { ...this.options, selectedDistance: distance };
    if (!this.running) this.draw(this.elapsed);
  }

  setReducedMotion(reducedMotion: boolean): void {
    this.options = { ...this.options, reducedMotion };
    this.syncVisibility();
  }

  start(): void {
    if (this.running || document.hidden) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  destroy(): void {
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
  }

  private tick = (time: number): void => {
    if (!this.running) return;
    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.elapsed += delta;
    this.update(delta);
    this.draw(this.elapsed);
    this.frame = requestAnimationFrame(this.tick);
  };

  private syncVisibility(): void {
    if (document.hidden || this.options.reducedMotion) {
      this.stop();
      this.draw(0);
    } else {
      this.start();
    }
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.draw(this.elapsed);
    }
  }

  private createParticles(seed: number): void {
    const random = seededRandom(seed);
    this.particles = Array.from({ length: 30 }, () => ({
      x: random(),
      y: random(),
      radius: 0.8 + random() * 2.2,
      speed: 0.006 + random() * 0.014,
      alpha: 0.18 + random() * 0.42
    }));
  }

  private update(delta: number): void {
    for (const particle of this.particles) {
      particle.y -= particle.speed * delta;
      if (particle.y < -0.04) particle.y = 1.04;
    }
  }

  private draw(time: number): void {
    const { width, height } = this.canvas;
    if (!width || !height) return;
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx, width, height, time);
    this.drawDynamicWalls(ctx, width, height, time);
    this.drawParticles(ctx, width, height);
    if (this.assets) {
      this.drawGoal(ctx, width, height, time);
      this.drawPreviewObjects(ctx, width, height, time);
      this.drawStartPlatform(ctx, width, height);
      this.drawMascot(ctx, width * 0.5, height * 0.37, height * 0.2, time);
    }
    this.drawVignette(ctx, width, height);
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    const pulse = this.options.reducedMotion ? 0 : Math.sin(time * 0.8) * 0.02;
    const gradient = ctx.createRadialGradient(
      width * 0.5,
      height * 0.18,
      0,
      width * 0.5,
      height * 0.35,
      height
    );
    gradient.addColorStop(0, `rgba(94,18,41,${0.72 + pulse})`);
    gradient.addColorStop(0.42, COLORS.deep);
    gradient.addColorStop(1, COLORS.void);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawDynamicWalls(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    if (!this.assets) return;
    const logicalScale = width / 400;
    const sourceOpaqueWidth = 158;
    const sourceHeight = this.assets.wallLeft.naturalHeight;
    const sourceWidth = this.assets.wallLeft.naturalWidth;
    const sliceDestinationHeight = Math.max(3, Math.round(logicalScale * 2));
    const scrollLogical = this.options.reducedMotion ? 0 : time * 42;
    const narrowHalfByDistance: Record<PracticeDistance, number> = {
      750: 78,
      1000: 64,
      1250: 54
    };
    const wideHalf = 192;
    const narrowHalf = narrowHalfByDistance[this.options.selectedDistance];

    for (let y = 0; y < height; y += sliceDestinationHeight) {
      const progressToGoal = 1 - y / height;
      const smoothProgress =
        progressToGoal * progressToGoal * (3 - 2 * progressToGoal);
      const worldY = y / logicalScale - scrollLogical;
      const undulation = Math.sin(worldY * 0.035) * 0.08;
      const wallHalfLogical =
        (wideHalf + (narrowHalf - wideHalf) * smoothProgress) *
        (1 + undulation);
      const wallHalfPx = wallHalfLogical * logicalScale;
      const leftEdge = width / 2 - wallHalfPx;
      const rightEdge = width / 2 + wallHalfPx;

      const tilePosition = ((worldY * 3) % sourceHeight + sourceHeight) % sourceHeight;
      const tileIndex = Math.floor((worldY * 3) / sourceHeight);
      const sourceY =
        Math.abs(tileIndex) % 2 === 0
          ? tilePosition
          : sourceHeight - 1 - tilePosition;
      const sourceSliceHeight = Math.min(
        4,
        sourceHeight - Math.floor(sourceY)
      );
      if (sourceSliceHeight <= 0) continue;

      ctx.drawImage(
        this.assets.wallLeft,
        0,
        Math.floor(sourceY),
        sourceOpaqueWidth,
        sourceSliceHeight,
        0,
        y,
        Math.max(0, leftEdge),
        sliceDestinationHeight + 1
      );
      ctx.drawImage(
        this.assets.wallRight,
        sourceWidth - sourceOpaqueWidth,
        Math.floor(sourceY),
        sourceOpaqueWidth,
        sourceSliceHeight,
        rightEdge,
        y,
        Math.max(0, width - rightEdge),
        sliceDestinationHeight + 1
      );
    }
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.fillStyle = COLORS.glow;
    for (const particle of this.particles) {
      ctx.globalAlpha = particle.alpha;
      ctx.beginPath();
      ctx.arc(
        particle.x * width,
        particle.y * height,
        particle.radius * (width / 390),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGoal(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    if (!this.assets) return;
    const depthByDistance: Record<PracticeDistance, number> = {
      750: 0.19,
      1000: 0.16,
      1250: 0.13
    };
    const size = width * depthByDistance[this.options.selectedDistance];
    const x = width / 2;
    const y = height * 0.28;
    const pulse = this.options.reducedMotion ? 1 : 1 + Math.sin(time * 2.2) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    this.drawCentered(ctx, this.assets.goalHalo, x, y, size * 3.1 * pulse);
    ctx.translate(x, y);
    ctx.rotate(this.options.reducedMotion ? 0 : time * 0.09);
    ctx.translate(-x, -y);
    this.drawCentered(ctx, this.assets.goalRays, x, y, size * 2.25);
    ctx.restore();
    this.drawCentered(ctx, this.assets.goal, x, y, size);
  }

  private drawPreviewObjects(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    if (!this.assets) return;
    const drift = this.options.reducedMotion ? 0 : Math.sin(time * 0.7) * width * 0.01;
    ctx.globalAlpha = 0.68;
    this.drawCentered(ctx, this.assets.wbc, width * 0.24 + drift, height * 0.5, width * 0.09);
    this.drawCentered(ctx, this.assets.virus, width * 0.77 - drift, height * 0.44, width * 0.075);
    ctx.globalAlpha = 1;
    this.drawRival(ctx, width * 0.3, height * 0.6, width * 0.035, COLORS.rival);
    this.drawRival(ctx, width * 0.72, height * 0.56, width * 0.028, "#a871c7");
  }

  private drawRival(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(2, radius * 0.25);
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.bezierCurveTo(
      x - radius,
      y + radius * 2,
      x + radius,
      y + radius * 3,
      x,
      y + radius * 4
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawStartPlatform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.save();
    ctx.strokeStyle = COLORS.player;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = width * 0.04;
    ctx.lineWidth = Math.max(3, width * 0.009);
    ctx.beginPath();
    ctx.ellipse(
      width / 2,
      height * 0.46,
      width * 0.34,
      height * 0.075,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.restore();
  }

  private drawMascot(
    ctx: CanvasRenderingContext2D,
    x: number,
    headCenterY: number,
    targetHeight: number,
    time: number
  ): void {
    if (!this.assets) return;
    const bob = this.options.reducedMotion ? 0 : Math.sin(time * 2.25) * targetHeight * 0.015;
    const targetWidth = targetHeight * (512 / 768);
    const top = headCenterY + bob - targetHeight * (270 / 768);
    const left = x - targetWidth / 2;
    const layers = [
      this.assets.mascotTail,
      this.assets.mascotBody,
      this.assets.mascotFace
    ];
    ctx.save();
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = targetWidth * 0.12;
    for (const layer of layers) {
      ctx.drawImage(layer, left, top, targetWidth, targetHeight);
    }
    ctx.restore();
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.22,
      width / 2,
      height / 2,
      width * 0.72
    );
    gradient.addColorStop(0, "rgba(13,3,5,0)");
    gradient.addColorStop(1, "rgba(13,3,5,.62)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawCentered(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    size: number
  ): void {
    const aspect = image.naturalWidth / image.naturalHeight;
    const width = aspect >= 1 ? size : size * aspect;
    const height = aspect >= 1 ? size / aspect : size;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  }
}
