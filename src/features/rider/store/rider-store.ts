import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DeliveryJob {
  id: string;
  storeName: string;
  storeAddress: string;
  storeCoordinates: { latitude: number; longitude: number };
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCoordinates: { latitude: number; longitude: number };
  distanceKm: number;
  estimatedEarnings: number;
  estTimeMinutes: number;
  orderValue: number;
  items: Array<{ id: string; name: string; quantity: number }>;
  status: 'ASSIGNED' | 'ACCEPTED' | 'ARRIVED_STORE' | 'PICKED_UP' | 'ARRIVED_CUSTOMER' | 'DELIVERED' | 'CANCELLED';
  otpCode: string;
  pincode: string;
  pickupOtpCode: string;
  checkedItems?: string[];
}

interface RiderProfileDocs {
  licenseNumber: string;
  licenseUploaded: boolean;
  rcNumber: string;
  rcUploaded: boolean;
  insuranceUploaded: boolean;
}

interface RiderState {
  isOnline: boolean;
  shiftActive: boolean;
  shiftStartTime: string | null;
  todayEarnings: number;
  currentBalance: number;
  completedCount: number;
  acceptanceRate: number;
  rating: number;
  activeJob: DeliveryJob | null;
  availableJobs: DeliveryJob[];
  payoutHistory: Array<{ id: string; date: string; amount: number; status: 'SUCCESS' | 'PENDING' }>;
  profileDocs: RiderProfileDocs;
  bankAccount: string;
  bankName: string;

  toggleOnline: () => void;
  toggleShift: () => void;
  acceptJob: (jobId: string) => void;
  advanceJobStatus: () => void;
  toggleCheckItem: (itemId: string) => void;
  completeJob: (deliveryOtp: string) => boolean;
  cancelActiveJob: (reason: string) => void;
  uploadDoc: (docType: 'license' | 'rc' | 'insurance') => void;
  updateDocNumbers: (fields: Partial<Pick<RiderProfileDocs, 'licenseNumber' | 'rcNumber'>>) => void;
  updateBank: (bankName: string, account: string) => void;
}

const INITIAL_JOBS: DeliveryJob[] = [
  {
    id: 'DEL-9910',
    storeName: 'Aether Fresh Market',
    storeAddress: '123 Fresh Lane, Koramangala',
    storeCoordinates: { latitude: 12.9348, longitude: 77.6189 },
    customerName: 'Aravind Swamy',
    customerPhone: '9880077112',
    customerAddress: 'Apartment 402, Block B, Raheja Residency, Koramangala',
    customerCoordinates: { latitude: 12.9284, longitude: 77.6245 },
    distanceKm: 1.8,
    estimatedEarnings: 65,
    estTimeMinutes: 12,
    orderValue: 480,
    items: [
      { id: 'i1', name: 'Organic Bananas', quantity: 2 },
      { id: 'i2', name: 'Fresh Strawberries Pack', quantity: 1 }
    ],
    status: 'ASSIGNED',
    otpCode: '8821',
    pincode: '560034',
    pickupOtpCode: '4510',
    checkedItems: []
  },
  {
    id: 'DEL-2234',
    storeName: 'Pharmacy Care Plus',
    storeAddress: '45 Health Ave, HSR Layout',
    storeCoordinates: { latitude: 12.9105, longitude: 77.6450 },
    customerName: 'Pooja Reddy',
    customerPhone: '9988443322',
    customerAddress: 'House 14, 7th Main, Sector 3, HSR Layout',
    customerCoordinates: { latitude: 12.9064, longitude: 77.6482 },
    distanceKm: 3.2,
    estimatedEarnings: 95,
    estTimeMinutes: 18,
    orderValue: 820,
    items: [
      { id: 'i3', name: 'Paracetamol 650mg Table', quantity: 3 },
      { id: 'i4', name: 'N95 Face Masks', quantity: 1 }
    ],
    status: 'ASSIGNED',
    otpCode: '1092',
    pincode: '560102',
    pickupOtpCode: '9931',
    checkedItems: []
  }
];

export const useRiderStore = create<RiderState>()(
  persist(
    (set, get) => ({
      isOnline: false,
      shiftActive: false,
      shiftStartTime: null,
      todayEarnings: 240,
      currentBalance: 870,
      completedCount: 4,
      acceptanceRate: 92,
      rating: 4.85,
      activeJob: null,
      availableJobs: INITIAL_JOBS,
      payoutHistory: [
        { id: 'PAY-7712', date: 'Yesterday, 04:00 PM', amount: 560, status: 'SUCCESS' },
        { id: 'PAY-6651', date: '01 July 2026', amount: 980, status: 'SUCCESS' }
      ],
      profileDocs: {
        licenseNumber: 'KA-51/D-0099881',
        licenseUploaded: true,
        rcNumber: 'KA-51-EH-8822',
        rcUploaded: true,
        insuranceUploaded: true
      },
      bankAccount: '•••• •••• 1022',
      bankName: 'ICICI Bank',

      toggleOnline: () => set((state) => {
        const nextOnline = !state.isOnline;
        return { 
          isOnline: nextOnline,
          // if going offline, stop shift
          shiftActive: nextOnline ? state.shiftActive : false,
          shiftStartTime: nextOnline && state.shiftActive ? state.shiftStartTime : null
        };
      }),

      toggleShift: () => set((state) => {
        const nextShift = !state.shiftActive;
        const nowString = nextShift ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
        return {
          shiftActive: nextShift,
          shiftStartTime: nowString,
          // automatically turn online if shift is starting
          isOnline: nextShift ? true : state.isOnline
        };
      }),

      acceptJob: (jobId) => set((state) => {
        const job = state.availableJobs.find((j) => j.id === jobId);
        if (!job) return {};
        const acceptedJob: DeliveryJob = { ...job, status: 'ACCEPTED', checkedItems: [] };
        return {
          activeJob: acceptedJob,
          availableJobs: state.availableJobs.filter((j) => j.id !== jobId)
        };
      }),

      advanceJobStatus: () => set((state) => {
        const { activeJob } = state;
        if (!activeJob) return {};
        let nextStatus = activeJob.status;

        if (activeJob.status === 'ACCEPTED') nextStatus = 'ARRIVED_STORE';
        else if (activeJob.status === 'ARRIVED_STORE') nextStatus = 'PICKED_UP';
        else if (activeJob.status === 'PICKED_UP') nextStatus = 'ARRIVED_CUSTOMER';

        return {
          activeJob: { ...activeJob, status: nextStatus }
        };
      }),

      toggleCheckItem: (itemId) => set((state) => {
        const { activeJob } = state;
        if (!activeJob) return {};
        const checked = activeJob.checkedItems || [];
        const nextChecked = checked.includes(itemId)
          ? checked.filter((id) => id !== itemId)
          : [...checked, itemId];
        return {
          activeJob: { ...activeJob, checkedItems: nextChecked }
        };
      }),

      completeJob: (deliveryOtp) => {
        const { activeJob, todayEarnings, currentBalance, completedCount } = get();
        if (!activeJob) return false;

        // Verify OTP
        if (deliveryOtp !== activeJob.otpCode) {
          return false;
        }

        set({
          activeJob: null,
          todayEarnings: todayEarnings + activeJob.estimatedEarnings,
          currentBalance: currentBalance + activeJob.estimatedEarnings,
          completedCount: completedCount + 1,
          acceptanceRate: Math.min(100, Math.round((completedCount + 1) / (completedCount + 2) * 100))
        });
        return true;
      },

      cancelActiveJob: (_reason) => set((state) => {
        if (!state.activeJob) return {};
        return {
          activeJob: null
        };
      }),

      uploadDoc: (docType) => set((state) => {
        const key = `${docType}Uploaded` as keyof RiderProfileDocs;
        return {
          profileDocs: { ...state.profileDocs, [key]: true }
        };
      }),

      updateDocNumbers: (fields) => set((state) => ({
        profileDocs: { ...state.profileDocs, ...fields }
      })),

      updateBank: (bankName, account) => set(() => ({
        bankName,
        bankAccount: account
      }))
    }),
    {
      name: 'aether-rider-store-storage',
      partialize: (state) => ({
        isOnline: state.isOnline,
        shiftActive: state.shiftActive,
        shiftStartTime: state.shiftStartTime,
        todayEarnings: state.todayEarnings,
        currentBalance: state.currentBalance,
        completedCount: state.completedCount,
        acceptanceRate: state.acceptanceRate,
        rating: state.rating,
        activeJob: state.activeJob,
        payoutHistory: state.payoutHistory,
        profileDocs: state.profileDocs,
        bankAccount: state.bankAccount,
        bankName: state.bankName
      })
    }
  )
);
