import { Plugin } from "obsidian";
import { TabNumbers } from "./core/TabNumbers";
import { DEFAULT_SETTINGS, type Settings, TabNumbersSettingsTab } from "./settings/Settings";

export default class TabNumbersPlugin extends Plugin {
  settings: Settings;
  tabNumbers: TabNumbers;

  async onload() {
    await this.loadSettings();

    this.tabNumbers = new TabNumbers(this.app, this.settings);

    this.tabNumbers.start();

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.tabNumbers.refresh();
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.tabNumbers.refresh();
      })
    );

    this.addSettingTab(new TabNumbersSettingsTab(this.app, this));
  }

  onunload() {
    this.tabNumbers.stop();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<Settings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  refreshTabNumbers() {
    this.tabNumbers.updateSettings(this.settings);
  }
}
