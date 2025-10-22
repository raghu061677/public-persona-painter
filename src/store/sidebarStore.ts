import { create } from "zustand";

interface SidebarState {
  open: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  open: localStorage.getItem("sidebar") !== "false",
  toggle: () => {
    const current = !get().open;
    localStorage.setItem("sidebar", current ? "true" : "false");
    set({ open: current });
  },
}));
