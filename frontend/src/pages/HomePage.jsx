import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useToast } from '../contexts/ToastContext';

const MENSAGEM_RETORNO_PAGAMENTO = {
  retorno: (nota) => [`✅ Pagamento do pedido ${nota} recebido! Aguardando a confirmação final.`, 'sucesso'],
  pendente: (nota) => [`⏳ Pagamento do pedido ${nota} em análise. Você será avisado assim que for confirmado.`, 'aviso'],
  falhou: (nota) => [`❌ O pagamento do pedido ${nota} não foi concluído. Tente novamente ou escolha outra forma de pagamento.`, 'erro'],
};

export default function HomePage() {
  const { session, adminSession } = useAuth();
  const { cart } = useCart();
  const { pendingCheckout, setPendingCheckout, accountModal, closeAccountModal } = useUI();
  const navigate = useNavigate();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCheckout, setShowCheckout] = useState(false);

  // Retorno do redirecionamento de pagamento por cartão (Mercado Pago Checkout
  // Pro) — a confirmação de verdade já aconteceu (ou vai acontecer) via webhook no
  // servidor; isto é só feedback imediato pro cliente que acabou de voltar do
  // gateway, sem repetir a mesma leitura em toda renderização.
  useEffect(() => {
    const pagamento = searchParams.get('pagamento');
    const nota = searchParams.get('nota');
    if (!pagamento || !MENSAGEM_RETORNO_PAGAMENTO[pagamento]) return;

    const [mensagem, tipo] = MENSAGEM_RETORNO_PAGAMENTO[pagamento](nota || '');
    showToast(mensagem, tipo);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
