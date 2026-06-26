import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../lib/translations';

export default function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en-GB', name: 'English (British)', flag: '🇬🇧' },
    { code: 'en-US', name: 'English (American)', flag: '🇺🇸' },
  ];

  const handleLanguageChange = async (newLanguage: Language) => {
    if (newLanguage === language) return;

    setSaving(true);
    setMessage(null);

    try {
      await setLanguage(newLanguage);
      setMessage({ type: 'success', text: t.admin.languageSaved });
    } catch (error) {
      console.error('Error saving language:', error);
      setMessage({ type: 'error', text: t.admin.languageError });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t.admin.languageSettings}</h2>
          <p className="text-sm text-gray-600 mt-1">{t.admin.selectLanguage}</p>
        </div>
      </div>

      <div className="space-y-3">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={saving}
            className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
              language === lang.code
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{lang.flag}</span>
              <div className="text-left">
                <p className="font-semibold text-gray-900">{lang.name}</p>
                <p className="text-sm text-gray-600">{lang.code}</p>
              </div>
            </div>
            {language === lang.code && (
              <Check className="w-6 h-6 text-blue-600" />
            )}
          </button>
        ))}
      </div>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {saving && (
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-block w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-gray-600">{t.common.loading}</span>
        </div>
      )}
    </div>
  );
}
