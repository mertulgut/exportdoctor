import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface LicenseData {
  licenseKey: string | null;
  status: string; // trial | active | expired
  expiresAt: number;
  trialStartedAt: number;
  lastOnlineCheck: number;
}

export function useLicense() {
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await invoke<LicenseData>('get_license_status');
      setLicense(data);

      // If we have a key, try online validation (non-blocking)
      if (data.licenseKey) {
        invoke<LicenseData>('validate_license_online')
          .then(setLicense)
          .catch(() => {}); // Silently fail — offline is OK
      }
    } catch (err) {
      console.error('[License] failed to get status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 5 seconds while waiting for checkout completion
  useEffect(() => {
    if (!checkingOut) return;
    const interval = setInterval(async () => {
      if (license?.licenseKey) {
        try {
          const data = await invoke<LicenseData>('validate_license_online');
          if (data && data.status === 'active') {
            setLicense(data);
            setCheckingOut(false);
          }
        } catch {
          // Keep polling
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [checkingOut, license?.licenseKey]);

  const startCheckout = useCallback(async () => {
    setCheckingOut(true);
    try {
      await invoke<string>('start_checkout');
      await refresh();
    } catch (err) {
      setCheckingOut(false);
      throw err;
    }
  }, [refresh]);

  const activateKey = useCallback(async (key: string) => {
    const data = await invoke<LicenseData>('activate_license', { licenseKey: key });
    setLicense(data);
    return data;
  }, []);

  const manage = useCallback(async () => {
    await invoke('open_manage_portal');
  }, []);

  const deactivate = useCallback(async () => {
    await invoke('deactivate_license');
    await refresh();
  }, [refresh]);

  const cancelCheckout = useCallback(() => {
    setCheckingOut(false);
  }, []);

  return { license, loading, checkingOut, startCheckout, cancelCheckout, activateKey, manage, deactivate, refresh };
}

export function isLicenseValid(license: LicenseData): boolean {
  const now = Math.floor(Date.now() / 1000);
  switch (license.status) {
    case 'trial':
    case 'active':
      return license.expiresAt > now;
    case 'expired':
    default:
      return false;
  }
}

export function daysRemaining(license: LicenseData): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil((license.expiresAt - now) / 86400));
}
