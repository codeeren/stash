import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  getAllSettings,
  setSetting,
  type SettingKey,
} from "@/lib/settings";

type SettingsStore = {
  values: Record<SettingKey, string>;
  loaded: boolean;
  load: () => Promise<void>;
  set: (key: SettingKey, value: string) => Promise<void>;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  values: { ...DEFAULT_SETTINGS },
  loaded: false,
  load: async () => {
    const values = await getAllSettings();
    set({ values, loaded: true });
  },
  set: async (key, value) => {
    await setSetting(key, value);
    set((s) => ({ values: { ...s.values, [key]: value } }));
  },
}));
