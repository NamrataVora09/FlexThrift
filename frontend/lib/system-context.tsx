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

interface AppMessage {
  id: number;
  message_key: string;
  message_value: string;
  category: string;
}

interface SystemContextType {
  settings: SystemSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  getMsg: (key: string, fallback: string) => string;
}

const defaultSettings: SystemSettings = {
  site_name: 'Flex Market',
};

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [messages, setMessages] = useState<Record<string, string>>({});
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

        // Store app messages in a lookup map
        if (Array.isArray(res.data.app_messages)) {
          const msgMap: Record<string, string> = {};
          res.data.app_messages.forEach((m: AppMessage) => {
            msgMap[m.message_key] = m.message_value;
          });
          setMessages(msgMap);
        }
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMsg = (key: string, fallback: string) => {
    return messages[key] || fallback;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SystemContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings, getMsg }}>
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
