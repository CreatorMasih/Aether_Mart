import { create } from 'zustand';

type UserSegmentTab = 'MERCHANTS' | 'RIDERS' | 'CUSTOMERS';

interface AdminState {
  activeTab: UserSegmentTab;
  setActiveTab: (tab: UserSegmentTab) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  activeTab: 'MERCHANTS',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));

export default useAdminStore;
