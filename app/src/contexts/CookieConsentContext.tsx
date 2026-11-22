import { getCookieConsentStatus } from '../utils/cookieConsent';

import { type Element, createContext, useContext, createSignal, onSettled } from 'solid-js';

type CookieConsentStatus = 'accepted' | 'rejected' | null;

interface CookieConsentContextType {
  consentStatus: () => CookieConsentStatus;
  setConsentStatus: (status: CookieConsentStatus) => void;
}

const defaultContextValue: CookieConsentContextType = {
  consentStatus: () => null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setConsentStatus: () => {},
};

const CookieConsentContext = createContext<CookieConsentContextType>(defaultContextValue);

interface CookieConsentProviderProps {
  children: Element;
}

export function CookieConsentProvider(props: CookieConsentProviderProps): Element {
  const [consentStatus, setConsentStatusInternal] = createSignal<CookieConsentStatus>(null);

  onSettled(() => {
    setConsentStatusInternal(getCookieConsentStatus());
  });

  const setConsentStatus = (status: CookieConsentStatus) => {
    if (status) {
      localStorage.setItem('cookie-consent', status);
    } else {
      localStorage.removeItem('cookie-consent');
    }
    setConsentStatusInternal(status);
  };

  return (
    <CookieConsentContext value={{ consentStatus, setConsentStatus }}>
      {props.children}
    </CookieConsentContext>
  );
}

export function useCookieConsent(): CookieConsentContextType {
  return useContext(CookieConsentContext);
}
