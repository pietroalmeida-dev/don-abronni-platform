import { useState } from 'react';
import { CONFIG } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function WhatsAppSubscribe() {
  const [phone, setPhone] = useState('');
  const { session } = useAuth();
  const showToast = useToast();

  function handleSubscribe(e) {
    e.preventDefault();
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10 || raw.length > 11) {
      showToast('Digite um número válido com DDD. Ex: 11999999999', 'erro');
      return;
    }
    const nome = session ? session.name.split(' ')[0] : 'Cliente';
    const msg = encodeURIComponent(
      `Olá! Sou ${nome} e gostaria de receber ofertas e novidades da Don Abronni. Meu número é (${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`
    );
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMERO}?text=${msg}`, '_blank');
    showToast('Redirecionando para o WhatsApp da pizzaria!');
    setPhone('');
  }

  return (
    <section id="whatsapp-subscription">
      <div className="wrapper p-top">
        <div className="text-center">
          <h5>Receba ofertas</h5>
          <h2>Participe do nosso WhatsApp</h2>
          <p className="para">Cadastre seu número e receba promoções exclusivas, cupons e novidades direto no seu WhatsApp.</p>
          <form
            className="input-container flex"
            style={{ justifyContent: 'center', gap: '0.8rem', marginTop: '1.5rem', flexWrap: 'wrap' }}
            onSubmit={handleSubscribe}
          >
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              style={{ padding: '0.8rem 1.2rem', borderRadius: '3rem', border: '1px solid #ccc', width: '280px' }}
            />
            <button type="submit" className="btn">
              <i className="fa-brands fa-whatsapp" /> Quero receber
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
