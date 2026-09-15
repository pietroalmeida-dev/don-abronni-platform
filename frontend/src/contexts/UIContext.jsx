import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [isCartOpen, setCartOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login'); // 'login' | 'register'
  const [loginRequiredBannerVisible, setLoginRequiredBannerVisible] = useState(false);
  // Quando true, sinaliza que havia uma tentativa de checkout aguardando login —
  // componentes como o Checkout observam isso (junto do estado de sessão) para
  // retomar o fluxo automaticamente assim que o login for concluído.
  const [pendingCheckout, setPendingCheckout] = useState(false);

  // Qual modal de "conta do cliente" está aberto — um estado só (em vez de 3
  // booleanos soltos) garante que só um pode estar aberto por vez, e não precisa de
  // 3 pares de callback repassados por prop até quem precisa abrir. Vive aqui (não
  // como useState local em HomePage) de propósito: tanto o menu de desktop
  // (UserDropdown) quanto o menu mobile (MobileMenu) precisam abrir essas telas, e
  // são dois componentes que não têm relação de pai/filho direta entre si — sem um
  // estado compartilhado, um dos dois sempre fica sem acesso (foi exatamente o bug:
  // o menu mobile nunca tinha esses links, porque o estado só existia dentro do
  // Navbar/HomePage do lado desktop).
  const [accountModal, setAccountModal] = useState(null); // null | 'orders' | 'addresses' | 'profile'
  const openAccountModal = useCallback((tipo) => setAccountModal(tipo), []);
  const closeAccountModal = useCallback(() => setAccountModal(null), []);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const openLoginModal = useCallback((tab = 'login') => {
    setLoginModalTab(tab);
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setLoginRequiredBannerVisible(false);
    setPendingCheckout(false);
  }, []);

  // Chamado por qualquer fluxo que precise garantir login antes de continuar
  // (hoje: finalizar pedido). Retorna true se já há sessão; caso contrário, abre o
  // modal de login com um aviso e marca a intenção pendente.
  const requireLoginUI = useCallback((jaLogado) => {
    if (jaLogado) return true;
    setPendingCheckout(true);
    setLoginRequiredBannerVisible(true);
    openLoginModal('login');
    return false;
  }, [openLoginModal]);

  // useMemo: sem isso, todo componente que consome useUI() (Navbar, MobileMenu,
  // LoginModal, CheckoutModal...) re-renderizaria a cada render do UIProvider, mesmo
  // sem nenhum dado que ele usa ter mudado de fato.
  const value = useMemo(() => ({
    isCartOpen,
    openCart,
    closeCart,
    isMobileMenuOpen,
    openMobileMenu,
    closeMobileMenu,
    isLoginModalOpen,
    loginModalTab,
    setLoginModalTab,
    openLoginModal,
    closeLoginModal,
    loginRequiredBannerVisible,
    pendingCheckout,
    setPendingCheckout,
    requireLoginUI,
    accountModal,
    openAccountModal,
    closeAccountModal,
  }), [
    isCartOpen, openCart, closeCart,
    isMobileMenuOpen, openMobileMenu, closeMobileMenu,
    isLoginModalOpen, loginModalTab, openLoginModal, closeLoginModal,
    loginRequiredBannerVisible, pendingCheckout, requireLoginUI,
    accountModal, openAccountModal, closeAccountModal,
  ]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI precisa ser usado dentro de um UIProvider');
  return ctx;
}
