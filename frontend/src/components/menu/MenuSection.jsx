import { useEffect, useState } from 'react';
import { catalogService } from '../../services/catalogService';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import ProductCard from './ProductCard';
import SingleFlavorModal from './SingleFlavorModal';
import TwoFlavorsModal from './TwoFlavorsModal';

export default function MenuSection() {
  const [destaques, setDestaques] = useState([]);
  const [salgadas, setSalgadas] = useState([]);
  const [doces, setDoces] = useState([]);
  const [bebidas, setBebidas] = useState([]);
  const [showFullMenu, setShowFullMenu] = useState(false);

  const [singleFlavorProduto, setSingleFlavorProduto] = useState(null);
  const [twoFlavorsProduto, setTwoFlavorsProduto] = useState(null);

  const { addToCart } = useCart();
  const showToast = useToast();

  useEffect(() => {
    // Promise.allSettled em vez de 4 `await`s em sequência: antes, se só
    // getFeatured() falhasse, as outras 3 chamadas nunca rodavam e o cardápio
    // inteiro ficava vazio (sem nenhuma mensagem, parecendo "não há produtos" em vez
    // de "erro ao carregar"). Agora elas disparam em paralelo (mais rápido) e um
    // erro isolado não derruba as demais.
    (async () => {
      const [r1, r2, r3, r4] = await Promise.allSettled([
        catalogService.getFeatured(),
        catalogService.getByCategory('pizza_salgada'),
        catalogService.getByCategory('pizza_doce'),
        catalogService.getByCategory('bebida'),
      ]);
      if (r1.status === 'fulfilled') setDestaques(r1.value);
      if (r2.status === 'fulfilled') setSalgadas(r2.value);
      if (r3.status === 'fulfilled') setDoces(r3.value);
      if (r4.status === 'fulfilled') setBebidas(r4.value);

      const primeiraFalha = [r1, r2, r3, r4].find((r) => r.status === 'rejected');
      if (primeiraFalha) showToast(primeiraFalha.reason.message, 'erro');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fonte única para o modal de "dois sabores": os mesmos produtos que já buscamos
  // da API acima, filtrados pelos que aceitam meia a meia — sem nenhuma chamada de
  // rede extra, e sem depender de uma lista solta/hardcoded (ver TwoFlavorsModal).
  // Bebidas nunca têm permiteDoisSabores, então só salgadas+doces interessam aqui.
  const saboresDisponiveis = [...salgadas, ...doces].filter((p) => p.permiteDoisSabores);

  // Bebidas não têm opção de borda/dois sabores — vão direto para o carrinho.
  // Pizzas abrem o modal de personalização (é aí que a borda recheada é escolhida).
  function handleAdd(produto) {
    if (produto.categoria === 'bebida') {
      addToCart({ id: produto.id, name: produto.nome, price: produto.precoBase, img: produto.imagem });
    } else {
      setSingleFlavorProduto(produto);
    }
  }

  function toggleFullMenu() {
    const abrir = !showFullMenu;
    setShowFullMenu(abrir);
    if (abrir) {
      setTimeout(() => document.getElementById('fullMenuSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }

  return (
    <section id="menu">
      <div className="wrapper p-top">
        <div className="text-center">
          <h5>Nosso cardápio</h5>
          <h2>As Mais Pedidas</h2>
        </div>

        <div className="featured-grid" id="featuredGrid">
          {destaques.map((p) => (
            <ProductCard key={p.id} produto={p} onAdd={handleAdd} onTwoFlavors={setTwoFlavorsProduto} />
          ))}
        </div>

        <div className="text-center">
          <a href="#full-menu" className="btn btn-ver-mais" onClick={(e) => { e.preventDefault(); toggleFullMenu(); }}>
            <i className={`fa-regular ${showFullMenu ? 'fa-eye-slash' : 'fa-eye'}`} />{' '}
            {showFullMenu ? 'Fechar cardápio' : 'Ver cardápio completo'}
          </a>
        </div>

        {showFullMenu && (
          <div id="fullMenuSection" className="full-menu-section">
            <div className="wrapper" style={{ padding: 0 }}>
              <div className="text-center full-menu-header">
                <h5>Explore nossos sabores</h5>
                <h2>Cardápio completo</h2>
              </div>

              <div className="featured-grid full-menu-grid">
                {salgadas.map((p) => (
                  <ProductCard key={p.id} produto={p} onAdd={handleAdd} onTwoFlavors={setTwoFlavorsProduto} />
                ))}
              </div>

              <div className="text-center" style={{ margin: '2rem 0 1rem' }}>
                <h3 style={{ color: 'var(--primary)' }}><i className="fa-solid fa-cake-candles" /> Pizzas Doces</h3>
              </div>
              <div className="featured-grid full-menu-grid">
                {doces.map((p) => (
                  <ProductCard key={p.id} produto={p} onAdd={handleAdd} onTwoFlavors={setTwoFlavorsProduto} />
                ))}
              </div>

              <div className="text-center" style={{ margin: '2rem 0 1rem' }}>
                <h3 style={{ color: 'var(--primary)' }}><i className="fa-solid fa-wine-bottle" /> Bebidas</h3>
              </div>
              <div className="featured-grid full-menu-grid">
                {bebidas.map((p) => (
                  <ProductCard key={p.id} produto={p} onAdd={handleAdd} onTwoFlavors={setTwoFlavorsProduto} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SingleFlavorModal key={singleFlavorProduto?.id} produto={singleFlavorProduto} onClose={() => setSingleFlavorProduto(null)} />
      <TwoFlavorsModal produto={twoFlavorsProduto} sabores={saboresDisponiveis} onClose={() => setTwoFlavorsProduto(null)} />
    </section>
  );
}
