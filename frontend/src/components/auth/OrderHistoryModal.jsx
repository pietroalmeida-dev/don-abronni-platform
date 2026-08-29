import { useEffect, useState } from 'react';
import { ordersService } from '../../services/ordersService';
import { avaliacaoService } from '../../services/avaliacaoService';
import { CONFIG } from '../../config';
import { formatCurrency, formatarDataHora } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ModalOverlay from './ModalOverlay';

// Seletor de 1 a 5 estrelas clicáveis — usado só aqui, por isso não virou um
// componente em arquivo próprio (mesmo critério de tamanho usado no resto do app).
function SeletorEstrelas({ valor, onChange }) {
  return (
    <div aria-label="Nota de 1 a 5 estrelas">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.15rem', fontSize: '1.3rem', color: 'var(--primary)' }}
        >
          <i className={n <= valor ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
        </button>
      ))}
    </div>
  );
}

function FormularioAvaliacao({ numeroNota, onCancelar, onEnviado }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const showToast = useToast();

  async function enviar() {
    setEnviando(true);
    try {
      await avaliacaoService.criar({ numeroNota, nota, comentario: comentario.trim() });
      showToast('Obrigado pela avaliação! 🍕');
      onEnviado(numeroNota);
    } catch (erro) {
      showToast(erro.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ marginTop: '.6rem', padding: '.8rem', background: 'var(--bg-soft, #f8f9fa)', borderRadius: '.8rem' }}>
      <div className="form-group"><label>Sua nota</label><SeletorEstrelas valor={nota} onChange={setNota} /></div>
      <div className="form-group">
        <label>Comentário (opcional)</label>
        <textarea
          rows={2}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Conte como foi sua experiência..."
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
        <button className="btn btn-outline" type="button" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button className="btn btn-primary" type="button" onClick={enviar} disabled={enviando}>
          {enviando ? <><i className="fa-solid fa-spinner fa-spin" /> Enviando...</> : 'Enviar avaliação'}
        </button>
      </div>
    </div>
  );
}

export default function OrderHistoryModal({ onClose }) {
  const { session } = useAuth();
  const showToast = useToast();
  const [pedidos, setPedidos] = useState(null);
  const [numerosAvaliados, setNumerosAvaliados] = useState(new Set());
  const [avaliandoNota, setAvaliandoNota] = useState(null);

  useEffect(() => {
    if (!session) return;
    // As duas listas (pedidos e avaliações já feitas) são buscadas em paralelo —
    // são independentes uma da outra, então não há razão pra esperar uma pra
    // começar a outra.
    Promise.all([ordersService.getByUser(session.id), avaliacaoService.getMinhas()])
      .then(([listaPedidos, minhasAvaliacoes]) => {
        setPedidos(listaPedidos.slice().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)));
        setNumerosAvaliados(new Set(minhasAvaliacoes.map((a) => a.numeroNota)));
      })
      .catch((erro) => {
        showToast(erro.message, 'erro');
        setPedidos([]);
      });
  }, [session, showToast]);

  function marcarComoAvaliado(numeroNota) {
    setNumerosAvaliados((atual) => new Set(atual).add(numeroNota));
    setAvaliandoNota(null);
  }

  return (
    <ModalOverlay open onClose={onClose}>
      <h3 style={{ marginBottom: '1.2rem', color: 'var(--primary)' }}><i className="fa-solid fa-receipt" /> Meus Pedidos</h3>

      {pedidos === null && <LoadingSpinner label="Carregando pedidos..." />}
      {pedidos && pedidos.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Você ainda não fez nenhum pedido.</p>}
      {pedidos && pedidos.map((p) => {
        const podeAvaliar = p.status === 'entregue' && !numerosAvaliados.has(p.id);
        return (
          <div className="historico-item" key={p.id}>
            <div className="historico-nota">{p.id}</div>
            <div className="historico-data">{formatarDataHora(p.criadoEm)} • {formatCurrency(p.total)}</div>
            <div className={`historico-status historico-status--${p.status}`}>{CONFIG.STATUS_PEDIDO_LABEL[p.status] || p.status}</div>
            <div className="historico-itens">
              {p.itens.map((i) => `${i.quantidade}x ${i.nome}${i.borda ? ` (Borda: ${i.borda})` : ''}`).join(', ')}
            </div>

            {p.status === 'entregue' && numerosAvaliados.has(p.id) && (
              <div style={{ marginTop: '.4rem', fontSize: '.85rem', color: 'var(--success, #2f7d4f)' }}>
                <i className="fa-solid fa-circle-check" /> Você já avaliou este pedido
              </div>
            )}

            {podeAvaliar && avaliandoNota !== p.id && (
              <button className="btn btn-outline" style={{ marginTop: '.5rem' }} onClick={() => setAvaliandoNota(p.id)}>
                <i className="fa-regular fa-star" /> Avaliar pedido
              </button>
            )}

            {podeAvaliar && avaliandoNota === p.id && (
              <FormularioAvaliacao
                numeroNota={p.id}
                onCancelar={() => setAvaliandoNota(null)}
                onEnviado={marcarComoAvaliado}
              />
            )}
          </div>
        );
      })}
    </ModalOverlay>
  );
}
