import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import ModalOverlay from './ModalOverlay';

export default function MeuPerfilModal({ onClose }) {
  const { session, updateProfile, changePassword } = useAuth();
  const showToast = useToast();

  const [nome, setNome] = useState(session.name);
  const [telefone, setTelefone] = useState(session.telefone || '');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  async function salvarPerfil(e) {
    e.preventDefault();
    if (!nome.trim()) { showToast('Digite seu nome.', 'erro'); return; }

    setSalvandoPerfil(true);
    const resultado = await updateProfile({ nome: nome.trim(), telefone: telefone.trim() });
    setSalvandoPerfil(false);

    if (resultado.ok) showToast('Dados atualizados.');
    else showToast(resultado.erro, 'erro');
  }

  async function trocarSenha(e) {
    e.preventDefault();
    if (novaSenha.length < 6) { showToast('Nova senha: mínimo 6 caracteres.', 'erro'); return; }
    if (novaSenha !== confirmarSenha) { showToast('As senhas não coincidem.', 'erro'); return; }

    setTrocandoSenha(true);
    const resultado = await changePassword({ senhaAtual, novaSenha });
    setTrocandoSenha(false);

    if (resultado.ok) {
      showToast('Senha alterada com sucesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } else {
      showToast(resultado.erro, 'erro');
    }
  }

  return (
    <ModalOverlay open onClose={onClose}>
      <h3 style={{ marginBottom: '1.2rem', color: 'var(--primary)' }}><i className="fa-solid fa-circle-user" /> Meu Perfil</h3>

      <form className="modal-form active" onSubmit={salvarPerfil}>
        <div className="input-group">
          <i className="fa-solid fa-user" />
          <input type="text" placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-envelope" />
          {/* E-mail não é editável aqui: trocar e-mail exigiria reconfirmar posse
              da nova caixa de entrada (fora do escopo desta tela). */}
          <input type="email" value={session.email} disabled title="O e-mail não pode ser alterado." />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-phone" />
          <input type="tel" placeholder="Telefone (opcional)" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <button type="submit" className="btn modal-btn" disabled={salvandoPerfil}>
          {salvandoPerfil ? <><i className="fa-solid fa-spinner fa-spin" /> Salvando...</> : 'Salvar dados'}
        </button>
      </form>

      <div className="user-dropdown-divider" style={{ margin: '1.5rem 0' }} />

      <h4 style={{ marginBottom: '.8rem' }}>Trocar senha</h4>
      <form className="modal-form active" onSubmit={trocarSenha}>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Senha atual" autoComplete="current-password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Nova senha (mínimo 6 caracteres)" autoComplete="new-password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} />
        </div>
        <div className="input-group">
          <i className="fa-solid fa-lock" />
          <input type="password" placeholder="Confirmar nova senha" autoComplete="new-password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
        </div>
        <button type="submit" className="btn modal-btn" disabled={trocandoSenha}>
          {trocandoSenha ? <><i className="fa-solid fa-spinner fa-spin" /> Trocando...</> : 'Trocar senha'}
        </button>
      </form>
    </ModalOverlay>
  );
}
