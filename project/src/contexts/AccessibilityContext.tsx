import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface AccessibilityContextType {
  highContrastMode: boolean;
  dyslexicMode: boolean;
  toggleHighContrast: () => void;
  toggleDyslexicMode: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrastMode, setHighContrastMode] = useState(() => {
    const saved = localStorage.getItem('highContrastMode');
    return saved === 'true';
  });

  const [dyslexicMode, setDyslexicMode] = useState(() => {
    const saved = localStorage.getItem('dyslexicMode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('highContrastMode', highContrastMode.toString());
    if (highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrastMode]);

  useEffect(() => {
    localStorage.setItem('dyslexicMode', dyslexicMode.toString());
    if (dyslexicMode) {
      document.documentElement.classList.add('dyslexic-font');
    } else {
      document.documentElement.classList.remove('dyslexic-font');
    }
  }, [dyslexicMode]);

  function toggleHighContrast() {
    setHighContrastMode((prev) => !prev);
  }

  function toggleDyslexicMode() {
    setDyslexicMode((prev) => !prev);
  }

  return (
    <AccessibilityContext.Provider
      value={{ highContrastMode, dyslexicMode, toggleHighContrast, toggleDyslexicMode }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
