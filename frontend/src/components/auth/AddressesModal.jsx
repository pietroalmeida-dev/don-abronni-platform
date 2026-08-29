import { useEffect, useState } from 'react';
import { addressesService } from '../../services/addressesService';
import { formatarCep } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ModalOverlay from './ModalOverlay';

const FORM_VAZIO = { rua: '', numero: '', bairro: '', cep: '', complemento: '' };

export default function AddressesModal({ onClose }) {
  const { session } = useAuth();
  const showToast = useToast();
  const [enderecos, setEnderecos] = useState(null);
  const [editandoId, setEditandoId] = useState(null); // id do endereço, 'novo', ou null (nenhum form aberto)
  const [form, setForm] = useState(FORM_VAZIO);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    try {
      setEnderecos(await addressesService.getByUser(session.id));
    } catch (erro) {
      showToast(erro.message, 'erro');
      setEnderecos([]);
    }
  }

  useEffect(() => {
    if (session) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function abrirNovo() {
    setForm(FORM_VAZIO);
    setEditandoId('novo');
  }

  function abrirEdicao(endereco) {
    setForm({ rua: endereco.rua, numero: endereco.numero, bairro: endereco.bairro, cep: endereco.cep, complemento: endereco.complemento || '' });
    setEditandoId(endereco.id);
  }

  async function salvar() {
    if (!form.rua || !form.numero || !form.bairro || !form.cep) {
      showToast('Preencha rua, número, bairro e CEP.', 'erro');
      return;
    }
    if (form.cep.replace(/\D/g, '').length !== 8) {
      showToast('CEP inválido. Use o formato 00000-000.', 'erro');
      return;
    }

    setEnviando(true);
    try {
      if (editandoId === 'novo') {
        setEnderecos(await addressesService.add(session.id, form));
        showToast('Endereço adicionado.');
      } else {
        setEnderecos(await addressesService.update(editandoId, form));
        showToast('Endereço atualizado.');
      }
      setEditandoId(null);
    } catch (erro) {
      showToast(erro.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function remover(endereco) {
    if (!window.confirm(`Remover o endereço "${endereco.rua}, ${endereco.numero}"?`)) return;
    try {
      setEnderecos(await addressesService.remove(endereco.id));
      showToast('Endereço removido.');
    } catch (erro) {
      showToast(erro.message, 'erro');
    }
  }

  return (
    <ModalOverlay open onClose={onClose}>
      <h3 style={{ marginBottom: '1.2rem', color: 'var(--primary)' }}><i className="fa-solid fa-location-dot" /> Meus Endereços</h3>

      {enderecos === null && <LoadingSpinner label="Carregando endereços..." />}
      {enderecos && enderecos.length === 0 && editandoId !== 'novo' && (
        <p style={{ color: 'var(--text-muted)' }}>Você ainda não tem nenhum endereço salvo.</p>
      )}

      {enderecos && enderecos.map((e) => (
        <div className="historico-item" key={e.id}>
          {editandoId === e.id ? (
            <FormularioEndereco form={form} setForm={setForm} onSalvar={salvar} onCancelar={() => setEditandoId(null)} enviando={enviando} />
          ) : (
            <>
              <div className="historico-nota">{e.rua}, {e.numero}{e.complemento ? ` - ${e.complemento}` : ''}</div>
              <div className="historico-data">{e.bairro} — CEP {e.cep}</div>
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => abrirEdicao(e)}><i className="fa-solid fa-pen" /> Editar</button>
                <button className="btn btn-outline" onClick={() => remover(e)}><i className="fa-solid fa-trash" /> Remover</button>
              </div>
            </>
          )}
        </div>
      ))}

      {editandoId === 'novo' && (
        <div className="historico-item">
          <FormularioEndereco form={form} setForm={setForm} onSalvar={salvar} onCancelar={() => setEditandoId(null)} enviando={enviando} />
        </div>
      )}

      {enderecos && editandoId === null && (
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={abrirNovo}>
          <i className="fa-solid fa-plus" /> Adicionar endereço
        </button>
      )}
    </ModalOverlay>
  );
}

// Mesmos campos usados no passo "Entrega" do checkout (StepDelivery) — aqui fora
// do fluxo de compra, só pra gerenciar a lista salva.
function FormularioEndereco({ form, setForm, onSalvar, onCancelar, enviando }) {
  return (
    <div>
      <div className="checkout-form-row">
        <div className="checkout-form-group">
          <label>CEP *</label>
          <input value={form.cep} onChange={(e) => setForm({ ...form, cep: formatarCep(e.target.value) })} placeholder="00000-000" maxLength={9} />
        </div>
        <div className="checkout-form-group">
          <label>Número *</label>
          <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="123" />
        </div>
      </div>
      <div className="checkout-form-group">
        <label>Rua *</label>
        <input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} placeholder="Nome da rua" />
      </div>
      <div className="checkout-form-row">
        <div className="checkout-form-group">
          <label>Bairro *</label>
          <input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} placeholder="Bairro" />
        </div>
        <div className="checkout-form-group">
          <label>Complemento</label>
          <input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} placeholder="Apto, bloco..." />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '.6rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
        <button className="btn btn-outline" type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={onSalvar} disabled={enviando}>
          {enviando ? <><i className="fa-solid fa-spinner fa-spin" /> Salvando...</> : 'Salvar endereço'}
        </button>
      </div>
    </div>
  );
}
