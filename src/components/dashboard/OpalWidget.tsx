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
    <div className="card border border-sky-100 bg-sky-50/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-sky-100 rounded-lg">
          <MessageSquare className="w-4 h-4 text-sky-600" />
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
          className="flex-1 px-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white"
        />
        <button
          onClick={handleAsk}
          disabled={!query.trim()}
          className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {response && (
        <div className="mt-2 p-3 bg-white border border-sky-200 rounded-lg text-sm text-slate-700">
          {response}
        </div>
      )}
    </div>
  );
}
