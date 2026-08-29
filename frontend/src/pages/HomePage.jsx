import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import MobileMenu from '../components/layout/MobileMenu';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import Services from '../components/sections/Services';
import MenuSection from '../components/menu/MenuSection';
import Reviews from '../components/sections/Reviews';
import Location from '../components/sections/Location';
import WhatsAppSubscribe from '../components/sections/WhatsAppSubscribe';
import CartDrawer from '../components/cart/CartDrawer';
import CheckoutModal from '../components/checkout/CheckoutModal';
import LoginModal from '../components/auth/LoginModal';
import OrderHistoryModal from '../components/auth/OrderHistoryModal';
import AddressesModal from '../components/auth/AddressesModal';
import MeuPerfilModal from '../components/auth/MeuPerfilModal';
import Toast from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useUI } from '../contexts/UIContext';

export default function HomePage() {
  const { session, adminSession } = useAuth();
  const { cart } = useCart();
  const { pendingCheckout, setPendingCheckout, accountModal, closeAccountModal } = useUI();
  const navigate = useNavigate();

  const [showCheckout, setShowCheckout] = useState(false);

  // Se já existe uma sessão de administrador ativa, vai direto para o painel —
  // mesmo comportamento do index.html original.
  useEffect(() => {
    if (adminSession) navigate('/admin', { replace: true });
  }, [adminSession, navigate]);

  // Retoma o checkout automaticamente assim que o login é concluído, sem perder o
  // carrinho — a mesma experiência da versão anterior, agora expressa como reação a
  // uma mudança de estado (idiomático em React) em vez de um callback manual. Isto
  // reage a um evento externo (login concluído), não sincroniza estado derivado de
  // props, então o efeito é o lugar certo para essa lógica.
  useEffect(() => {
    if (session && pendingCheckout && cart.length > 0) {
      setPendingCheckout(false);
      setShowCheckout(true);
    }
  }, [session, pendingCheckout, cart.length, setPendingCheckout]);

  return (
    <div id="publicSite">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <MenuSection />
        <Reviews />
        <Location />
        <WhatsAppSubscribe />
      </main>
      <Footer />

      <MobileMenu />
      <CartDrawer onOpenCheckout={() => setShowCheckout(true)} />
      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
      <LoginModal />
      {accountModal === 'orders' && <OrderHistoryModal onClose={closeAccountModal} />}
      {accountModal === 'addresses' && <AddressesModal onClose={closeAccountModal} />}
      {accountModal === 'profile' && <MeuPerfilModal onClose={closeAccountModal} />}
      <Toast />
    </div>
  );
}
