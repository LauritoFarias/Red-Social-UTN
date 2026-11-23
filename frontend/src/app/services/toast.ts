import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  toast = signal<ToastState | null>(null);

  show(message: string, type: ToastType = 'success', durationMs = 3500): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.toast.set({ message, type });
    this.timeoutId = setTimeout(() => {
      this.toast.set(null);
      this.timeoutId = null;
    }, durationMs);
  }

  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.toast.set(null);
  }
}