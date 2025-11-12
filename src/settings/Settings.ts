import { type App, PluginSettingTab, Setting } from "obsidian";
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

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Enable tab numbers")
      .setDesc("Show numbered badges on tabs in the active split")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
          this.plugin.refreshTabNumbers();
        })
      );

    const textColorSetting = new Setting(containerEl)
      .setName("Badge text color")
      .setDesc("Color of the number text (hex color code)");

    textColorSetting
      .addText((text) =>
        text
          .setPlaceholder("#ffffff")
          .setValue(this.plugin.settings.badgeTextColor)
          .onChange(async (value) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === "") {
              this.plugin.settings.badgeTextColor = value || "#ffffff";
              await this.plugin.saveSettings();
              this.plugin.refreshTabNumbers();
              const colorPicker = textColorSetting.settingEl.querySelector('input[type="color"]') as HTMLInputElement;
              if (colorPicker) {
                colorPicker.value = this.plugin.settings.badgeTextColor;
              }
            }
          })
      )
      .addColorPicker((color) => {
        color.setValue(this.plugin.settings.badgeTextColor).onChange(async (value) => {
          this.plugin.settings.badgeTextColor = value;
          await this.plugin.saveSettings();
          this.plugin.refreshTabNumbers();
          const textInput = textColorSetting.settingEl.querySelector(
            'input[type="text"][placeholder="#ffffff"]'
          ) as HTMLInputElement;
          if (textInput) {
            textInput.value = value;
          }
        });
      });

    const bgColorSetting = new Setting(containerEl)
      .setName("Badge background color")
      .setDesc("Background color of the badge (hex color code)");

    bgColorSetting
      .addText((text) =>
        text
          .setPlaceholder("#5b5b5b")
          .setValue(this.plugin.settings.badgeBackgroundColor)
          .onChange(async (value) => {
            if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === "") {
              this.plugin.settings.badgeBackgroundColor = value || "#5b5b5b";
              await this.plugin.saveSettings();
              this.plugin.refreshTabNumbers();
              const colorPicker = bgColorSetting.settingEl.querySelector('input[type="color"]') as HTMLInputElement;
              if (colorPicker) {
                colorPicker.value = this.plugin.settings.badgeBackgroundColor;
              }
            }
          })
      )
      .addColorPicker((color) => {
        color.setValue(this.plugin.settings.badgeBackgroundColor).onChange(async (value) => {
          this.plugin.settings.badgeBackgroundColor = value;
          await this.plugin.saveSettings();
          this.plugin.refreshTabNumbers();
          const textInput = bgColorSetting.settingEl.querySelector(
            'input[type="text"][placeholder="#5b5b5b"]'
          ) as HTMLInputElement;
          if (textInput) {
            textInput.value = value;
          }
        });
      });
  }
}
