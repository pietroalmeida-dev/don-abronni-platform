export default function Hero() {
  return (
    <section className="hero-enhanced" id="top">
      <div className="wrapper">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fa-solid fa-pizza-slice" /> A melhor pizza da zona norte
            </div>
            <h1 className="hero-title">
              Aproveite sua <span className="gradient-text">refeição</span> favorita
            </h1>
            <p className="hero-description">
              Sabor artesanal, ingredientes selecionados e entrega ultrarrápida.
              Escolha a sua pizza e surpreenda o paladar.
            </p>
            <div className="hero-buttons">
              <a href="#menu" className="btn btn-primary" id="orderNowHero">
                Fazer pedido <i className="fa-solid fa-arrow-right" />
              </a>
              <a href="#services" className="btn btn-outline">
                Como funciona <i className="fa-regular fa-circle-question" />
              </a>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">+2.400</span>
                <span className="stat-label">pedidos entregues</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">clientes satisfeitos</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img src="/images/logonova.png" alt="Pizza Don Abronni" />
            <div className="floating-element elem-1">
              <i className="fa-solid fa-star" /> Pizza do dia
            </div>
            <div className="floating-element elem-2">
              <i className="fa-solid fa-truck-fast" /> Grátis
            </div>
          </div>
        </div>
      </div>
      <div className="hero-wave">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28c70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08c36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25" fill="var(--gray-light)" />
          <path
            d="M0,0V15.81C13,21.25,27.93,25.67,44.24,28.45c69.76,11.6,136.47,7.22,206.42-5.49C336,6.86,395.65,1.92,479,4.08c75.37,2,141.71,22.2,209.71,30.14c68.4,8,136.66,1.49,205-6.58c30.66-3.62,60.62-8.1,89.73-15.49c29-7.39,56.07-17.7,81.24-31.56V0Z"
            opacity=".5" fill="var(--gray-light)" />
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46c59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            fill="var(--gray-light)" />
        </svg>
      </div>
    </section>
  );
}
