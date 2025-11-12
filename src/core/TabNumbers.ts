import type { App, WorkspaceLeaf } from "obsidian";
import { View } from "obsidian";
import type { Settings } from "../settings/Settings";

interface WorkspaceLeafExt {
  tabHeaderEl?: HTMLElement;
  view?: {
    containerEl?: HTMLElement;
  };
}

interface WorkspaceSplit {
  type: string;
  children?: WorkspaceSplit[];
}

export class TabNumbers {
  private app: App;
  private settings: Settings;
  private badgeElements: Map<HTMLElement, HTMLElement> = new Map();
  private refreshTimeout: number | null = null;
  private isCtrlPressed = false;
  private readonly keydownHandler: (e: KeyboardEvent) => void;
  private readonly keyupHandler: (e: KeyboardEvent) => void;

  constructor(app: App, settings: Settings) {
    this.app = app;
    this.settings = settings;

    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
    this.refresh();
  }

  start(): void {
    document.addEventListener("keydown", this.keydownHandler, true);
    document.addEventListener("keyup", this.keyupHandler, true);
    this.refresh();
  }

  stop(): void {
    document.removeEventListener("keydown", this.keydownHandler, true);
    document.removeEventListener("keyup", this.keyupHandler, true);

    if (this.refreshTimeout !== null) {
      window.clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
    this.clearAllBadges();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && !this.isCtrlPressed) {
      this.isCtrlPressed = true;
      this.showBadges();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!e.ctrlKey && !e.metaKey && this.isCtrlPressed) {
      this.isCtrlPressed = false;
      this.hideBadges();
    }
  }

  private showBadges(): void {
    for (const badge of this.badgeElements.values()) {
      badge.style.display = "inline-flex";
    }
  }

  private hideBadges(): void {
    for (const badge of this.badgeElements.values()) {
      badge.style.display = "none";
    }
  }

  refresh(): void {
    // Debounce the refresh to prevent flickering
    if (this.refreshTimeout !== null) {
      window.clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = window.setTimeout(() => {
      this.doRefresh();
      this.refreshTimeout = null;
    }, 50);
  }

  private doRefresh(): void {
    if (!this.settings.enabled) {
      this.clearAllBadges();
      return;
    }

    const activeView = this.app.workspace.getActiveViewOfType(View);
    const activeLeaf = activeView?.leaf ?? null;
    if (!activeLeaf) {
      this.clearAllBadges();
      return;
    }

    const activeSplit = this.getParentSplit(activeLeaf);
    if (!activeSplit) {
      this.clearAllBadges();
      return;
    }

    const leavesInSplit = this.getLeavesInSplit(activeSplit);
    const shouldHaveBadges = new Set<HTMLElement>();
    // Only number tabs 1-8 (Obsidian's Cmd/Ctrl+9 always goes to last tab)
    const maxTabs = Math.min(leavesInSplit.length, 8);

    const tabsToRemove: HTMLElement[] = [];
    for (const tabHeader of this.badgeElements.keys()) {
      let shouldKeep = false;
      for (let i = 0; i < maxTabs; i++) {
        const leaf = leavesInSplit[i];
        const leafTabHeader = this.getTabHeaderElement(leaf);
        if (leafTabHeader === tabHeader) {
          shouldKeep = true;
          shouldHaveBadges.add(tabHeader);
          break;
        }
      }
      if (!shouldKeep) {
        tabsToRemove.push(tabHeader);
      }
    }

    for (const tabHeader of tabsToRemove) {
      const badge = this.badgeElements.get(tabHeader);
      if (badge) {
        badge.remove();
        this.badgeElements.delete(tabHeader);
      }
    }

    for (let i = 0; i < maxTabs; i++) {
      const leaf = leavesInSplit[i];
      const tabHeader = this.getTabHeaderElement(leaf);
      if (!tabHeader) continue;

      const displayNumber = i + 1; // 1-8
      const displayNumberStr = displayNumber.toString();

      const existingBadge = this.badgeElements.get(tabHeader);
      if (existingBadge) {
        if (existingBadge.textContent !== displayNumberStr) {
          existingBadge.textContent = displayNumberStr;
          existingBadge.setAttribute("data-tab-number", displayNumberStr);
        }
        existingBadge.style.setProperty("--tab-number-text-color", this.settings.badgeTextColor);
        existingBadge.style.setProperty("--tab-number-bg-color", this.settings.badgeBackgroundColor);
      } else {
        this.addBadgeToLeaf(leaf, displayNumber);
      }
    }
  }

  private getParentSplit(leaf: WorkspaceLeaf): HTMLElement | null {
    const tabHeader = this.getTabHeaderElement(leaf);
    if (!tabHeader) {
      return null;
    }

    let element: HTMLElement | null = tabHeader;
    while (element) {
      if (element.classList.contains("workspace-tabs")) {
        return element;
      }
      element = element.parentElement;
    }

    return null;
  }

  private getLeavesInSplit(splitContainer: HTMLElement): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    const allLeaves = this.app.workspace
      .getLeavesOfType("markdown")
      .concat(this.app.workspace.getLeavesOfType("canvas"))
      .concat(this.app.workspace.getLeavesOfType("pdf"));

    const emptyLeaves = this.getAllLeaves().filter((leaf) => !allLeaves.includes(leaf));
    const allLeavesIncludingEmpty = allLeaves.concat(emptyLeaves);

    for (const leaf of allLeavesIncludingEmpty) {
      const tabHeader = this.getTabHeaderElement(leaf);
      if (tabHeader && splitContainer.contains(tabHeader)) {
        leaves.push(leaf);
      }
    }

    leaves.sort((a, b) => {
      const headerA = this.getTabHeaderElement(a);
      const headerB = this.getTabHeaderElement(b);
      if (!headerA || !headerB) return 0;

      const parentA = headerA.parentElement;
      const parentB = headerB.parentElement;
      if (parentA !== parentB) return 0;

      const children = Array.from(parentA?.children || []);
      return children.indexOf(headerA) - children.indexOf(headerB);
    });

    return leaves;
  }

  private getAllLeaves(): WorkspaceLeaf[] {
    const leaves: WorkspaceLeaf[] = [];
    const rootSplit = this.app.workspace.rootSplit;
    if (!rootSplit) return leaves;

    this.collectLeaves(rootSplit as unknown as WorkspaceSplit, leaves);
    return leaves;
  }

  private collectLeaves(node: WorkspaceSplit | WorkspaceLeaf, leaves: WorkspaceLeaf[]): void {
    if ("type" in node && node.type === "leaf") {
      leaves.push(node as unknown as WorkspaceLeaf);
    } else if ("children" in node && node.children) {
      for (const child of node.children) {
        this.collectLeaves(child, leaves);
      }
    }
  }

  private getTabHeaderElement(leaf: WorkspaceLeaf): HTMLElement | null {
    const leafExt = leaf as WorkspaceLeafExt;

    const tabHeaderEl = leafExt.tabHeaderEl;
    if (tabHeaderEl) {
      return tabHeaderEl;
    }

    const view = leafExt.view;
    if (!view) {
      return null;
    }

    const containerEl = view.containerEl;
    if (!containerEl) {
      return null;
    }

    const workspaceLeaf = containerEl.closest(".workspace-leaf");
    if (!workspaceLeaf) {
      return null;
    }

    const leafId = workspaceLeaf.getAttribute("data-leaf-id");
    if (leafId) {
      const tabHeader = document.querySelector(`.workspace-tab-header[data-leaf-id="${leafId}"]`);
      if (tabHeader) {
        return tabHeader as HTMLElement;
      }
    }

    // Last resort: search for tab headers within the same parent container
    const tabHeaders = document.querySelectorAll(".workspace-tab-header");
    for (let i = 0; i < tabHeaders.length; i++) {
      const header = tabHeaders[i] as HTMLElement;
      const headerLeaf = header.closest(".workspace-leaf");
      if (headerLeaf === workspaceLeaf) {
        return header;
      }
    }

    return null;
  }

  private addBadgeToLeaf(leaf: WorkspaceLeaf, number: number): void {
    const tabHeader = this.getTabHeaderElement(leaf);
    if (!tabHeader) {
      return;
    }

    if (this.badgeElements.has(tabHeader)) {
      return;
    }

    const badge = document.createElement("div");
    badge.className = "tab-number-badge";
    badge.setAttribute("data-tab-number", number.toString());
    badge.textContent = number.toString();

    badge.style.setProperty("--tab-number-text-color", this.settings.badgeTextColor);
    badge.style.setProperty("--tab-number-bg-color", this.settings.badgeBackgroundColor);

    badge.style.display = this.isCtrlPressed ? "inline-flex" : "none";

    const closeButton = tabHeader.querySelector(".workspace-tab-header-inner-close-button");
    if (closeButton?.parentElement) {
      closeButton.parentElement.insertBefore(badge, closeButton);
      this.badgeElements.set(tabHeader, badge);
    } else {
      tabHeader.style.position = "relative";
      tabHeader.appendChild(badge);
      this.badgeElements.set(tabHeader, badge);
    }
  }

  private clearAllBadges(): void {
    for (const [_, badge] of this.badgeElements.entries()) {
      badge.remove();
    }
    this.badgeElements.clear();
  }
}
