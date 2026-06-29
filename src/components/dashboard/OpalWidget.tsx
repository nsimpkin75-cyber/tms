import { useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';

interface OpalWidgetProps {
  answerFn: (q: string) => string;
  placeholder?: string;
  suggestions?: string;
  title?: string;
}

export default function OpalWidget({ answerFn, placeholder, suggestions, title }: OpalWidgetProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAsk() {
    if (!query.trim()) return;
    setResponse(answerFn(query.trim()));
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(var(--brand-primary-rgb, 8 145 178) / 0.2)', background: 'var(--brand-card-bg, #fff)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-slate-100">
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">{title ?? 'Opal — Your AI Guide'}</h3>
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
