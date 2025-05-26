import { create } from 'zustand';

interface VerificationState {
  status: 'unverified' | 'basic' | 'advanced' | 'verified';
  progress: number;
  pendingRequirements: string[];
  lastCheck: string | null;
  updateStatus: (status: VerificationState['status']) => void;
  updateProgress: (progress: number) => void;
  setPendingRequirements: (requirements: string[]) => void;
  updateLastCheck: () => void;
}

export const useVerificationStore = create<VerificationState>((set) => ({
  status: 'unverified',
  progress: 0,
  pendingRequirements: [],
  lastCheck: null,
  updateStatus: (status) => set({ status }),
  updateProgress: (progress) => set({ progress }),
  setPendingRequirements: (requirements) => set({ pendingRequirements: requirements }),
  updateLastCheck: () => set({ lastCheck: new Date().toISOString() }),
}));