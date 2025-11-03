import { type JSX, createContext, useContext, createSignal, onMount } from 'solid-js';
import { getCookieConsentStatus } from '../utils/cookieConsent';

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
  children: JSX.Element;
}

export function CookieConsentProvider(props: CookieConsentProviderProps): JSX.Element {
  const [consentStatus, setConsentStatusInternal] = createSignal<CookieConsentStatus>(null);

  onMount(() => {
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
    <CookieConsentContext.Provider value={{ consentStatus, setConsentStatus }}>
      {props.children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextType {
  return useContext(CookieConsentContext);
}
