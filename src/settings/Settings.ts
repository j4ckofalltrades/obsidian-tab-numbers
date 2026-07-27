import { type App, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type TabNumbersPlugin from "../main";

export interface Settings {
  enabled: boolean;
  badgeTextColor: string;
  badgeBackgroundColor: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  badgeTextColor: "#ffffff",
  badgeBackgroundColor: "#a882ff",
};

export class TabNumbersSettingsTab extends PluginSettingTab {
  plugin: TabNumbersPlugin;

  constructor(app: App, plugin: TabNumbersPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Badge text color",
        desc: "Color of the number text",
        control: { type: "color", key: "badgeTextColor" },
      },
      {
        name: "Badge background color",
        desc: "Background color of the badge",
        control: { type: "color", key: "badgeBackgroundColor" },
      },
    ];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    await super.setControlValue(key, value);
    this.plugin.refreshTabNumbers();
  }
}
