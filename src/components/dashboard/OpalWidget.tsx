import { useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useBranding } from '../../contexts/BrandingContext';

interface OpalWidgetProps {
  answerFn: (q: string) => string;
  placeholder?: string;
  suggestions?: string;
  title?: string;
}

function OpalOrb({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="orb-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#e0f7fa" />
          <stop offset="40%" stopColor="#b2ebf2" />
          <stop offset="100%" stopColor="#00bcd4" />
        </radialGradient>
        <radialGradient id="orb-shimmer" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#orb-bg)" />
      <circle cx="16" cy="16" r="15" fill="url(#orb-shimmer)" />
      <ellipse cx="11" cy="11" rx="3" ry="2" fill="white" opacity="0.3" transform="rotate(-20 11 11)" />
    </svg>
  );
}

export default function OpalWidget({ answerFn, placeholder, suggestions, title }: OpalWidgetProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { branding } = useBranding();

  const displayName = branding.opal_display_name || 'Opal';
  const widgetTitle = title ?? `${displayName} — Your AI Guide`;

  function handleAsk() {
    if (!query.trim()) return;
    setResponse(answerFn(query.trim()));
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(8, 145, 178, 0.2)', background: 'var(--brand-card-bg, #fff)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          {branding.opal_avatar_url ? (
            <img
              src={branding.opal_avatar_url}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={e => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) parent.dataset.fallback = 'true';
              }}
            />
          ) : (
            <OpalOrb size={32} />
          )}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{widgetTitle}</h3>
          {suggestions && <p className="text-xs text-slate-500">{suggestions}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAsk()}
          placeholder={placeholder ?? 'Ask a question...'}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none bg-white"
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(8,145,178,0.2)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button
          onClick={handleAsk}
          disabled={!query.trim()}
          className="px-3 py-2 text-white rounded-lg transition-colors disabled:opacity-40"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--brand-primary-dark)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--brand-primary)'; }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {response && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
          {response}
        </div>
      )}
    </div>
  );
}
