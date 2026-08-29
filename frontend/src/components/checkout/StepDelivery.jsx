import { useState, useEffect, useRef } from 'react';
import { shippingService } from '../../services/shippingService';
import { addressesService } from '../../services/addressesService';
import { formatCurrency, formatarCep } from '../../utils/format';
import { useToast } from '../../contexts/ToastContext';

export default function StepDelivery({ session, enderecosSalvos, setEnderecosSalvos, entrega, setEntrega, onNext }) {
  const [tipo, setTipo] = useState(entrega.tipo);
  const [enderecoSelecionadoIdx, setEnderecoSelecionadoIdx] = useState(enderecosSalvos.length > 0 ? 0 : 'novo');
  // enderecosSalvos chega de forma assíncrona (buscado no CheckoutModal, useEffect
  // que só roda DEPOIS da primeira renderização) — então o useState acima quase
  // sempre inicializa com a lista ainda vazia e fica preso em 'novo'. Este efeito
  // corrige a seleção assim que a lista chega pela primeira vez; a ref garante que
  // isso só acontece uma vez, sem sobrescrever uma escolha que o cliente já tenha
  // feito manualmente depois (inclusive escolher "Novo endereço" de propósito).
  const jaSelecionouAutomaticamente = useRef(false);
  useEffect(() => {
    if (!jaSelecionouAutomaticamente.current && enderecosSalvos.length > 0) {
      jaSelecionouAutomaticamente.current = true;
      setEnderecoSelecionadoIdx(0);
    }
  }, [enderecosSalvos]);
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cep, setCep] = useState('');
  const [complemento, setComplemento] = useState('');
  const [salvarEndereco, setSalvarEndereco] = useState(true);
  const [frete, setFrete] = useState(null); // { distanciaKm, valor, entregaDisponivel }
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const showToast = useToast();

  // Compartilhada pelo onBlur do CEP e pelo onBlur do Número: o número da casa é
  // opcional pro cálculo (o backend cai pro nível de rua se não vier, ou se o
  // OpenStreetMap não tiver esse número mapeado), mas melhora a precisão da
  // distância quando informado — por isso recalcula de novo quando o cliente
  // termina de digitar o número, não só quando termina o CEP.
  async function recalcularFrete(cepValor, numeroValor) {
    if (cepValor.replace(/\D/g, '').length < 8) { setFrete(null); return; }
    setCalculandoFrete(true);
    try {
      setFrete(await shippingService.calcularPorCep(cepValor, numeroValor));
    } catch (erro) {
      // Sem isso, um erro de rede aqui deixava calculandoFrete=true pra sempre — o
      // spinner "Calculando frete..." nunca sumia e nenhum aviso aparecia.
      showToast(erro.message, 'erro');
      setFrete(null);
    } finally {
      setCalculandoFrete(false);
    }
  }

  function handleCepBlur() {
    return recalcularFrete(cep, numero);
  }

  // Só recalcula se o CEP já estiver completo — evita uma chamada extra
  // (e o spinner piscando) enquanto o cliente ainda nem terminou de preencher o
  // CEP (ordem natural do formulário: CEP vem antes de Número).
  function handleNumeroBlur() {
    if (cep.replace(/\D/g, '').length < 8) return;
    return recalcularFrete(cep, numero);
  }

  async function handleNext() {
    if (tipo !== 'delivery') {
      setEntrega({ tipo, endereco: null, taxaEntrega: 0, distanciaKm: null });
      onNext();
      return;
    }

    let enderecoFinal;
    const enderecoEhNovo = enderecoSelecionadoIdx === 'novo' || !enderecosSalvos[enderecoSelecionadoIdx];
    if (!enderecoEhNovo) {
      enderecoFinal = enderecosSalvos[enderecoSelecionadoIdx];
    } else {
      if (!rua || !numero || !bairro || !cep) { showToast('Preencha todos os campos obrigatórios.', 'erro'); return; }
      if (cep.replace(/\D/g, '').length !== 8) { showToast('CEP inválido. Use o formato 00000-000.', 'erro'); return; }
      enderecoFinal = { rua, numero, bairro, cep, complemento };
    }

    // Garante que o frete do endereço final foi calculado — o endereço salvo pode
    // nunca ter passado pelo onBlur do campo CEP (foi escolhido direto da lista), e
    // o novo também não, se o cliente colou o CEP e avançou sem tirar o foco do
    // campo.
    let freteAtual = frete;
    if (!freteAtual) {
      setCalculandoFrete(true);
      try {
        freteAtual = await shippingService.calcularPorCep(enderecoFinal.cep, enderecoFinal.numero);
        setFrete(freteAtual);
      } catch (erro) {
        showToast(erro.message, 'erro');
        setCalculandoFrete(false);
        return;
      }
      setCalculandoFrete(false);
    }

    // CEP com formato inválido: shippingService (front) já traduz o 422 do backend
    // em `null` — sem esta checagem, o `.entregaDisponivel` logo abaixo quebraria
    // (não dá pra ler propriedade de null). Na prática hoje isso não deveria
    // acontecer (o formulário já bloqueia CEP com menos de 8 dígitos antes de
    // chegar aqui), mas fica como segunda camada de proteção.
    if (!freteAtual) {
      showToast('CEP inválido. Use o formato 00000-000.', 'erro');
      return;
    }

    // Antes disso, um CEP fora da área de entrega era tratado como "frete grátis" e
    // deixava o cliente avançar — só descobria que o pedido seria recusado no último
    // clique de "Confirmar e enviar", depois de preencher pagamento inteiro. A
    // mensagem agora vem do backend (motivo real: CEP não encontrado, fora de SP,
    // bairro ainda não atendido, ViaCEP indisponível...), com um texto genérico de
    // reserva caso algum dia venha sem `mensagem`.
    if (!freteAtual.entregaDisponivel) {
      showToast(freteAtual.mensagem || 'Não entregamos nesse CEP. Escolha "Retirar no local" ou tente outro endereço.', 'erro');
      return;
    }

    if (enderecoEhNovo && session && salvarEndereco) {
      try {
        setEnderecosSalvos(await addressesService.add(session.id, enderecoFinal));
      } catch (erro) {
        showToast(erro.message, 'erro');
        return;
      }
    }

    setEntrega({ tipo, endereco: enderecoFinal, taxaEntrega: freteAtual.valor, distanciaKm: freteAtual.distanciaKm });
    onNext();
  }

  return (
    <div className="checkout-body">
      <div className="checkout-section-title">Tipo de entrega</div>
      <div className="checkout-tipo-entrega">
        <label className={`checkout-radio-card ${tipo === 'delivery' ? 'active' : ''}`}>
          <input type="radio" name="tipoEntrega" checked={tipo === 'delivery'} onChange={() => setTipo('delivery')} />
          <i className="fa-solid fa-motorcycle" />
          <span>Delivery</span>
          <small>Frete calculado por KM</small>
        </label>
        <label className={`checkout-radio-card ${tipo === 'retirada' ? 'active' : ''}`}>
          <input type="radio" name="tipoEntrega" checked={tipo === 'retirada'} onChange={() => setTipo('retirada')} />
          <i className="fa-solid fa-store" />
          <span>Retirar</span>
          <small>Grátis</small>
        </label>
      </div>

      {tipo === 'delivery' ? (
        <div id="enderecoSection">
          <div className="checkout-section-title">Endereço de entrega</div>
          {enderecosSalvos.length > 0 && (
            <div className="enderecos-salvos">
              {enderecosSalvos.map((e, i) => (
                <label key={i} className={`checkout-radio-card ${enderecoSelecionadoIdx === i ? 'active' : ''}`}>
                  <input type="radio" name="enderecoSalvo" checked={enderecoSelecionadoIdx === i} onChange={() => { setEnderecoSelecionadoIdx(i); setFrete(null); }} />
                  <i className="fa-solid fa-location-dot" />
                  <span>{e.rua}, {e.numero}{e.complemento ? ` - ${e.complemento}` : ''}</span>
                  <small>{e.bairro} - CEP {e.cep}</small>
                </label>
              ))}
              <label className={`checkout-radio-card ${enderecoSelecionadoIdx === 'novo' ? 'active' : ''}`}>
                <input type="radio" name="enderecoSalvo" checked={enderecoSelecionadoIdx === 'novo'} onChange={() => setEnderecoSelecionadoIdx('novo')} />
                <i className="fa-solid fa-plus" />
                <span>Novo endereço</span>
              </label>
            </div>
          )}

          {enderecoSelecionadoIdx === 'novo' && (
            <div>
              <div className="checkout-form-row">
                <div className="checkout-form-group">
                  <label>CEP *</label>
                  <input value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} onBlur={handleCepBlur} placeholder="00000-000" maxLength={9} />
                </div>
                <div className="checkout-form-group">
                  <label>Número *</label>
                  <input value={numero} onChange={(e) => setNumero(e.target.value)} onBlur={handleNumeroBlur} placeholder="123" />
                </div>
              </div>
              <div className="checkout-form-group">
                <label>Rua *</label>
                <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Nome da rua" />
              </div>
              <div className="checkout-form-row">
                <div className="checkout-form-group">
                  <label>Bairro *</label>
                  <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" />
                </div>
                <div className="checkout-form-group">
                  <label>Complemento</label>
                  <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, bloco..." />
                </div>
              </div>
              {session && (
                <label className="checkout-check-salvar">
                  <input type="checkbox" checked={salvarEndereco} onChange={(e) => setSalvarEndereco(e.target.checked)} />
                  Salvar este endereço
                </label>
              )}
            </div>
          )}

          {calculandoFrete && (
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" /> Calculando frete...
            </div>
          )}
          {!calculandoFrete && frete && (
            <div style={{ marginTop: '1rem', padding: '0.8rem', background: frete.entregaDisponivel ? '#f0f9ff' : '#fee2e2', borderRadius: '0.8rem' }}>
              <span>🚚 Frete: <strong>{frete.entregaDisponivel ? formatCurrency(frete.valor) : (frete.mensagem || 'Não entregamos nessa distância')}</strong></span>
              {/* distanciaKm só existe quando o CEP foi identificado (formato válido,
                  encontrado no ViaCEP, bairro dentro da área) — em "CEP não
                  encontrado"/"fora de SP"/"bairro não atendido" ele vem null, então
                  esta parte não é exibida (evita quebrar em .toFixed de null). */}
              {frete.distanciaKm != null && (
                <span style={{ marginLeft: '1rem' }}>📏 Distância: {frete.distanciaKm.toFixed(1)} km</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="checkout-retirada-info">
          <i className="fa-solid fa-store" />
          <div>
            <strong>Pizzaria Don Abronni</strong>
            <p>Rua Baltazar de Campos, 253 — Zona Norte, SP</p>
            <small>Horário: Qua–Dom, 18h às 23h</small>
          </div>
        </div>
      )}

      <div className="checkout-footer">
        <div />
        <button className="btn btn-primary" onClick={handleNext}>Próximo <i className="fa-solid fa-arrow-right" /></button>
      </div>
    </div>
  );
}
