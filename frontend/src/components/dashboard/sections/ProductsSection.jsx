import { useEffect, useState } from 'react';
import { catalogService } from '../../../services/catalogService';
import { formatCurrency } from '../../../utils/format';
import { resolverUrlImagem } from '../../../utils/media';
import { useToast } from '../../../contexts/ToastContext';
import DashboardModal from '../DashboardModal';
import LoadingSpinner from '../../common/LoadingSpinner';

const CATEGORIA_LABEL = { pizza_salgada: 'Pizza salgada', pizza_doce: 'Pizza doce', bebida: 'Bebida' };

const FORM_VAZIO = {
  nome: '', descricao: '', precoBase: '', categoria: 'pizza_salgada',
  permiteDoisSabores: false, permiteBordaRecheada: false, destaque: false, imagem: '',
};

export default function ProductsSection() {
  const [produtos, setProdutos] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [enviando, setEnviando] = useState(false);
  const showToast = useToast();

  async function carregar() {
    try {
      setProdutos(await catalogService.getAll());
    } catch (erro) {
      showToast(erro.message, 'erro');
      setProdutos([]);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  // Libera a URL temporária do preview quando troca de imagem ou o componente
  // desmonta — senão cada seleção de arquivo vaza um pouco de memória do navegador.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (!produtos) return <LoadingSpinner label="Carregando cardápio..." />;

  let filtrados = [...produtos];
  if (categoriaFiltro !== 'todos') filtrados = filtrados.filter((p) => p.categoria === categoriaFiltro);
  if (busca.trim()) {
    const t = busca.toLowerCase();
    filtrados = filtrados.filter((p) => p.nome.toLowerCase().includes(t));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setArquivoImagem(null);
    setPreviewUrl('');
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || '',
      precoBase: produto.precoBase,
      categoria: produto.categoria,
      permiteDoisSabores: produto.permiteDoisSabores,
      permiteBordaRecheada: produto.permiteBordaRecheada,
      destaque: produto.destaque,
      imagem: produto.imagem || '',
    });
    setArquivoImagem(null);
    setPreviewUrl('');
    setModalAberto(true);
  }

  function handleImagemSelecionada(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setArquivoImagem(arquivo);
    setPreviewUrl(URL.createObjectURL(arquivo));
  }

  async function salvar() {
    const precoNum = parseFloat(form.precoBase);
    if (!form.nome.trim() || !form.categoria || Number.isNaN(precoNum) || precoNum < 0) {
      showToast('Preencha nome, categoria e um preço válido.', 'erro');
      return;
    }

    setEnviando(true);
    try {
      // A imagem é enviada em uma chamada separada (multipart/form-data) — o
      // backend devolve o caminho salvo, que só então entra no corpo JSON de
      // create()/update(). Fazer as duas coisas numa única requisição exigiria
      // misturar arquivo binário com o resto do formulário, mais complexo sem
      // ganho real aqui.
      let caminhoImagem = form.imagem;
      if (arquivoImagem) {
        const resultado = await catalogService.uploadImage(arquivoImagem);
        caminhoImagem = resultado.imagem;
      }

      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        precoBase: precoNum,
        categoria: form.categoria,
        permiteDoisSabores: form.permiteDoisSabores,
        permiteBordaRecheada: form.permiteBordaRecheada,
        destaque: form.destaque,
        imagem: caminhoImagem,
      };

      if (editandoId) {
        await catalogService.update(editandoId, payload);
      } else {
        await catalogService.create(payload);
      }

      setModalAberto(false);
      await carregar();
      showToast(editandoId ? 'Produto atualizado.' : 'Produto cadastrado.');
    } catch (erro) {
      showToast(erro.message, 'erro');
    } finally {
      setEnviando(false);
    }
  }

  async function desativar(produto) {
    if (!window.confirm(`Remover "${produto.nome}" do cardápio? Pedidos antigos que já usaram esse produto não são afetados.`)) return;
    try {
      await catalogService.deactivate(produto.id);
      await carregar();
      showToast('Produto removido do cardápio.');
    } catch (erro) {
      showToast(erro.message, 'erro');
    }
  }

  return (
    <>
      <div className="employees-header-stats">
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-pizza-slice" /></div><div><h4>Produtos no cardápio</h4><div className="employee-stat-number">{produtos.length}</div></div></div>
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-star" /></div><div><h4>Em destaque</h4><div className="employee-stat-number">{produtos.filter((p) => p.destaque).length}</div></div></div>
        <div className="employee-stat-card"><div className="employee-stat-icon"><i className="fa-solid fa-layer-group" /></div><div><h4>Meia a meia disponível</h4><div className="employee-stat-number">{produtos.filter((p) => p.permiteDoisSabores).length}</div></div></div>
      </div>

      <div className="employees-controls">
        <div className="employees-search"><input type="text" placeholder="🔍 Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="role-filter">
          {['todos', 'pizza_salgada', 'pizza_doce', 'bebida'].map((c) => (
            <button key={c} className={`role-btn ${categoriaFiltro === c ? 'active' : ''}`} onClick={() => setCategoriaFiltro(c)}>
              {c === 'todos' ? 'Todos' : CATEGORIA_LABEL[c]}
            </button>
          ))}
        </div>
        <button className="btn-primary-dash" onClick={abrirNovo}><i className="fa-solid fa-plus" /> Novo Produto</button>
      </div>

      <div className="employees-grid">
        {filtrados.length === 0 ? (
          <div className="empty-employees"><i className="fa-regular fa-folder-open" /> Nenhum produto encontrado.</div>
        ) : (
          filtrados.map((p) => (
            <div className="employee-card" key={p.id}>
              <div className="employee-header">
                <div className="employee-avatar" style={{ overflow: 'hidden' }}>
                  {p.imagem
                    ? <img src={resolverUrlImagem(p.imagem)} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="fa-solid fa-pizza-slice" />}
                </div>
                <div className="employee-info"><h3>{p.nome}</h3><span className="employee-role">{CATEGORIA_LABEL[p.categoria] || p.categoria}</span></div>
              </div>
              <div className="employee-details">
                <div className="employee-salary"><i className="fa-solid fa-tag" /> {formatCurrency(p.precoBase)}</div>
                {p.destaque && <div><i className="fa-solid fa-star" /> Destaque na home</div>}
                {p.permiteDoisSabores && <div><i className="fa-solid fa-layer-group" /> Aceita meia a meia</div>}
              </div>
              <div className="employee-actions">
                <button onClick={() => abrirEdicao(p)}><i className="fa-solid fa-pen" /> Editar</button>
                <button onClick={() => desativar(p)}><i className="fa-solid fa-trash" /> Remover</button>
              </div>
            </div>
          ))
        )}
      </div>

      <DashboardModal
        open={modalAberto}
        title={editandoId ? 'Editar Produto' : 'Novo Produto'}
        icon={editandoId ? 'fa-pen' : 'fa-plus-circle'}
        onClose={() => setModalAberto(false)}
      >
        <div className="form-group"><label htmlFor="prodNome">Nome *</label><input id="prodNome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="prodDescricao">Descrição</label><input id="prodDescricao" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="prodPreco">Preço base (R$) *</label><input id="prodPreco" type="number" step="0.01" min="0" value={form.precoBase} onChange={(e) => setForm({ ...form, precoBase: e.target.value })} /></div>
        <div className="form-group">
          <label htmlFor="prodCategoria">Categoria *</label>
          <select id="prodCategoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {Object.entries(CATEGORIA_LABEL).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="prodImagem">Foto do produto</label>
          <input id="prodImagem" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagemSelecionada} />
          {(previewUrl || form.imagem) && (
            <img
              src={previewUrl || resolverUrlImagem(form.imagem)}
              alt="Pré-visualização"
              style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 12, marginTop: '.6rem' }}
            />
          )}
        </div>
        <label className="checkout-check-salvar" style={{ display: 'flex', marginBottom: '.6rem' }}>
          <input type="checkbox" checked={form.permiteDoisSabores} onChange={(e) => setForm({ ...form, permiteDoisSabores: e.target.checked })} />
          Aceita pedido meia a meia
        </label>
        <label className="checkout-check-salvar" style={{ display: 'flex', marginBottom: '.6rem' }}>
          <input type="checkbox" checked={form.permiteBordaRecheada} onChange={(e) => setForm({ ...form, permiteBordaRecheada: e.target.checked })} />
          Aceita borda recheada
        </label>
        <label className="checkout-check-salvar" style={{ display: 'flex', marginBottom: '1rem' }}>
          <input type="checkbox" checked={form.destaque} onChange={(e) => setForm({ ...form, destaque: e.target.checked })} />
          Exibir em destaque na home
        </label>
        <button className="btn-primary-dash" style={{ width: '100%' }} onClick={salvar} disabled={enviando}>
          {enviando ? <><i className="fa-solid fa-spinner fa-spin" /> Salvando...</> : (editandoId ? 'Salvar alterações' : 'Cadastrar produto')}
        </button>
      </DashboardModal>
    </>
  );
}
