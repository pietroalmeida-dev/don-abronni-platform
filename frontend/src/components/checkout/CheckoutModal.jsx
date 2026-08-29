import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart, getItemUnitPrice } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { addressesService } from '../../services/addressesService';
import { ordersService } from '../../services/ordersService';
import { CONFIG } from '../../config';
import { formatCurrency } from '../../utils/format';
import StepDelivery from './StepDelivery';
import StepPayment from './StepPayment';
import StepConfirm from './StepConfirm';
import PixPayment from './PixPayment';

const STEP_LABELS = [
  { n: 1, label: 'Entrega' },
  { n: 2, label: 'Pagamento' },
  { n: 3, label: 'Confirmar' },
];

function montarItensDoPedido(cart) {
  return cart.map((i) => ({
    // Sabor único: `i.id` já é o id real do produto. Meia a meia: `i.id` é a chave
    // composta do carrinho (ver TwoFlavorsModal), o id real do 1º sabor mora em
    // `i.produtoId` — por isso o fallback.
    produtoId: i.produtoId ?? i.id,
    produtoSabor2Id: i.produtoSabor2Id || undefined,
    nome: i.name,
    tipo: i.isHalfHalf ? 'meia_meia' : 'unica',
    // BORDA_OPCOES (data/borderOptions.js) usa ids capitalizados ('Catupiry'), mas o
    // enum do backend é minúsculo ('catupiry') — sem essa conversão o servidor não
    // reconhecia a borda escolhida e cobrava como se não tivesse nenhuma.
    borda: i.border ? i.border.toLowerCase() : null,
    precoBorda: i.borderPrice || 0,
    precoUnitario: i.price,
    quantidade: i.quantity,
    subtotal: getItemUnitPrice(i) * i.quantity,
  }));
}

export default function CheckoutModal({ onClose }) {
  const { session } = useAuth();
  const { cart, totalPrice: subtotal, clearCart } = useCart();
  const showToast = useToast();

  const [step, setStep] = useState(1);
  const [enderecosSalvos, setEnderecosSalvos] = useState([]);
  const [entrega, setEntrega] = useState({ tipo: 'delivery', endereco: null, taxaEntrega: 0 });
  const [pagamento, setPagamento] = useState({ forma: 'pix', troco: '', obs: '' });
  const [enviando, setEnviando] = useState(false);
  const [pixData, setPixData] = useState(null); // { total, nota, mensagem }

  useLockBodyScroll(true);

  useEffect(() => {
    if (session) {
      addressesService.getByUser(session.id)
        .then(setEnderecosSalvos)
        .catch((erro) => showToast(erro.message, 'erro'));
    }
  }, [session, showToast]);

  function montarMensagemWhatsapp(nota, total) {
    const itensStr = cart
      .map((i) => `  • ${i.quantity}x ${i.name}${i.border ? ` (Borda: ${i.border})` : ''} — ${formatCurrency(getItemUnitPrice(i) * i.quantity)}`)
      .join('\n');
    const endStr = entrega.tipo === 'delivery'
      ? `📍 *Endereço:* ${entrega.endereco.rua}, ${entrega.endereco.numero}${entrega.endereco.complemento ? `, ${entrega.endereco.complemento}` : ''} — ${entrega.endereco.bairro}, CEP ${entrega.endereco.cep}`
      : '🏪 *Retirada no local*';
    const pagStr = { pix: '🟢 Pix', cartao: '💳 Cartão na entrega', dinheiro: '💵 Dinheiro na entrega' };

    return `🍕 *DON ABRONNI — NOVO PEDIDO*
━━━━━━━━━━━━━━━━━━━━━
🧾 *Nota:* ${nota}
👤 *Cliente:* ${session.name}
━━━━━━━━━━━━━━━━━━━━━
*ITENS:*
${itensStr}
━━━━━━━━━━━━━━━━━━━━━
💰 *Subtotal:* ${formatCurrency(subtotal)}
🛵 *Taxa de entrega:* ${entrega.taxaEntrega > 0 ? formatCurrency(entrega.taxaEntrega) : 'Grátis'}
✅ *TOTAL: ${formatCurrency(total)}*
━━━━━━━━━━━━━━━━━━━━━
${endStr}
💳 *Pagamento:* ${pagStr[pagamento.forma]}
${pagamento.troco ? `🪙 *Troco para:* ${pagamento.troco}` : ''}
${pagamento.obs ? `📝 *Obs:* ${pagamento.obs}` : ''}
━━━━━━━━━━━━━━━━━━━━━`;
  }

  async function handleConfirmar() {
    // Revalida a sessão no momento da confirmação — não confia apenas na sessão do
    // início do checkout, fechando qualquer brecha de finalizar pedido sem login.
    if (!session) {
      showToast('Sua sessão expirou. Faça login novamente para finalizar o pedido.', 'erro');
      onClose();
      return;
    }

    setEnviando(true);
    const total = subtotal + (entrega.tipo === 'delivery' ? entrega.taxaEntrega : 0);

    const resultado = await ordersService.create({
      usuarioId: session.id,
      clienteNome: session.name,
      clienteEmail: session.email,
      itens: montarItensDoPedido(cart),
      entrega: { tipo: entrega.tipo, endereco: entrega.endereco, taxaEntrega: entrega.taxaEntrega },
      pagamento: { forma: pagamento.forma, trocoPara: pagamento.troco || '', statusPagamento: 'pendente' },
      observacao: pagamento.obs || '',
      subtotal,
      total,
      status: CONFIG.STATUS_PEDIDO.RECEBIDO,
      origem: 'site',
    });

    if (!resultado.ok) {
      setEnviando(false);
      showToast(resultado.erro || 'Não foi possível registrar seu pedido. Tente novamente.', 'erro');
      return;
    }

    // O número da nota agora vem do servidor (ele gera o dele, ignora qualquer id
    // que o navegador mande) — usar esse, não mais um gerado localmente, senão a
    // mensagem do WhatsApp e a tela de Pix referenciariam uma nota que não existe.
    const nota = resultado.pedido.id;
    const mensagem = montarMensagemWhatsapp(nota, total);

    if (pagamento.forma === 'pix') {
      setPixData({ total, nota, mensagem });
      setEnviando(false);
    } else {
      finalizarEnvio(mensagem, nota);
    }
  }

  function finalizarEnvio(mensagem, nota) {
    clearCart();
    window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`, '_blank');
    showToast(`✅ Pedido ${nota} enviado! Aguarde confirmação.`);
    onClose();
  }

  // Tela de Pix substitui o conteúdo do modal (mesmo comportamento da versão original).
  if (pixData) {
    return (
      <div className="checkout-modal-overlay active">
        <div className="checkout-modal">
          <PixPayment
            total={pixData.total}
            nota={pixData.nota}
            mensagemWhatsapp={pixData.mensagem}
            emailCliente={session?.email}
            onFinish={(mensagem) => finalizarEnvio(mensagem, pixData.nota)}
            onCancel={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="checkout-modal">
        <div className="checkout-header">
          <h3><i className="fa-solid fa-bag-shopping" /> Finalizar Pedido</h3>
          <button className="checkout-close" onClick={onClose} aria-label="Fechar"><i className="fa-solid fa-xmark" /></button>
        </div>

        <div className="checkout-steps">
          {STEP_LABELS.map((s, idx) => (
            <div key={s.n} style={{ display: 'contents' }}>
              <div className={`checkout-step ${step === s.n ? 'active' : ''} ${step > s.n ? 'done' : ''}`}>
                <span className="step-num">{s.n}</span> {s.label}
              </div>
              {idx < STEP_LABELS.length - 1 && <div className="checkout-step-line" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <StepDelivery
            session={session}
            enderecosSalvos={enderecosSalvos}
            setEnderecosSalvos={setEnderecosSalvos}
            entrega={entrega}
            setEntrega={setEntrega}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepPayment pagamento={pagamento} setPagamento={setPagamento} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepConfirm
            cart={cart}
            entrega={entrega}
            pagamento={pagamento}
            subtotal={subtotal}
            onBack={() => setStep(2)}
            onConfirm={handleConfirmar}
            enviando={enviando}
          />
        )}
      </div>
    </div>
  );
}
