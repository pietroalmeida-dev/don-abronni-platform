import { useEffect, useState } from 'react';
import { avaliacaoService } from '../../services/avaliacaoService';
import { formatarDataHora } from '../../utils/format';

function Stars({ count }) {
  return (
    <div className="review-card__stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={i < count ? 'fa-solid fa-star' : 'fa-regular fa-star'} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const [avaliacoes, setAvaliacoes] = useState(null);

  useEffect(() => {
    // Rota pública (GET /api/avaliacoes/publicas) — não precisa de login pra
    // aparecer na home. Falha em silêncio (sem toast): esta é uma seção de
    // marketing, não crítica — se der erro, a seção só some, sem atrapalhar o
    // resto da página.
    avaliacaoService.getPublicas().then(setAvaliacoes).catch(() => setAvaliacoes([]));
  }, []);

  // Enquanto carrega, ou se não houver nenhuma avaliação com comentário ainda
  // (sistema recém-instalado, por exemplo), a seção simplesmente não aparece —
  // melhor que mostrar depoimentos inventados no lugar de dados reais.
  if (!avaliacoes || avaliacoes.length === 0) return null;

  const media = avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length;

  return (
    <section id="reviews">
      <div className="reviews-section wrapper p-top">
        <div className="reviews-header text-center">
          <h5>Nossas avaliações</h5>
          <h2>O que nossos clientes dizem</h2>
        </div>

        <div className="reviews-grid">
          {avaliacoes.slice(0, 3).map((a) => (
            <div className="review-card" key={a.id}>
              <div className="review-card__quote"><i className="fa-solid fa-quote-left" /></div>
              <p className="review-card__text">{a.comentario}</p>
              <Stars count={a.nota} />
              <div className="review-card__author">
                <div className="review-card__avatar-fallback"><i className="fa-regular fa-user" /></div>
                <div>
                  <span className="review-card__name">{a.nome}</span>
                  <span className="review-card__role">{formatarDataHora(a.data)}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="review-card review-card--stat">
            <div className="stat-number">{media.toFixed(1)}</div>
            <Stars count={Math.round(media)} />
            <p className="stat-label">Avaliação média</p>
            <div className="stat-divider" />
            <div className="stat-row">
              <span className="stat-value">{avaliacoes.length}</span>
              <span className="stat-desc">Avaliações recebidas</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
