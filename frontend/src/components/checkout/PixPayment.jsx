import { useEffect, useRef, useState } from 'react';
import { paymentService } from '../../services/paymentService';
import { ordersService } from '../../services/ordersService';
import { CONFIG } from '../../config';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

export default function PixPayment({ total, nota, mensagemWhatsapp, emailCliente, onFinish, onCancel }) {
  const [estado, setEstado] = useState('carregando'); // carregando | pronto | falhou
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [segundos, setSegundos] = useState(1800);
  const [confirmando, setConfirmando] = useState(false);
  const showToast = useToast();
  const intervalRef = useRef(null);

  useEffect(() => {
    (async () => {
      const resultado = await paymentService.criarPagamentoPix(total, emailCliente);
      if (resultado.ok) {
        setDados(resultado.dados);
        setEstado('pronto');
        intervalRef.current = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
      } else {
        setErro(resultado.erro);
        setEstado('falhou');
      }
    })();
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔒 ordersService.updateStatus nunca lança exceção — devolve { ok: false, erro }
  // mesmo quando falha. Sem checar `ok` aqui, uma falha de rede fazia o cliente ver
  // "pedido cancelado"/"pagamento confirmado" mesmo quando o pedido continuava
  // "recebido" no banco — a cozinha seguiria preparando um pedido que o cliente
  // achava ter cancelado, ou nunca receberia a confirmação de pagamento.
  async function handleCancelar() {
    clearInterval(intervalRef.current);
    const resultado = await ordersService.updateStatus(nota, CONFIG.STATUS_PEDIDO.CANCELADO);
    if (!resultado.ok) {
      showToast(resultado.erro || 'Não foi possível cancelar o pedido. Tente novamente.', 'erro');
      return;
    }
    onCancel();
  }

  async function handleJaPaguei() {
    clearInterval(intervalRef.current);
    setConfirmando(true);
    const resultado = await ordersService.updateStatus(nota, CONFIG.STATUS_PEDIDO.RECEBIDO);
    if (!resultado.ok) {
      setConfirmando(false);
      showToast(resultado.erro || 'Não foi possível confirmar o pagamento. Tente novamente.', 'erro');
      return;
    }
    onFinish(mensagemWhatsapp);
  }

  function handleSeguirSemPix() {
    onFinish(mensagemWhatsapp);
    showToast(`✅ Pedido ${nota} enviado! Combine o pagamento com a pizzaria.`);
  }

  function copiarChave() {
    navigator.clipboard.writeText(dados.qr_code).then(() => showToast('Código Pix copiado!'));
  }

  if (estado === 'carregando') {
    return (
      <>
        <div className="checkout-header"><h3><i className="fa-brands fa-pix" style={{ color: '#32bcad' }} /> Pagamento via Pix</h3></div>
        <div className="pix-screen" style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Gerando QR Code de pagamento...</p>
        </div>
      </>
    );
  }

  if (estado === 'falhou') {
    return (
      <>
        <div className="checkout-header">
          <h3><i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }} /> Pix indisponível</h3>
          <button className="checkout-close-pix" onClick={onCancel} aria-label="Fechar"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="pix-screen" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {erro} Seu pedido <strong>{nota}</strong> já foi registrado — você pode enviá-lo agora e combinar o pagamento na entrega.
          </p>
          <div className="pix-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={handleCancelar}><i className="fa-solid fa-ban" /> Cancelar pedido</button>
            <button className="btn btn-primary" onClick={handleSeguirSemPix}><i className="fa-brands fa-whatsapp" /> Enviar e pagar na entrega</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="checkout-header">
        <h3><i className="fa-brands fa-pix" style={{ color: '#32bcad' }} /> Pagamento via Pix</h3>
        <button className="checkout-close-pix" onClick={handleCancelar} aria-label="Fechar"><i className="fa-solid fa-xmark" /></button>
      </div>
      <div className="pix-screen" style={{ textAlign: 'center', padding: '1rem' }}>
        <div className="pix-valor" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
          {formatCurrency(total)}
        </div>
        <div className="pix-qr" style={{ marginBottom: '1.5rem' }}>
          <img src="/images/image-qrcode.svg" alt="QR Code Pix" style={{ width: 200, margin: '0 auto', display: 'block' }} />
        </div>
        <div className="pix-chave-container" style={{ background: '#f8f9fa', borderRadius: '1rem', padding: '0.8rem', marginBottom: '1.5rem' }}>
          <div className="pix-chave-label" style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.5rem' }}>Código Pix (copiável):</div>
          <div className="pix-chave-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'white', borderRadius: '2rem', padding: '0.3rem 0.3rem 0.3rem 1rem', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'left', flex: 1 }}>{dados.qr_code}</span>
            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', margin: 0 }} onClick={copiarChave}><i className="fa-regular fa-copy" /> Copiar</button>
          </div>
        </div>
        <div className="pix-timer" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#e67e22' }}>
          <i className="fa-regular fa-clock" /> Expira em {Math.floor(segundos / 60)}:{(segundos % 60).toString().padStart(2, '0')}
        </div>
        <div className="pix-aviso" style={{ background: '#fff3cd', borderRadius: '0.8rem', padding: '0.5rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: '#856404' }}>
          <i className="fa-solid fa-circle-info" /> Ambiente de teste – QR Code fictício
        </div>
        <div className="pix-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-outline" style={{ minWidth: 120 }} onClick={handleCancelar} disabled={confirmando}><i className="fa-solid fa-ban" /> Cancelar</button>
          <button className="btn btn-primary" style={{ minWidth: 120 }} onClick={handleJaPaguei} disabled={confirmando}>
            {confirmando ? <><i className="fa-solid fa-spinner fa-spin" /> Confirmando...</> : <><i className="fa-solid fa-check" /> Já paguei</>}
          </button>
        </div>
      </div>
    </>
  );
}
