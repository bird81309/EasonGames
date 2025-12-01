
import { SaveData } from "../types";

const OLD_SAVE_KEY = 'survivor_save_classic_plus_v3';
const SLOT_PREFIX = 'survivor_save_slot_';

const DEFAULT_SAVE: SaveData = {
  money: 0,
  totalPagesFound: 0,
  upgrades: {},
  lastSaved: Date.now()
};

export const StorageService = {
  // Load specific slot (0, 1, 2)
  loadSlot: (slotIndex: number): SaveData => {
    try {
      const key = `${SLOT_PREFIX}${slotIndex}`;
      const stored = localStorage.getItem(key);
      
      // Migration logic: If slot 0 is empty but old save exists, move it
      if (!stored && slotIndex === 0) {
          const oldData = localStorage.getItem(OLD_SAVE_KEY);
          if (oldData) {
              const parsed = JSON.parse(oldData);
              const migrated = { ...DEFAULT_SAVE, ...parsed, lastSaved: Date.now() };
              localStorage.setItem(key, JSON.stringify(migrated));
              return migrated;
          }
      }

      if (stored) {
        return { ...DEFAULT_SAVE, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load save slot', slotIndex, e);
    }
    return { ...DEFAULT_SAVE, lastSaved: Date.now() };
  },

  // Save to specific slot
  saveSlot: (slotIndex: number, data: SaveData) => {
    try {
      const key = `${SLOT_PREFIX}${slotIndex}`;
      const dataWithTime = { ...data, lastSaved: Date.now() };
      localStorage.setItem(key, JSON.stringify(dataWithTime));
    } catch (e) {
      console.warn('Failed to save game to slot', slotIndex, e);
    }
  },
  
  // Get metadata for all slots without loading full state if possible (though simple here)
  getSlotsInfo: (): (SaveData | null)[] => {
      const slots = [];
      for(let i=0; i<3; i++) {
          const key = `${SLOT_PREFIX}${i}`;
          const stored = localStorage.getItem(key);
          if (stored) {
              slots.push(JSON.parse(stored));
          } else {
              // Check migration for slot 0 display
              if (i === 0 && localStorage.getItem(OLD_SAVE_KEY)) {
                   slots.push(JSON.parse(localStorage.getItem(OLD_SAVE_KEY)!));
              } else {
                   slots.push(null);
              }
          }
      }
      return slots;
  },

  calculateItemCost: (itemId: string, baseCost: number, currentLevel: number): number => {
      // 1. Progressive pricing: 1.5^n
      let cost = baseCost * Math.pow(1.50, currentLevel);
      // 2. Round down to nearest 10
      return Math.max(10, Math.floor(cost / 10) * 10);
  }
};
