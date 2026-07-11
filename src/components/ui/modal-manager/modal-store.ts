import { create } from 'zustand';

export type ModalType = 'CONFIRM' | 'ALERT' | 'ADDRESS_CREATOR' | 'PRODUCT_DETAIL_POPUP' | 'CART_SURGE_ALERT';

interface ModalStore {
  activeModal: ModalType | null;
  modalProps: any;
  openModal: (type: ModalType, props?: any) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  activeModal: null,
  modalProps: null,
  openModal: (type, props = null) => set({ activeModal: type, modalProps: props }),
  closeModal: () => set({ activeModal: null, modalProps: null }),
}));
