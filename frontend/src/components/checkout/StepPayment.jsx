import { useState } from 'react';

export default function StepPayment({ pagamento, setPagamento, onNext, onBack }) {
  const [forma, setForma] = useState(pagamento.forma);
  const [troco, setTroco] = useState(pagamento.troco || '');
  const [obs, setObs] = useState(pagamento.obs || '');

  function handleNext() {
    setPagamento({ forma, troco, obs });
    onNext();
  }

  return (
    <div className="checkout-body">
      <div className="checkout-section-title">Forma de pagamento</div>
      <div className="checkout-pagamento-options">
        <label className={`checkout-radio-card ${forma === 'pix' ? 'active' : ''}`}>
          <input type="radio" name="formaPagamento" checked={forma === 'pix'} onChange={() => setForma('pix')} />
          <i className="fa-brands fa-pix" style={{ color: '#32bcad' }} />
          <span>Pix</span>
          <small>Aprovação imediata</small>
        </label>
        <label className={`checkout-radio-card ${forma === 'cartao' ? 'active' : ''}`}>
          <input type="radio" name="formaPagamento" checked={forma === 'cartao'} onChange={() => setForma('cartao')} />
          <i className="fa-solid fa-credit-card" style={{ color: '#4a90d9' }} />
          <span>Cartão</span>
          <small>Na entrega</small>
        </label>
        <label className={`checkout-radio-card ${forma === 'dinheiro' ? 'active' : ''}`}>
          <input type="radio" name="formaPagamento" checked={forma === 'dinheiro'} onChange={() => setForma('dinheiro')} />
          <i className="fa-solid fa-money-bill-wave" style={{ color: '#22c55e' }} />
          <span>Dinheiro</span>
          <small>Na entrega</small>
        </label>
      </div>

      {forma === 'pix' && (
        <div className="pagamento-section">
          <div className="pix-info">
            <i className="fa-brands fa-pix" />
            <div>
              <strong>Chave Pix da pizzaria</strong>
              <p>CNPJ: 00.000.000/0001-00</p>
              <small>Após confirmar, você verá o QR Code e a chave para pagamento</small>
            </div>
          </div>
        </div>
      )}
      {(forma === 'cartao' || forma === 'dinheiro') && (
        <div className="pagamento-section">
          <div className="pagamento-aviso">
            <i className="fa-solid fa-circle-info" />
            {forma === 'cartao'
              ? 'Pagamento realizado na entrega. Aceitamos todos os cartões de débito e crédito.'
              : 'Pagamento em dinheiro na entrega. Informe se precisar de troco.'}
          </div>
          <div className="checkout-form-group" style={{ marginTop: '1rem' }}>
            <label>Troco para (opcional)</label>
            <input value={troco} onChange={(e) => setTroco(e.target.value)} placeholder={forma === 'dinheiro' ? 'Ex: 50,00' : 'Sem necessidade de troco'} />
          </div>
        </div>
      )}

      <div className="checkout-form-group" style={{ marginTop: '1.2rem' }}>
        <label>Observações (opcional)</label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: Sem cebola, toque o interfone 201..."
          rows={3}
          style={{ width: '100%', padding: '0.8rem 1rem', border: '1px solid #e2e8f0', borderRadius: '1rem', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.9rem' }}
        />
      </div>

      <div className="checkout-footer">
        <button className="btn btn-outline" onClick={onBack}><i className="fa-solid fa-arrow-left" /> Voltar</button>
        <button className="btn btn-primary" onClick={handleNext}>Próximo <i className="fa-solid fa-arrow-right" /></button>
      </div>
    </div>
  );
}
