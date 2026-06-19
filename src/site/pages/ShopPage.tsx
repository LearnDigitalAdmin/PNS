import { useSite } from '../context/SiteContext';

export default function ShopPage() {
  const { cart, addToCart, toggleCart, products, productsLoading } = useSite();
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7">
        <div>
          <p className="section-eyebrow mb-1">P&amp;S Merchandise</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title">The Shop</h2>
        </div>
        <button onClick={toggleCart} className="btn-dark">
          Cart ({count})
        </button>
      </div>

      {productsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ width: 28, height: 28, border: '2px solid rgba(0,0,0,.1)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : products.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--mid-gray)' }}>
          The shop is being restocked — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => {
            const soldOut = !p.digital && p.stock === 0;
            return (
              <div
                className={`product-card reveal ${p.wide ? 'col-span-2' : ''} ${soldOut ? '' : 'cursor-pointer'}`}
                onClick={() => !soldOut && addToCart(p.name, p.price)}
                key={p.id}
                style={soldOut ? { opacity: 0.55 } : undefined}
              >
                <div className={`overflow-hidden h-48 ${p.digital ? 'relative' : ''}`}>
                  <img loading="lazy" decoding="async" src={p.image} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  {p.digital && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="glass-dark p-3 text-center">
                        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>P&amp;S</p>
                        <p style={{ fontSize: '.4rem', letterSpacing: '.3em', color: 'var(--gold)', textTransform: 'uppercase' }}>Digital Edition</p>
                      </div>
                    </div>
                  )}
                  {soldOut && (
                    <div className="absolute top-2 left-2">
                      <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '.56rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '.2rem .5rem' }}>
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p style={{ fontSize: '.56rem', color: 'var(--warm-gray)', textTransform: 'uppercase' }}>{p.category}</p>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '.95rem', marginTop: '.18rem' }}>{p.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '.82rem' }}>KES {p.price.toLocaleString()}</span>
                    <button className="btn-gold" style={{ fontSize: '.56rem', padding: '.27rem .65rem' }} disabled={soldOut}>
                      {soldOut ? 'Sold Out' : p.digital ? 'Add to Cart' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}