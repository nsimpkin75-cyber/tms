import { useState, useEffect, useCallback } from 'react';
import { Palette, Type, Square, LayoutGrid as Layout, Sparkles, Eye, Save, AlertTriangle, CheckCircle, Monitor, RefreshCw, Upload, X, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding, BrandingSettings, DEFAULT_BRANDING } from '../../contexts/BrandingContext';

// ---------- WCAG contrast helpers ----------

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 1;
  const l1 = relativeLuminance(...c1);
  const l2 = relativeLuminance(...c2);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

function passesAA(fgHex: string, bgHex: string, large = false): boolean {
  const ratio = contrastRatio(fgHex, bgHex);
  return large ? ratio >= 3 : ratio >= 4.5;
}

// ---------- Section tab labels ----------

type Section = 'identity' | 'colours' | 'typography' | 'buttons' | 'cards' | 'opal' | 'preview';

const SECTIONS: Array<{ id: Section; label: string; icon: any }> = [
  { id: 'identity',    label: 'Identity',    icon: Layout },
  { id: 'colours',     label: 'Colours',     icon: Palette },
  { id: 'typography',  label: 'Typography',  icon: Type },
  { id: 'buttons',     label: 'Buttons',     icon: Square },
  { id: 'cards',       label: 'Cards',       icon: Layout },
  { id: 'opal',        label: 'Opal',        icon: Sparkles },
  { id: 'preview',     label: 'Preview',     icon: Eye },
];

// ---------- Small helpers ----------

function ColorField({ label, value, onChange, description }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-500 mb-1.5">{description}</p>}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
        />
        <span
          className="w-8 h-8 rounded border border-slate-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );
}

function ContrastBadge({ fg, bg, label }: { fg: string; bg: string; label: string }) {
  const ratio = contrastRatio(fg, bg);
  const passes = ratio >= 4.5;
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${passes ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {passes ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}: {ratio.toFixed(1)}:1 {passes ? '✓' : '✗ AA fail'}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3 }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ---------- Section panels ----------

function IdentityPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          White labelling for multiple organisations will be added in a future release.
          For now this section controls the platform identity displayed to all users.
        </p>
      </div>
      <TextField label="Platform Name" value={draft.platform_name} onChange={v => update('platform_name', v)} placeholder="Evolo" />
      <TextField label="Tagline" value={draft.tagline} onChange={v => update('tagline', v)} placeholder="The People Operating System" />
      <TextareaField label="Subtitle" value={draft.subtitle} onChange={v => update('subtitle', v)} />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Logo URL" value={draft.logo_url ?? ''} onChange={v => update('logo_url', v || null)} placeholder="https://…" />
        <TextField label="Favicon URL" value={draft.favicon_url ?? ''} onChange={v => update('favicon_url', v || null)} placeholder="https://…" />
      </div>
      {(draft.logo_url || draft.favicon_url) && (
        <div className="flex gap-4">
          {draft.logo_url && (
            <div className="border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-2">Logo Preview</p>
              <img src={draft.logo_url} alt="logo" className="h-12 object-contain mx-auto" />
            </div>
          )}
          {draft.favicon_url && (
            <div className="border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 mb-2">Favicon Preview</p>
              <img src={draft.favicon_url} alt="favicon" className="h-8 w-8 object-contain mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColoursPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  const checks: Array<{ fg: keyof BrandingSettings; bg: keyof BrandingSettings; label: string }> = [
    { fg: 'color_text_primary',   bg: 'color_card_bg',   label: 'Body on Card' },
    { fg: 'color_text_primary',   bg: 'color_background', label: 'Body on BG' },
    { fg: 'color_text_secondary', bg: 'color_card_bg',   label: 'Secondary on Card' },
    { fg: 'color_card_bg',        bg: 'color_primary',   label: 'Text on Primary' },
    { fg: 'color_sidebar_text',   bg: 'color_sidebar_bg', label: 'Sidebar text' },
  ];
  const failures = checks.filter(c => !passesAA(draft[c.fg] as string, draft[c.bg] as string));

  return (
    <div className="space-y-6">
      {failures.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Accessibility Warning</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {failures.length} colour combination{failures.length > 1 ? 's' : ''} fail WCAG 2.2 AA contrast (4.5:1 required).
              You can still save, but inaccessible combinations are not recommended.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {checks.map(c => (
          <ContrastBadge
            key={c.label}
            fg={draft[c.fg] as string}
            bg={draft[c.bg] as string}
            label={c.label}
          />
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Brand Colours</h3>
        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Primary" value={draft.color_primary} onChange={v => update('color_primary', v)} description="Buttons, links, highlights" />
          <ColorField label="Primary Dark" value={draft.color_primary_dark} onChange={v => update('color_primary_dark', v)} description="Hover states for primary" />
          <ColorField label="Secondary" value={draft.color_secondary} onChange={v => update('color_secondary', v)} description="Secondary actions" />
          <ColorField label="Accent" value={draft.color_accent} onChange={v => update('color_accent', v)} description="Highlights and badges" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Layout Colours</h3>
        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Background" value={draft.color_background} onChange={v => update('color_background', v)} description="Page background" />
          <ColorField label="Card Background" value={draft.color_card_bg} onChange={v => update('color_card_bg', v)} description="Cards and panels" />
          <ColorField label="Primary Text" value={draft.color_text_primary} onChange={v => update('color_text_primary', v)} description="Headings and body" />
          <ColorField label="Secondary Text" value={draft.color_text_secondary} onChange={v => update('color_text_secondary', v)} description="Subtext and labels" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Status Colours</h3>
        <div className="grid grid-cols-2 gap-4">
          <ColorField label="Success" value={draft.color_success} onChange={v => update('color_success', v)} />
          <ColorField label="Warning" value={draft.color_warning} onChange={v => update('color_warning', v)} />
          <ColorField label="Error" value={draft.color_error} onChange={v => update('color_error', v)} />
          <ColorField label="Information" value={draft.color_info} onChange={v => update('color_info', v)} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Navigation Colours</h3>
        <div className="grid grid-cols-3 gap-4">
          <ColorField label="Sidebar Background" value={draft.color_sidebar_bg} onChange={v => update('color_sidebar_bg', v)} />
          <ColorField label="Sidebar Text" value={draft.color_sidebar_text} onChange={v => update('color_sidebar_text', v)} />
          <ColorField label="Active Item" value={draft.color_sidebar_active} onChange={v => update('color_sidebar_active', v)} />
        </div>
      </div>
    </div>
  );
}

function TypographyPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  const fonts = [
    { value: 'Inter', label: 'Inter (Default)' },
    { value: 'system-ui', label: 'System UI' },
    { value: 'Georgia', label: 'Georgia (Serif)' },
    { value: 'OpenDyslexic', label: 'OpenDyslexic (Accessibility)' },
  ];
  const sizes = [
    { value: '14px', label: '14px — Compact' },
    { value: '15px', label: '15px — Slightly compact' },
    { value: '16px', label: '16px — Default' },
    { value: '17px', label: '17px — Slightly large' },
    { value: '18px', label: '18px — Large' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Font selection applies globally. Custom Google Fonts will be supported in a future release.
          Lucide React icons are used consistently throughout the platform — no mixed icon sets.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Default Font" value={draft.font_family} onChange={v => update('font_family', v)} options={fonts} />
        <SelectField label="Base Font Size" value={draft.font_size_base} onChange={v => update('font_size_base', v)} options={sizes} />
      </div>
      <div className="border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Typography Preview</p>
        <div style={{ fontFamily: draft.font_family, fontSize: draft.font_size_base }}>
          <h1 style={{ fontSize: '2em', fontWeight: 700, lineHeight: 1.2, color: draft.color_text_primary }}>Page Title</h1>
          <h2 style={{ fontSize: '1.5em', fontWeight: 600, lineHeight: 1.2, color: draft.color_text_primary, marginTop: '0.5rem' }}>Section Heading</h2>
          <h3 style={{ fontSize: '1.25em', fontWeight: 600, lineHeight: 1.2, color: draft.color_text_primary, marginTop: '0.5rem' }}>Card Title</h3>
          <p style={{ lineHeight: 1.6, color: draft.color_text_primary, marginTop: '0.75rem' }}>
            Body text: Evolo brings people and organisations together for continuous growth.
            Clear, readable typography ensures everyone can engage with their performance journey.
          </p>
          <p style={{ lineHeight: 1.5, color: draft.color_text_secondary, fontSize: '0.875em', marginTop: '0.5rem' }}>
            Secondary text: Subtitles, labels and supporting information appear in a lighter weight.
          </p>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: draft.color_primary, color: draft.color_card_bg,
              padding: '0.375rem 1rem', borderRadius: draft.button_radius, fontWeight: 500, fontSize: '0.875em',
            }}>Primary Button</span>
            <span style={{
              backgroundColor: 'transparent', color: draft.color_primary,
              border: `1px solid ${draft.color_primary}`,
              padding: '0.375rem 1rem', borderRadius: draft.button_radius, fontWeight: 500, fontSize: '0.875em',
            }}>Secondary Button</span>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.875em', color: draft.color_text_secondary }}>
            Table cell / Navigation item
          </div>
        </div>
      </div>
    </div>
  );
}

function ButtonsPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  const radii = [
    { value: '0', label: 'None (Square)' },
    { value: '0.25rem', label: 'Small (2px)' },
    { value: '0.375rem', label: 'Medium (6px)' },
    { value: '0.5rem', label: 'Default (8px)' },
    { value: '0.75rem', label: 'Large (12px)' },
    { value: '9999px', label: 'Pill (Fully rounded)' },
  ];
  const styles = [
    { value: 'filled', label: 'Filled' },
    { value: 'outlined', label: 'Outlined' },
    { value: 'soft', label: 'Soft (tinted background)' },
  ];
  const r = draft.button_radius;
  const p = draft.color_primary;
  const bg = draft.color_card_bg;
  const textP = draft.color_text_primary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Button Radius" value={draft.button_radius} onChange={v => update('button_radius', v)} options={radii} />
        <SelectField label="Button Style" value={draft.button_style} onChange={v => update('button_style', v)} options={styles} />
      </div>

      <div className="border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Button Preview</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, border: 'none', cursor: 'default' }}>
            Primary
          </button>
          <button style={{ backgroundColor: 'transparent', color: p, border: `2px solid ${p}`, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, cursor: 'default' }}>
            Secondary
          </button>
          <button style={{ backgroundColor: '#f1f5f9', color: textP, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, border: 'none', cursor: 'default' }}>
            Neutral
          </button>
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, border: 'none', cursor: 'default', opacity: 0.4 }}>
            Disabled
          </button>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, border: 'none', cursor: 'default', outline: `3px solid ${p}`, outlineOffset: '2px' }}>
            Focus State
          </button>
          <span className="text-xs text-slate-500">Focus rings remain visible for keyboard users</span>
        </div>
      </div>
    </div>
  );
}

function CardsPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  const radii = [
    { value: '0', label: 'None' },
    { value: '0.25rem', label: 'Small' },
    { value: '0.5rem', label: 'Medium' },
    { value: '0.75rem', label: 'Default (12px)' },
    { value: '1rem', label: 'Large (16px)' },
    { value: '1.5rem', label: 'Extra Large (24px)' },
  ];
  const shadows = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'Subtle (Default)' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Strong' },
  ];
  const borders = [
    { value: 'none', label: 'None' },
    { value: 'light', label: 'Light (Default)' },
    { value: 'medium', label: 'Medium' },
    { value: 'strong', label: 'Strong' },
  ];
  const spacings = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal (Default)' },
    { value: 'relaxed', label: 'Relaxed' },
  ];

  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.16)',
  };
  const borderMap: Record<string, string> = {
    none: 'none',
    light: '1px solid #e2e8f0',
    medium: '1.5px solid #cbd5e1',
    strong: '2px solid #94a3b8',
  };
  const paddingMap: Record<string, string> = {
    compact: '0.75rem',
    normal: '1.25rem',
    relaxed: '1.75rem',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Corner Radius" value={draft.card_radius} onChange={v => update('card_radius', v)} options={radii} />
        <SelectField label="Shadow Style" value={draft.card_shadow} onChange={v => update('card_shadow', v)} options={shadows} />
        <SelectField label="Border Style" value={draft.card_border} onChange={v => update('card_border', v)} options={borders} />
        <SelectField label="Spacing" value={draft.card_spacing} onChange={v => update('card_spacing', v)} options={spacings} />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Card Preview</p>
        <div className="grid grid-cols-2 gap-4">
          {['Example Card', 'Another Card'].map(title => (
            <div
              key={title}
              style={{
                backgroundColor: draft.color_card_bg,
                borderRadius: draft.card_radius,
                boxShadow: shadowMap[draft.card_shadow] ?? shadowMap.sm,
                border: borderMap[draft.card_border] ?? borderMap.light,
                padding: paddingMap[draft.card_spacing] ?? paddingMap.normal,
              }}
            >
              <h4 style={{ fontWeight: 600, color: draft.color_text_primary, marginBottom: '0.25rem' }}>{title}</h4>
              <p style={{ fontSize: '0.875rem', color: draft.color_text_secondary, lineHeight: 1.5 }}>
                Card content appears here. Spacing, radius and shadow are all configurable.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <button style={{
                  backgroundColor: draft.color_primary, color: draft.color_card_bg,
                  borderRadius: draft.button_radius, padding: '0.375rem 0.875rem',
                  fontWeight: 500, fontSize: '0.8125rem', border: 'none', cursor: 'default',
                }}>Action</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpalPanel({ draft, update }: { draft: BrandingSettings; update: (k: keyof BrandingSettings, v: any) => void }) {
  const colorThemes = [
    { value: 'cyan', label: 'Cyan (Default)' },
    { value: 'blue', label: 'Blue' },
    { value: 'teal', label: 'Teal' },
    { value: 'emerald', label: 'Emerald' },
    { value: 'violet', label: 'Violet' },
  ];
  const themeGradients: Record<string, string> = {
    cyan: 'linear-gradient(135deg, #0891b2, #0e7490)',
    blue: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    teal: 'linear-gradient(135deg, #0d9488, #0f766e)',
    emerald: 'linear-gradient(135deg, #10b981, #059669)',
    violet: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  };

  return (
    <div className="space-y-6">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 flex gap-3">
        <Sparkles className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-cyan-800">
          Voice functionality and advanced avatar customisation will be available in a future release.
          Configure Opal's identity and appearance here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Display Name" value={draft.opal_display_name} onChange={v => update('opal_display_name', v)} placeholder="Opal" />
        <SelectField label="Colour Theme" value={draft.opal_color_theme} onChange={v => update('opal_color_theme', v)} options={colorThemes} />
      </div>
      <TextareaField label="Welcome Message" value={draft.opal_welcome_message} onChange={v => update('opal_welcome_message', v)} rows={3} />
      <TextField label="Avatar URL" value={draft.opal_avatar_url ?? ''} onChange={v => update('opal_avatar_url', v || null)} placeholder="https://… (leave blank for default)" />

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Opal Preview</p>
        <div className="max-w-sm">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: themeGradients[draft.opal_color_theme] ?? themeGradients.cyan }}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                {draft.opal_avatar_url ? (
                  <img src={draft.opal_avatar_url} alt={draft.opal_display_name} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{draft.opal_display_name || 'Opal'}</p>
                <p className="text-white/70 text-xs">AI Growth Guide</p>
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm text-slate-700 leading-relaxed">{draft.opal_welcome_message || 'Hello!'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePreview({ draft }: { draft: BrandingSettings }) {
  const shadowMap: Record<string, string> = {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.16)',
  };
  const borderMap: Record<string, string> = {
    none: 'none',
    light: '1px solid #e2e8f0',
    medium: '1.5px solid #cbd5e1',
    strong: '2px solid #94a3b8',
  };

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
      <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b border-slate-200">
        <Monitor className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-500 font-medium">Live Preview</span>
      </div>
      <div className="flex" style={{ backgroundColor: draft.color_background, minHeight: '480px', fontFamily: draft.font_family }}>
        {/* Sidebar */}
        <div className="w-44 flex flex-col flex-shrink-0" style={{ backgroundColor: draft.color_sidebar_bg }}>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: draft.color_primary }}>
                {(draft.platform_name || 'EV').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold text-xs truncate">{draft.platform_name}</p>
                <p className="text-xs truncate" style={{ color: draft.color_sidebar_text, opacity: 0.7, fontSize: '0.6rem' }}>{draft.tagline}</p>
              </div>
            </div>
          </div>
          <nav className="p-2 flex-1">
            {['Dashboard', 'Reviews', 'Career', 'Training', 'Opal'].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs mb-0.5"
                style={{
                  backgroundColor: i === 0 ? draft.color_sidebar_active : 'transparent',
                  color: i === 0 ? '#ffffff' : draft.color_sidebar_text,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                {item}
              </div>
            ))}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="mb-4">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: draft.color_text_primary, lineHeight: 1.2 }}>Dashboard</h1>
            <p style={{ fontSize: '0.8rem', color: draft.color_text_secondary, marginTop: '0.125rem' }}>Welcome back</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Reviews Due', value: '3', color: draft.color_info },
              { label: 'Team Members', value: '12', color: draft.color_success },
              { label: 'Action Items', value: '5', color: draft.color_warning },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  backgroundColor: draft.color_card_bg,
                  borderRadius: draft.card_radius,
                  boxShadow: shadowMap[draft.card_shadow],
                  border: borderMap[draft.card_border],
                  padding: '0.75rem',
                }}
              >
                <p style={{ fontSize: '0.65rem', color: draft.color_text_secondary }}>{stat.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div style={{
            backgroundColor: draft.color_card_bg,
            borderRadius: draft.card_radius,
            boxShadow: shadowMap[draft.card_shadow],
            border: borderMap[draft.card_border],
            padding: '0.875rem',
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: draft.color_text_primary, marginBottom: '0.5rem' }}>Recent Activity</h3>
            {['Sarah completed her review', 'James updated career plan', 'New training available'].map(item => (
              <div key={item} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: draft.color_primary }} />
                <p style={{ fontSize: '0.72rem', color: draft.color_text_secondary }}>{item}</p>
              </div>
            ))}
            <div className="mt-3">
              <button style={{
                backgroundColor: draft.color_primary, color: draft.color_card_bg,
                borderRadius: draft.button_radius, padding: '0.3rem 0.75rem',
                fontWeight: 500, fontSize: '0.72rem', border: 'none', cursor: 'default',
              }}>View All</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function BrandingCentre() {
  const { profile } = useAuth();
  const { branding, refresh } = useBranding();
  const [activeSection, setActiveSection] = useState<Section>('identity');
  const [draft, setDraft] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => {
    setDraft({ ...branding });
    setHasUnsaved(false);
  }, [branding]);

  const update = useCallback((key: keyof BrandingSettings, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setHasUnsaved(true);
    setSaved(false);
  }, []);

  function resetToDefaults() {
    setDraft({ ...branding });
    setHasUnsaved(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    const payload = {
      platform_name: draft.platform_name,
      tagline: draft.tagline,
      subtitle: draft.subtitle,
      logo_url: draft.logo_url,
      favicon_url: draft.favicon_url,
      color_primary: draft.color_primary,
      color_primary_dark: draft.color_primary_dark,
      color_secondary: draft.color_secondary,
      color_accent: draft.color_accent,
      color_background: draft.color_background,
      color_card_bg: draft.color_card_bg,
      color_text_primary: draft.color_text_primary,
      color_text_secondary: draft.color_text_secondary,
      color_success: draft.color_success,
      color_warning: draft.color_warning,
      color_error: draft.color_error,
      color_info: draft.color_info,
      color_sidebar_bg: draft.color_sidebar_bg,
      color_sidebar_text: draft.color_sidebar_text,
      color_sidebar_active: draft.color_sidebar_active,
      font_family: draft.font_family,
      font_size_base: draft.font_size_base,
      button_radius: draft.button_radius,
      button_style: draft.button_style,
      card_radius: draft.card_radius,
      card_shadow: draft.card_shadow,
      card_border: draft.card_border,
      card_spacing: draft.card_spacing,
      opal_display_name: draft.opal_display_name,
      opal_welcome_message: draft.opal_welcome_message,
      opal_color_theme: draft.opal_color_theme,
      opal_avatar_url: draft.opal_avatar_url,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (branding.id) {
      await supabase.from('organisation_branding').update(payload).eq('id', branding.id);
    } else {
      await supabase.from('organisation_branding').insert([{ ...payload, created_by: profile.id, is_active: true }]);
    }

    await refresh();
    setSaving(false);
    setSaved(true);
    setHasUnsaved(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const activeIndex = SECTIONS.findIndex(s => s.id === activeSection);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Branding Centre</h2>
          <p className="text-slate-500 text-sm mt-0.5">Centralise platform branding, colours, typography and Opal's identity.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasUnsaved && (
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Discard
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !hasUnsaved}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {hasUnsaved && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          You have unsaved changes. Save to apply them across the platform.
        </div>
      )}

      <div className="flex gap-6">
        {/* Section nav */}
        <aside className="w-44 flex-shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeSection === s.id
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Panel */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 p-6">
          {activeSection === 'identity'   && <IdentityPanel   draft={draft} update={update} />}
          {activeSection === 'colours'    && <ColoursPanel    draft={draft} update={update} />}
          {activeSection === 'typography' && <TypographyPanel draft={draft} update={update} />}
          {activeSection === 'buttons'    && <ButtonsPanel    draft={draft} update={update} />}
          {activeSection === 'cards'      && <CardsPanel      draft={draft} update={update} />}
          {activeSection === 'opal'       && <OpalPanel       draft={draft} update={update} />}
          {activeSection === 'preview'    && <LivePreview     draft={draft} />}
        </div>
      </div>
    </div>
  );
}
