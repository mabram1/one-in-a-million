export type PracticeDistance = 750 | 1000 | 1250;
export type HubMode = "practice" | "multiplayer" | "challenge" | "endless";
export type HubRoute = "home" | "customize" | "store" | "profile" | "settings";
export type InputClass =
  | "mobile_motion"
  | "mobile_touch"
  | "desktop_keyboard";

export interface HubWallet {
  coins: number;
  gems: number;
}

export interface HubPlayer {
  displayName: string;
  level: number;
  xp: number;
  xpForNextLevel: number;
  wallet: HubWallet;
}

export interface DailyChallengeModel {
  enabled: boolean;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardCoins: number;
}

export interface ModeAvailability {
  enabled: boolean;
  reason?: "offline" | "coming_soon" | "permission_required";
}

export interface MainHubModel {
  status: "loading" | "ready" | "offline" | "error";
  player: HubPlayer;
  selectedDistance: PracticeDistance;
  inputClass: InputClass;
  motionPermission: "granted" | "prompt" | "denied" | "not_applicable";
  modes: Record<HubMode, ModeAvailability>;
  daily?: DailyChallengeModel;
  locale: "en" | "sl";
  reducedMotion: boolean;
}

export interface MainHubActions {
  onDistanceChange(distance: PracticeDistance): void;
  onRaceNow(distance: PracticeDistance): void;
  onMode(mode: HubMode): void;
  onRoute(route: HubRoute): void;
  onDailyChallenge(): void;
}

export interface LiveTrackAssetPaths {
  mascotBody: string;
  mascotFace: string;
  mascotTail: string;
  goal: string;
  goalHalo: string;
  goalRays: string;
  wbc: string;
  virus: string;
  wallLeft: string;
  wallRight: string;
}

export interface LiveTrackOptions {
  selectedDistance: PracticeDistance;
  reducedMotion: boolean;
  inputClass: InputClass;
  seed?: number;
}
