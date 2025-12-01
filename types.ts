
export interface SaveData {
  money: number;
  totalPagesFound: number;
  upgrades: Record<string, number>;
  lastSaved?: number; // Timestamp
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  type: 'weapon' | 'upgrade';
  max: number;
  desc: string;
}

export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
}

export interface GameStats {
  score: number;
  time: number;
  coins: number;
  diaryPages: number;
  level: number;
  // Added properties
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
}

export type GameMode = 'CLASSIC' | 'CHALLENGE';

export interface UpgradeOption {
  id: string;
  text: string;
  description?: string;
  icon: string; // New property for UI icons
}
