export default function Services() {
  return (
    <section id="services" className="services-enhanced">
      <div className="wrapper p-top">
        <div className="text-center">
          <h5>Como funciona</h5>
          <h2>Três passos simples para matar sua fome</h2>
        </div>

        <div className="services-steps">
          <div className="step-card">
            <div className="step-icon"><i className="fa-solid fa-mobile-alt" /></div>
            <div className="step-number">01</div>
            <h3>Fácil de pedir</h3>
            <p>Escolha sua pizza favorita no cardápio digital, personalize e finalize em segundos.</p>
            <a href="#menu" className="step-link">Ver cardápio <i className="fa-solid fa-arrow-right" /></a>
          </div>

          <div className="step-card">
            <div className="step-icon"><i className="fa-solid fa-bicycle" /></div>
            <div className="step-number">02</div>
            <h3>Rápida entrega</h3>
            <p>Nossos entregadores são ágeis e preparados para levar a pizza quentinha até você.</p>
            <span className="step-badge">⏱️ Média: 35min</span>
          </div>

          <div className="step-card">
            <div className="step-icon"><i className="fa-solid fa-heart" /></div>
            <div className="step-number">03</div>
            <h3>Melhor qualidade</h3>
            <p>Ingredientes frescos, massa artesanal e forno à lenha. Sabor que abraça.</p>
            <a href="#reviews" className="step-link">Ver avaliações <i className="fa-solid fa-star" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
