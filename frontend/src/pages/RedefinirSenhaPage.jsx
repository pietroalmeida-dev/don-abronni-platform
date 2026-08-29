import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import Toast from '../components/common/Toast';

// Rota pública /redefinir-senha?token=... — a única tela deste sistema que existe
// fora do fluxo normal da SPA (Home ou /admin), porque o link chega de fora dela,
// por e-mail. Por isso é uma PÁGINA de verdade (com sua própria rota no
// AppRoutes.jsx), não mais um modal: um modal só existe depois que a Home já
// montou, e quem clica no link do e-mail nunca passou por lá.
export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const showToast = useToast();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (novaSenha !== confirmar) { showToast('As senhas não coincidem.', 'erro'); return; }

    setLoading(true);
    const resultado = await authService.redefinirSenha({ token, novaSenha });
    setLoading(false);

    if (!resultado.ok) { showToast(resultado.erro, 'erro'); return; }
    setSucesso(true);
  }

  return (
    <div className="auth-page">
      <div className="login-modal">
        <Link to="/" className="logo">Don Abronni</Link>

        {!token ? (
          // Alguém abriu /redefinir-senha sem vir de um link de e-mail válido (ou o
          // token foi cortado/alterado ao copiar o link) — nem tenta chamar a API.
          <div className="pagamento-aviso pagamento-aviso--erro">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>Link inválido. Solicite a recuperação de senha novamente pela tela de login.</span>
          </div>
        ) : sucesso ? (
          <div className="pagamento-aviso">
            <i className="fa-solid fa-circle-check" />
            <span>Senha redefinida com sucesso! Já pode fazer login com a nova senha.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>Criar nova senha</h3>
            <div className="input-group">
              <i className="fa-solid fa-lock" />
              <input
                type="password"
                placeholder="Nova senha (mínimo 6 caracteres)"
                required
                minLength={6}
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />
            </div>
            <div className="input-group">
              <i className="fa-solid fa-lock" />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                required
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>
            <button type="submit" className="btn modal-btn" disabled={loading}>
              {loading ? <><i className="fa-solid fa-spinner fa-spin" /> Salvando...</> : 'Redefinir senha'}
            </button>
          </form>
        )}

        {(sucesso || !token) && (
          <Link to="/" className="btn" style={{ marginTop: '1.2rem' }}>
            {sucesso ? 'Ir para o login' : 'Voltar ao início'}
          </Link>
        )}
      </div>
      <Toast />
    </div>
  );
}
