import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface BrandingSettings {
  id: string;
  platform_name: string;
  tagline: string;
  subtitle: string;
  logo_url: string | null;
  favicon_url: string | null;
  color_primary: string;
  color_primary_dark: string;
  color_secondary: string;
  color_accent: string;
  color_background: string;
  color_card_bg: string;
  color_text_primary: string;
  color_text_secondary: string;
  color_success: string;
  color_warning: string;
  color_error: string;
  color_info: string;
  color_sidebar_bg: string;
  color_sidebar_text: string;
  color_sidebar_active: string;
  font_family: string;
  font_size_base: string;
  button_radius: string;
  button_style: string;
  card_radius: string;
  card_shadow: string;
  card_border: string;
  card_spacing: string;
  opal_display_name: string;
  opal_welcome_message: string;
  opal_color_theme: string;
  opal_avatar_url: string | null;
  opal_intro_heading: string;
  opal_about: string;
  opal_capabilities: Array<{ id: string; title: string; description: string; icon: string }>;
  opal_personality: Record<string, number>;
  opal_communication: Record<string, unknown>;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  id: '',
  platform_name: 'Evolo',
  tagline: 'The People Operating System',
  subtitle: 'Bringing people and organisations together for continuous growth.',
  logo_url: null,
  favicon_url: null,
  color_primary: '#0891b2',
  color_primary_dark: '#0e7490',
  color_secondary: '#64748b',
  color_accent: '#06b6d4',
  color_background: '#f1f5f9',
  color_card_bg: '#ffffff',
  color_text_primary: '#0f172a',
  color_text_secondary: '#64748b',
  color_success: '#16a34a',
  color_warning: '#d97706',
  color_error: '#dc2626',
  color_info: '#2563eb',
  color_sidebar_bg: '#1e293b',
  color_sidebar_text: '#cbd5e1',
  color_sidebar_active: '#0891b2',
  font_family: 'Inter',
  font_size_base: '16px',
  button_radius: '0.5rem',
  button_style: 'filled',
  card_radius: '0.75rem',
  card_shadow: 'sm',
  card_border: 'light',
  card_spacing: 'normal',
  opal_display_name: 'Opal',
  opal_welcome_message: "Hi! I'm Opal, your AI Growth Guide. How can I help you today?",
  opal_color_theme: 'cyan',
  opal_avatar_url: null,
  opal_intro_heading: '',
  opal_about: '',
  opal_capabilities: [],
  opal_personality: {},
  opal_communication: {},
};

interface BrandingContextValue {
  branding: BrandingSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: async () => {},
});

function applyBrandingVars(b: BrandingSettings) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', b.color_primary);
  root.style.setProperty('--brand-primary-dark', b.color_primary_dark);
  root.style.setProperty('--brand-secondary', b.color_secondary);
  root.style.setProperty('--brand-accent', b.color_accent);
  root.style.setProperty('--brand-bg', b.color_background);
  root.style.setProperty('--brand-card-bg', b.color_card_bg);
  root.style.setProperty('--brand-text-primary', b.color_text_primary);
  root.style.setProperty('--brand-text-secondary', b.color_text_secondary);
  root.style.setProperty('--brand-success', b.color_success);
  root.style.setProperty('--brand-warning', b.color_warning);
  root.style.setProperty('--brand-error', b.color_error);
  root.style.setProperty('--brand-info', b.color_info);
  root.style.setProperty('--brand-sidebar-bg', b.color_sidebar_bg);
  root.style.setProperty('--brand-sidebar-text', b.color_sidebar_text);
  root.style.setProperty('--brand-sidebar-active', b.color_sidebar_active);
  root.style.setProperty('--brand-font', b.font_family);
  root.style.setProperty('--brand-font-size', b.font_size_base);
  root.style.setProperty('--brand-btn-radius', b.button_radius);
  root.style.setProperty('--brand-card-radius', b.card_radius);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('organisation_branding')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    const settings = (data as BrandingSettings | null) ?? DEFAULT_BRANDING;
    setBranding(settings);
    applyBrandingVars(settings);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refresh: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
