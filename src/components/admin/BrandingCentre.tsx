import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, AlertTriangle, CheckCircle, RefreshCw, Upload, X,
  Info, Image as ImageIcon, Loader2, Monitor, Sparkles, Wand2,
  Eye, EyeOff,
} from 'lucide-react';
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
  return [r, g, b].reduce((acc, v, i) => {
    const s = v / 255;
    const c = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return acc + c * [0.2126, 0.7152, 0.0722][i];
  }, 0);
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

function passesAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}

// Suggest a higher-contrast foreground by nudging toward black or white
function suggestFix(fgHex: string, bgHex: string): string {
  const bg = hexToRgb(bgHex);
  if (!bg) return fgHex;
  const bgL = relativeLuminance(...bg);
  return bgL > 0.5 ? '#1e293b' : '#f8fafc';
}

// ---------- Google Fonts loading ----------

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', google: 'Inter:wght@300;400;500;600;700' },
  { value: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible', google: 'Atkinson+Hyperlegible:wght@400;700' },
  { value: 'Source Sans 3', label: 'Source Sans 3', google: 'Source+Sans+3:wght@300;400;500;600;700' },
  { value: 'IBM Plex Sans', label: 'IBM Plex Sans', google: 'IBM+Plex+Sans:wght@300;400;500;600;700' },
  { value: 'system-ui', label: 'System UI (no download)', google: null },
  { value: 'OpenDyslexic', label: 'OpenDyslexic (Accessibility)', google: null },
];

const loadedFonts = new Set<string>();

function ensureFontLoaded(fontFamily: string) {
  if (loadedFonts.has(fontFamily)) return;
  const opt = FONT_OPTIONS.find(f => f.value === fontFamily);
  if (!opt?.google) return;
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) { loadedFonts.add(fontFamily); return; }
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontFamily);
}

// ---------- Storage helpers ----------

const BUCKET = 'branding';

async function uploadBrandingImage(file: File, storagePath: string): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// ---------- Shared field components ----------

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-1.5">{hint}</p>}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
      />
    </div>
  );
}

function TextareaField({ label, value, onChange, rows = 3, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-1.5">{hint}</p>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all resize-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-1.5">{hint}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
      <div className="flex items-center gap-2.5">
        <label className="relative cursor-pointer flex-shrink-0">
          <span
            className="w-10 h-10 rounded-xl border-2 border-white shadow-md ring-1 ring-slate-200 block transition-transform hover:scale-105"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-xs text-slate-400 font-mono">#</span>
          <input
            type="text"
            value={value.replace('#', '')}
            onChange={e => {
              const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
              onChange(`#${v}`);
            }}
            className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none uppercase"
            placeholder="000000"
            maxLength={6}
          />
        </div>
      </div>
    </div>
  );
}

function ImageUpload({
  label,
  description,
  value,
  storagePath,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
  previewSize = 'md',
  onChange,
  onPersist,
}: {
  label: string;
  description?: string;
  value: string | null;
  storagePath: string;
  accept?: string;
  previewSize?: 'sm' | 'md' | 'lg';
  onChange: (url: string | null) => void;
  onPersist?: (url: string | null) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewDim = previewSize === 'sm' ? 'w-12 h-12' : previewSize === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadBrandingImage(file, storagePath);
      onChange(url);
      if (onPersist) await onPersist(url);
    } catch (err: any) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    onChange(null);
    if (onPersist) await onPersist(null);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {description && <p className="text-xs text-slate-500 mb-3">{description}</p>}
      <div className="flex items-start gap-4">
        <div
          className={`${previewDim} rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 group relative`}
        >
          {value ? (
            <>
              <img src={value} alt={label} className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-300" />
          )}
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> {value ? 'Replace image' : 'Upload image'}</>
            )}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

// ---------- Identity Section ----------

function IdentitySection({ draft, update, persistField }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
  persistField: (k: keyof BrandingSettings, v: any) => Promise<void>;
}) {
  return (
    <SectionCard title="Platform Identity" description="Name, tagline and brand imagery displayed throughout the platform.">
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            White labelling for multiple organisations will be added in a future release.
            These settings apply globally across the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextField
            label="Platform Name"
            value={draft.platform_name}
            onChange={v => update('platform_name', v)}
            placeholder="Evolo"
          />
          <TextField
            label="Tagline"
            value={draft.tagline}
            onChange={v => update('tagline', v)}
            placeholder="The People Operating System"
          />
        </div>

        <TextareaField
          label="Subtitle"
          value={draft.subtitle}
          onChange={v => update('subtitle', v)}
          rows={2}
          hint="Shown on the login screen beneath the tagline."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
          <ImageUpload
            label="Platform Logo"
            description="Shown in the sidebar header. PNG, SVG or WebP recommended."
            value={draft.logo_url}
            storagePath="logo/logo"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            previewSize="lg"
            onChange={url => update('logo_url', url)}
            onPersist={url => persistField('logo_url', url)}
          />
          <ImageUpload
            label="Favicon"
            description="Shown in browser tabs. 32×32 or 64×64 PNG recommended."
            value={draft.favicon_url}
            storagePath="favicon/favicon"
            accept="image/png,image/x-icon,image/vnd.microsoft.icon"
            previewSize="sm"
            onChange={url => update('favicon_url', url)}
            onPersist={url => persistField('favicon_url', url)}
          />
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- Colours Section ----------

interface ContrastCheck {
  id: string;
  label: string;
  fgKey: keyof BrandingSettings;
  bgKey: keyof BrandingSettings;
  fgLabel: string;
  bgLabel: string;
}

const CONTRAST_CHECKS: ContrastCheck[] = [
  { id: 'body-card',     label: 'Body text on card',       fgKey: 'color_text_primary',   bgKey: 'color_card_bg',    fgLabel: 'Primary text',   bgLabel: 'Card background' },
  { id: 'body-bg',       label: 'Body text on background', fgKey: 'color_text_primary',   bgKey: 'color_background', fgLabel: 'Primary text',   bgLabel: 'Page background' },
  { id: 'secondary-card',label: 'Secondary text on card',  fgKey: 'color_text_secondary', bgKey: 'color_card_bg',    fgLabel: 'Secondary text', bgLabel: 'Card background' },
  { id: 'text-primary',  label: 'Text on primary button',  fgKey: 'color_card_bg',        bgKey: 'color_primary',    fgLabel: 'Card bg',        bgLabel: 'Primary colour' },
  { id: 'sidebar',       label: 'Sidebar navigation text', fgKey: 'color_sidebar_text',   bgKey: 'color_sidebar_bg', fgLabel: 'Sidebar text',   bgLabel: 'Sidebar bg' },
  { id: 'sidebar-active',label: 'Active nav on sidebar',   fgKey: 'color_card_bg',        bgKey: 'color_sidebar_active', fgLabel: 'White',      bgLabel: 'Active colour' },
];

function AccessibilityRow({ check, draft, onFix }: {
  check: ContrastCheck;
  draft: BrandingSettings;
  onFix: (fgKey: keyof BrandingSettings, value: string) => void;
}) {
  const fg = draft[check.fgKey] as string;
  const bg = draft[check.bgKey] as string;
  const ratio = contrastRatio(fg, bg);
  const passes = ratio >= 4.5;
  const fix = suggestFix(fg, bg);

  return (
    <div className={`rounded-xl border p-4 ${passes ? 'border-slate-100 bg-slate-50/50' : 'border-red-100 bg-red-50/50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {passes ? (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-slate-800">{check.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              passes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {ratio.toFixed(1)}:1 {passes ? 'AA pass' : 'AA fail'}
            </span>
          </div>
          {!passes && (
            <p className="text-xs text-red-600 mb-3 ml-6">
              WCAG 2.2 AA requires 4.5:1 for normal text. This combination may be hard to read for users with visual impairments.
            </p>
          )}
          <div className="flex items-center gap-3 ml-6">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded border border-slate-200 shadow-sm flex-shrink-0"
                style={{ backgroundColor: fg }}
              />
              <span className="text-xs text-slate-500">{check.fgLabel}</span>
            </div>
            <span className="text-slate-300 text-xs">on</span>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded border border-slate-200 shadow-sm flex-shrink-0"
                style={{ backgroundColor: bg }}
              />
              <span className="text-xs text-slate-500">{check.bgLabel}</span>
            </div>
            <div
              className="flex items-center justify-center px-3 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: bg, color: fg, border: '1px solid #e2e8f0' }}
            >
              Preview
            </div>
          </div>
        </div>
        {!passes && (
          <div className="flex-shrink-0 text-right space-y-1.5">
            <p className="text-xs text-slate-500 mb-1">Auto-fix suggestion</p>
            <div className="flex items-center gap-2 justify-end">
              <span
                className="w-5 h-5 rounded border border-slate-200"
                style={{ backgroundColor: fix }}
              />
              <span className="text-xs font-mono text-slate-600">{fix}</span>
            </div>
            <button
              type="button"
              onClick={() => onFix(check.fgKey, fix)}
              className="flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Wand2 className="w-3 h-3" /> Apply fix
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ColoursSection({ draft, update }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
}) {
  const failCount = CONTRAST_CHECKS.filter(c => !passesAA(draft[c.fgKey] as string, draft[c.bgKey] as string)).length;

  return (
    <div className="space-y-5">
      <SectionCard title="Brand Colours" description="Primary, secondary, and accent colours used for buttons, links, and highlights.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <ColorField label="Primary" value={draft.color_primary} onChange={v => update('color_primary', v)} hint="Buttons, links" />
          <ColorField label="Primary Dark" value={draft.color_primary_dark} onChange={v => update('color_primary_dark', v)} hint="Hover states" />
          <ColorField label="Secondary" value={draft.color_secondary} onChange={v => update('color_secondary', v)} hint="Secondary actions" />
          <ColorField label="Accent" value={draft.color_accent} onChange={v => update('color_accent', v)} hint="Badges, highlights" />
        </div>
      </SectionCard>

      <SectionCard title="Layout Colours" description="Background and text colours for pages, cards, and content.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <ColorField label="Page Background" value={draft.color_background} onChange={v => update('color_background', v)} />
          <ColorField label="Card Background" value={draft.color_card_bg} onChange={v => update('color_card_bg', v)} />
          <ColorField label="Primary Text" value={draft.color_text_primary} onChange={v => update('color_text_primary', v)} />
          <ColorField label="Secondary Text" value={draft.color_text_secondary} onChange={v => update('color_text_secondary', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Status Colours" description="Semantic colours for success, warning, error, and information states.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <ColorField label="Success" value={draft.color_success} onChange={v => update('color_success', v)} />
          <ColorField label="Warning" value={draft.color_warning} onChange={v => update('color_warning', v)} />
          <ColorField label="Error" value={draft.color_error} onChange={v => update('color_error', v)} />
          <ColorField label="Information" value={draft.color_info} onChange={v => update('color_info', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Navigation Colours" description="Sidebar background, text, and active state colours.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <ColorField label="Sidebar Background" value={draft.color_sidebar_bg} onChange={v => update('color_sidebar_bg', v)} />
          <ColorField label="Sidebar Text" value={draft.color_sidebar_text} onChange={v => update('color_sidebar_text', v)} />
          <ColorField label="Active Item" value={draft.color_sidebar_active} onChange={v => update('color_sidebar_active', v)} />
        </div>
      </SectionCard>

      <SectionCard
        title="Accessibility"
        description={failCount > 0
          ? `${failCount} colour combination${failCount > 1 ? 's' : ''} fail WCAG 2.2 AA contrast (4.5:1 required for normal text).`
          : 'All colour combinations pass WCAG 2.2 AA contrast requirements.'
        }
      >
        {failCount > 0 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Users with low vision or colour blindness may struggle to read failing combinations.
              Use the auto-fix buttons below to apply higher-contrast alternatives, or adjust colours manually above.
            </p>
          </div>
        )}
        <div className="space-y-3">
          {CONTRAST_CHECKS.map(check => (
            <AccessibilityRow
              key={check.id}
              check={check}
              draft={draft}
              onFix={(fgKey, value) => update(fgKey, value)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ---------- Typography Section ----------

const FONT_SIZE_OPTIONS = [
  { value: '14px', label: '14px — Compact' },
  { value: '15px', label: '15px — Slightly compact' },
  { value: '16px', label: '16px — Default' },
  { value: '17px', label: '17px — Slightly large' },
  { value: '18px', label: '18px — Large' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Regular (400)' },
  { value: '500', label: 'Medium (500)' },
];

function TypographySection({ draft, update }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
}) {
  useEffect(() => {
    ensureFontLoaded(draft.font_family);
  }, [draft.font_family]);

  const fontOpts = FONT_OPTIONS.map(f => ({ value: f.value, label: f.label }));

  return (
    <div className="space-y-5">
      <SectionCard title="Font Family" description="The typeface applied globally across the platform.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <SelectField
            label="Default Font"
            value={draft.font_family}
            onChange={v => { update('font_family', v); ensureFontLoaded(v); }}
            options={fontOpts}
          />
          <SelectField
            label="Base Font Size"
            value={draft.font_size_base}
            onChange={v => update('font_size_base', v)}
            options={FONT_SIZE_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {FONT_OPTIONS.filter(f => f.value !== 'system-ui' && f.value !== 'OpenDyslexic').map(f => {
            const selected = draft.font_family === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => { update('font_family', f.value); ensureFontLoaded(f.value); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selected ? 'border-cyan-500 bg-cyan-50' : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <p
                  className="text-lg font-semibold mb-0.5"
                  style={{ fontFamily: f.value, color: draft.color_text_primary }}
                >
                  Aa
                </p>
                <p className="text-xs text-slate-500 font-sans">{f.label}</p>
                {selected && <p className="text-xs text-cyan-600 mt-1 font-sans">Selected</p>}
              </button>
            );
          })}
        </div>

        <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Typography Scale Preview</p>
          <div style={{ fontFamily: draft.font_family, fontSize: draft.font_size_base }}>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 font-sans mr-3">Page title</span>
                <span style={{ fontSize: '1.875em', fontWeight: 700, lineHeight: 1.2, color: draft.color_text_primary }}>
                  Performance Review
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-sans mr-3">Section heading</span>
                <span style={{ fontSize: '1.25em', fontWeight: 600, lineHeight: 1.3, color: draft.color_text_primary }}>
                  Career Development
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-sans mr-3">Card title</span>
                <span style={{ fontSize: '1em', fontWeight: 600, color: draft.color_text_primary }}>
                  Quarterly Goals
                </span>
              </div>
              <div style={{ lineHeight: 1.6, color: draft.color_text_primary }}>
                <span className="text-xs text-slate-400 font-sans mr-3">Body</span>
                <span>
                  Continuous growth requires clarity, structure and the right tools for every team member.
                </span>
              </div>
              <div style={{ fontSize: '0.875em', lineHeight: 1.5, color: draft.color_text_secondary }}>
                <span className="text-xs text-slate-400 font-sans mr-3">Caption</span>
                <span>Last updated 2 days ago · 3 action items pending</span>
              </div>
              <div className="flex gap-3 pt-1 flex-wrap">
                <button
                  style={{
                    fontFamily: draft.font_family,
                    backgroundColor: draft.color_primary,
                    color: draft.color_card_bg,
                    borderRadius: draft.button_radius,
                    padding: '0.45em 1.1em',
                    fontWeight: 500,
                    fontSize: '0.875em',
                    border: 'none',
                    cursor: 'default',
                  }}
                >
                  Save Changes
                </button>
                <button
                  style={{
                    fontFamily: draft.font_family,
                    backgroundColor: 'transparent',
                    color: draft.color_primary,
                    border: `1.5px solid ${draft.color_primary}`,
                    borderRadius: draft.button_radius,
                    padding: '0.45em 1.1em',
                    fontWeight: 500,
                    fontSize: '0.875em',
                    cursor: 'default',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Element Styles" description="Configure typography for specific interface elements.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SelectField
            label="Heading Font Weight"
            value="700"
            onChange={() => {}}
            options={[{ value: '700', label: 'Bold (700)' }, { value: '600', label: 'Semi-bold (600)' }]}
            hint="Applied to page titles and section headings."
          />
          <SelectField
            label="Body Font Weight"
            value={FONT_WEIGHT_OPTIONS[1].value}
            onChange={() => {}}
            options={FONT_WEIGHT_OPTIONS}
            hint="Applied to paragraphs and form labels."
          />
          <SelectField
            label="Navigation Font Weight"
            value="500"
            onChange={() => {}}
            options={FONT_WEIGHT_OPTIONS.filter(o => o.value !== '300')}
            hint="Applied to sidebar and tab navigation items."
          />
          <SelectField
            label="Button Font Weight"
            value="500"
            onChange={() => {}}
            options={FONT_WEIGHT_OPTIONS.filter(o => o.value !== '300')}
            hint="Applied to all button labels."
          />
        </div>
        <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Per-element font weight is stored and will be applied in an upcoming release.
        </p>
      </SectionCard>
    </div>
  );
}

// ---------- Buttons & Cards Section ----------

function ButtonsSection({ draft, update }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
}) {
  const RADIUS_OPTIONS = [
    { value: '0', label: 'Square' },
    { value: '0.25rem', label: 'Subtle (4px)' },
    { value: '0.375rem', label: 'Small (6px)' },
    { value: '0.5rem', label: 'Default (8px)' },
    { value: '0.75rem', label: 'Rounded (12px)' },
    { value: '9999px', label: 'Pill' },
  ];
  const STYLE_OPTIONS = [
    { value: 'filled', label: 'Filled' },
    { value: 'outlined', label: 'Outlined' },
    { value: 'soft', label: 'Soft (tinted)' },
  ];

  const r = draft.button_radius;
  const p = draft.color_primary;
  const bg = draft.color_card_bg;

  return (
    <SectionCard title="Buttons" description="Shape and style applied to all buttons across the platform.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <SelectField label="Corner Radius" value={draft.button_radius} onChange={v => update('button_radius', v)} options={RADIUS_OPTIONS} />
        <SelectField label="Button Style" value={draft.button_style} onChange={v => update('button_style', v)} options={STYLE_OPTIONS} />
      </div>

      <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Button States Preview</p>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'default' }}>
            Primary
          </button>
          <button style={{ backgroundColor: 'transparent', color: p, border: `2px solid ${p}`, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', cursor: 'default' }}>
            Secondary
          </button>
          <button style={{ backgroundColor: '#f1f5f9', color: draft.color_text_primary, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'default' }}>
            Neutral
          </button>
          <button style={{ backgroundColor: draft.color_error, color: '#fff', borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'default' }}>
            Destructive
          </button>
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'default', opacity: 0.4 }}>
            Disabled
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button style={{ backgroundColor: p, color: bg, borderRadius: r, padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.875rem', border: 'none', cursor: 'default', outline: `3px solid ${p}`, outlineOffset: '2px' }}>
            Focus State
          </button>
          <span className="text-xs text-slate-500">Focus ring visible for keyboard navigation</span>
        </div>
      </div>
    </SectionCard>
  );
}

function CardsSection({ draft, update }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
}) {
  const RADIUS_OPTIONS = [
    { value: '0', label: 'None' },
    { value: '0.25rem', label: 'Small (4px)' },
    { value: '0.5rem', label: 'Medium (8px)' },
    { value: '0.75rem', label: 'Default (12px)' },
    { value: '1rem', label: 'Large (16px)' },
    { value: '1.5rem', label: 'Extra Large (24px)' },
  ];
  const SHADOW_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'Subtle' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Strong' },
  ];
  const BORDER_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
    { value: 'strong', label: 'Strong' },
  ];
  const SPACING_OPTIONS = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
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
    compact: '0.875rem',
    normal: '1.25rem',
    relaxed: '1.75rem',
  };

  return (
    <SectionCard title="Cards" description="Corner radius, shadow, border, and spacing applied to all card components.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <SelectField label="Corner Radius" value={draft.card_radius} onChange={v => update('card_radius', v)} options={RADIUS_OPTIONS} />
        <SelectField label="Shadow" value={draft.card_shadow} onChange={v => update('card_shadow', v)} options={SHADOW_OPTIONS} />
        <SelectField label="Border" value={draft.card_border} onChange={v => update('card_border', v)} options={BORDER_OPTIONS} />
        <SelectField label="Spacing" value={draft.card_spacing} onChange={v => update('card_spacing', v)} options={SPACING_OPTIONS} />
      </div>

      <div className="border border-slate-100 rounded-xl p-5 bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Card Preview</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontFamily: draft.font_family }}>
          {['Development Goal', 'Training Activity'].map(title => (
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
              <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: draft.color_text_primary, marginBottom: '0.375rem' }}>{title}</h4>
              <p style={{ fontSize: '0.8125rem', color: draft.color_text_secondary, lineHeight: 1.55 }}>
                Radius, shadow, border and spacing are all configurable to match your brand guidelines.
              </p>
              <div style={{ marginTop: '1rem' }}>
                <button style={{
                  backgroundColor: draft.color_primary,
                  color: draft.color_card_bg,
                  borderRadius: draft.button_radius,
                  padding: '0.375rem 0.875rem',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  border: 'none',
                  cursor: 'default',
                }}>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- Opal Section ----------

function OpalSection({ draft, update, persistField }: {
  draft: BrandingSettings;
  update: (k: keyof BrandingSettings, v: any) => void;
  persistField: (k: keyof BrandingSettings, v: any) => Promise<void>;
}) {
  const THEME_OPTIONS = [
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
    <SectionCard title="Opal AI" description="Customise how Opal appears and introduces herself to users.">
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-xl">
          <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-cyan-700">
            Voice functionality and advanced avatar customisation will be available in a future release.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextField label="Display Name" value={draft.opal_display_name} onChange={v => update('opal_display_name', v)} placeholder="Opal" />
          <SelectField label="Colour Theme" value={draft.opal_color_theme} onChange={v => update('opal_color_theme', v)} options={THEME_OPTIONS} />
        </div>

        <TextareaField label="Welcome Message" value={draft.opal_welcome_message} onChange={v => update('opal_welcome_message', v)} rows={3} hint="The first message users see when they open the Opal chat." />

        <ImageUpload
          label="Avatar Image"
          description="Square image displayed in the Opal chat header. PNG or WebP, minimum 64×64."
          value={draft.opal_avatar_url}
          storagePath="opal-avatar/avatar"
          accept="image/png,image/jpeg,image/webp"
          previewSize="md"
          onChange={url => update('opal_avatar_url', url)}
          onPersist={url => persistField('opal_avatar_url', url)}
        />

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chat Preview</p>
          <div className="max-w-xs rounded-2xl overflow-hidden shadow-md border border-slate-200">
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: themeGradients[draft.opal_color_theme] ?? themeGradients.cyan }}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
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
                <p className="text-sm text-slate-700 leading-relaxed">
                  {draft.opal_welcome_message || 'Hello!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------- Live Preview ----------

function LivePreview({ draft, visible, onToggle }: {
  draft: BrandingSettings;
  visible: boolean;
  onToggle: () => void;
}) {
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
    normal: '1.1rem',
    relaxed: '1.5rem',
  };
  const cardStyle = {
    backgroundColor: draft.color_card_bg,
    borderRadius: draft.card_radius,
    boxShadow: shadowMap[draft.card_shadow] ?? shadowMap.sm,
    border: borderMap[draft.card_border] ?? borderMap.light,
    padding: paddingMap[draft.card_spacing] ?? paddingMap.normal,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Monitor className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Live Preview</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {visible && (
        <div
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 200px)', backgroundColor: draft.color_background }}
        >
          {/* Browser chrome bar */}
          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded text-xs text-slate-400 px-3 py-0.5 text-center truncate border border-slate-200">
              app.evolo.com/dashboard
            </div>
          </div>

          <div className="flex" style={{ minHeight: '520px', fontFamily: draft.font_family, fontSize: draft.font_size_base }}>
            {/* Sidebar */}
            <div className="w-36 flex flex-col flex-shrink-0" style={{ backgroundColor: draft.color_sidebar_bg }}>
              <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2">
                  {draft.logo_url ? (
                    <img src={draft.logo_url} alt="" className="w-6 h-6 rounded object-contain" />
                  ) : (
                    <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: draft.color_primary }}>
                      {(draft.platform_name || 'EV').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate" style={{ fontSize: '0.6875rem' }}>{draft.platform_name}</p>
                  </div>
                </div>
              </div>
              <nav className="p-1.5 flex-1 space-y-0.5">
                {['Dashboard', 'Reviews', 'Career', 'Training', 'Opal'].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                    style={{
                      fontSize: '0.6875rem',
                      backgroundColor: i === 0 ? draft.color_sidebar_active : 'transparent',
                      color: i === 0 ? '#fff' : draft.color_sidebar_text,
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: i === 0 ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                    {item}
                  </div>
                ))}
              </nav>
              <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2 px-1">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0" style={{ fontSize: '0.5rem' }}>
                    JD
                  </div>
                  <div className="min-w-0">
                    <p className="text-white truncate" style={{ fontSize: '0.625rem' }}>Jane Doe</p>
                    <p style={{ fontSize: '0.5625rem', color: draft.color_sidebar_text, opacity: 0.7 }}>Employee</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-3 space-y-3 overflow-hidden">
              <div>
                <h1 style={{ fontSize: '1rem', fontWeight: 700, color: draft.color_text_primary, lineHeight: 1.2 }}>Dashboard</h1>
                <p style={{ fontSize: '0.6875rem', color: draft.color_text_secondary, marginTop: '0.125rem' }}>Welcome back, Jane</p>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Reviews Due', value: '3', color: draft.color_info },
                  { label: 'Team Members', value: '12', color: draft.color_success },
                  { label: 'Action Items', value: '5', color: draft.color_warning },
                ].map(stat => (
                  <div key={stat.label} style={{ ...cardStyle, padding: '0.625rem' }}>
                    <p style={{ fontSize: '0.5625rem', color: draft.color_text_secondary }}>{stat.label}</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 700, color: stat.color, lineHeight: 1.1, marginTop: '0.125rem' }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Activity card */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 600, color: draft.color_text_primary, marginBottom: '0.5rem' }}>Recent Activity</h3>
                {['Sarah completed her review', 'James updated career plan', 'New training available'].map((item, i) => (
                  <div key={item} className="flex items-center gap-1.5 py-1" style={{ borderBottom: i < 2 ? `1px solid ${draft.color_background}` : 'none' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: draft.color_primary }} />
                    <p style={{ fontSize: '0.625rem', color: draft.color_text_secondary }}>{item}</p>
                  </div>
                ))}
                <div style={{ marginTop: '0.625rem' }}>
                  <button style={{
                    backgroundColor: draft.color_primary,
                    color: draft.color_card_bg,
                    borderRadius: draft.button_radius,
                    padding: '0.25rem 0.625rem',
                    fontWeight: 500,
                    fontSize: '0.625rem',
                    border: 'none',
                    cursor: 'default',
                    fontFamily: draft.font_family,
                  }}>
                    View All
                  </button>
                </div>
              </div>

              {/* Table preview */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '0.6875rem', fontWeight: 600, color: draft.color_text_primary, marginBottom: '0.5rem' }}>Team Overview</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.5625rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${draft.color_background}` }}>
                      {['Name', 'Role', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', color: draft.color_text_secondary, fontWeight: 600, padding: '0.25rem 0.25rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Alice M.', 'Engineer', 'On Track'],
                      ['Bob T.', 'Designer', 'Review Due'],
                    ].map(([name, role, status]) => (
                      <tr key={name} style={{ borderBottom: `1px solid ${draft.color_background}` }}>
                        <td style={{ padding: '0.25rem', color: draft.color_text_primary, fontWeight: 500 }}>{name}</td>
                        <td style={{ padding: '0.25rem', color: draft.color_text_secondary }}>{role}</td>
                        <td style={{ padding: '0.25rem' }}>
                          <span style={{
                            backgroundColor: status === 'On Track' ? `${draft.color_success}22` : `${draft.color_warning}22`,
                            color: status === 'On Track' ? draft.color_success : draft.color_warning,
                            padding: '0.125rem 0.375rem',
                            borderRadius: '999px',
                            fontWeight: 600,
                          }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notification + link */}
              <div style={{ ...cardStyle, backgroundColor: `${draft.color_info}12`, border: `1px solid ${draft.color_info}30` }}>
                <p style={{ fontSize: '0.5625rem', color: draft.color_info, fontWeight: 600 }}>
                  Reminder — 2 reviews are due this week.{' '}
                  <span style={{ textDecoration: 'underline', cursor: 'default' }}>View reviews</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ----------

function BrandingCentre() {
  const { profile } = useAuth();
  const { branding, refresh } = useBranding();
  const [draft, setDraft] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(true);

  useEffect(() => {
    setDraft({ ...branding });
    setHasUnsaved(false);
  }, [branding]);

  const update = useCallback((key: keyof BrandingSettings, value: any) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setHasUnsaved(true);
    setSaved(false);
  }, []);

  const persistField = useCallback(async (key: keyof BrandingSettings, value: any) => {
    if (!profile) return;
    const patch = { [key]: value, updated_by: profile.id, updated_at: new Date().toISOString() };
    if (branding.id) {
      await supabase.from('organisation_branding').update(patch).eq('id', branding.id);
    } else {
      await supabase.from('organisation_branding').insert([{ ...DEFAULT_BRANDING, ...patch, created_by: profile.id, is_active: true }]);
    }
    await refresh();
  }, [profile, branding.id, refresh]);

  function resetToDefaults() {
    setDraft({ ...branding });
    setHasUnsaved(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { id: _id, ...rest } = draft;
    const payload = {
      ...rest,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Branding Centre</h2>
          <p className="text-slate-500 text-sm mt-1">Customise platform identity, colours, typography and Opal's appearance.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasUnsaved && (
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Discard
            </button>
          )}
          <button
            onClick={save}
            disabled={saving || !hasUnsaved}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
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
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Unsaved changes — save to apply them across the platform.
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Settings column */}
        <div className="space-y-5 min-w-0">
          <IdentitySection draft={draft} update={update} persistField={persistField} />
          <ColoursSection draft={draft} update={update} />
          <TypographySection draft={draft} update={update} />
          <ButtonsSection draft={draft} update={update} />
          <CardsSection draft={draft} update={update} />
          <OpalSection draft={draft} update={update} persistField={persistField} />
        </div>

        {/* Sticky preview column */}
        <div className="min-w-0">
          <LivePreview draft={draft} visible={previewVisible} onToggle={() => setPreviewVisible(v => !v)} />
        </div>
      </div>
    </div>
  );
}


export default BrandingCentre