import { create } from 'zustand';

export type DrawerType = 'CART' | 'FILTERS' | 'NOTIFICATIONS' | 'PROFILE' | 'ADDRESS_SELECTOR';

interface DrawerStore {
  activeDrawer: DrawerType | null;
  drawerProps: any;
  openDrawer: (type: DrawerType, props?: any) => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  activeDrawer: null,
  drawerProps: null,
  openDrawer: (type, props = null) => set({ activeDrawer: type, drawerProps: props }),
  closeDrawer: () => set({ activeDrawer: null, drawerProps: null }),
}));
export default useDrawerStore;
