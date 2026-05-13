'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

interface SystemSettings {
  site_name: string;
  support_email?: string;
  support_phone?: string;
  support_hours?: string;
  [key: string]: any;
}

interface SystemContextType {
  settings: SystemSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: SystemSettings = {
  site_name: 'Flex Market',
};

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get<any>('/landing-content');
      if (res.success && res.data) {
        const siteName = res.data.site_name || 'Flex Market';
        setSettings({
          ...res.data,
          site_name: siteName
        });
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SystemContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
}
