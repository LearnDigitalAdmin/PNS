import { useSite } from '../context/SiteContext';

export default function CartSidebar() {
  const { cart, cartVisible, toggleCart, changeQty, checkoutCart, checkoutSuccess } = useSite();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div
      id="cartSidebar"
      className={cartVisible ? '' : 'hidden'}
      style={{
        position: 'fixed',
        insetBlock: 0,
        right: 0,
        zIndex: 500,
        width: '300px',
        background: 'var(--warm-white)',
        borderLeft: '1px solid rgba(0,0,0,.1)',
        boxShadow: '-4px 0 20px rgba(0,0,0,.1)',
        top: 'var(--chrome-h)',
        bottom: 0,
      }}
    >
      <div className="flex flex-col h-full p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', fontWeight: 700 }}>Your Cart</h3>
          <button onClick={toggleCart} style={{ color: 'var(--warm-gray)', fontSize: '1.4rem', background: 'none', border: 'none', cursor: 'pointer' }}>
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400">Your cart is empty.</p>
          ) : (
            cart.map((item, idx) => (
              <div key={item.name} style={{ borderBottom: '1px solid rgba(0,0,0,.06)', padding: '.55rem 0' }} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--warm-gray)' }}>
                    KES {item.price.toLocaleString()} × {item.qty}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(idx, -1)} style={{ width: 20, height: 20, border: '1px solid #ccc', cursor: 'pointer', fontSize: '.7rem' }}>
                    -
                  </button>
                  <span className="text-sm w-4 text-center">{item.qty}</span>
                  <button onClick={() => changeQty(idx, 1)} style={{ width: 20, height: 20, border: '1px solid #ccc', cursor: 'pointer', fontSize: '.7rem' }}>
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(0,0,0,.08)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-sm">Total</span>
            <span style={{ fontWeight: 700, color: 'var(--gold)' }}>KES {total.toLocaleString()}</span>
          </div>
          <button onClick={checkoutCart} className="btn-gold w-full">
            Checkout (Demo)
          </button>
          {checkoutSuccess && (
            <div className="text-center py-3 fade-in-up">
              <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: 'var(--gold)' }}>✦ Order placed! (Demo)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
