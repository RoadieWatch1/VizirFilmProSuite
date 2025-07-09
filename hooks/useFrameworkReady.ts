import { useEffect } from 'react';

declare global {
  interface Global {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady(): void {
  useEffect(() => {
    const globalRef = globalThis as any;

    if (typeof globalRef.frameworkReady === 'function') {
      try {
        globalRef.frameworkReady();
        console.log('[Framework] frameworkReady() called');
      } catch (err) {
        console.warn('[Framework] Error in frameworkReady():', err);
      }
    } else {
      console.info('[Framework] No global frameworkReady() found');
    }
  }, []);
}
