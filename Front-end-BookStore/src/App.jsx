import { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X, Package, CreditCard, User } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);

  // Payment UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRef, setPaymentRef] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: '',
  });

  // -----------------------
  // USER SERVICE INTEGRATION
  // -----------------------
  // Ahora userId es actualizable cuando el usuario haga login
  const [userId, setUserId] = useState('user-123');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  // authForm usa 'username' y 'password' para coincidir con tu AuthController
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });

  // API gateway base (gateway should proxy /payment -> /api/payments)
  const API_URL = 'http://localhost:4500';

  useEffect(() => {
    checkSession();
    fetchBooks();
    fetchCart();
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Comprueba token y obtiene profile si existe
  const checkSession = async () => {
    const t = localStorage.getItem('token');
    if (!t) return;
    try {
     const res = await fetch(`${API_URL}/users/api/users/profile/${u.username}`, {
      headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        return;
      }
      const profile = await res.json();
      setToken(t);
      setUser(profile);
      setUserId(profile.id || profile._id || profile.userId || 'user-123');
    } catch (err) {
      console.error('checkSession error:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  // Login -> guarda token y user
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/users/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authForm.username,
          password: authForm.password,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('Login failed:', res.status, txt);
        alert('Credenciales incorrectas o error en login');
        return;
      }

      const data = await res.json();
      // Tu AuthController devuelve { user, token }
      const tok = data.token ?? data['token'];
      const u = data.user ?? data['user'] ?? null;

      if (tok) {
        localStorage.setItem('token', tok);
        setToken(tok);
      }
      if (u) {
        setUser(u);
        setUserId(u.id || u._id || 'user-123');
        localStorage.setItem('user', JSON.stringify(u));
      } else {
        // Si no vino user, al menos setear username simple
        setUser({ username: authForm.username });
      }

      setShowLogin(false);
      setAuthForm({ username: '', email: '', password: '' });
      alert(`Bienvenido, ${authForm.username}`);
    } catch (err) {
      console.error('handleLogin error:', err);
      alert('Error al iniciar sesión (conexión)');
    }
  };

  // Register -> llama al endpoint register
  const handleRegister = async () => {
    try {
      const res = await fetch(`${API_URL}/users/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authForm.username,
          email: authForm.email,
          password: authForm.password,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('Register failed:', res.status, txt);
        alert('Error al registrarse');
        return;
      }
      // normalmente register devuelve user + token; aquí avisamos al usuario
      const data = await res.json().catch(() => ({}));
      alert('Registro exitoso. Ahora puedes iniciar sesión.');
      setShowRegister(false);
      setShowLogin(true);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (err) {
      console.error('handleRegister error:', err);
      alert('Error al registrarse (conexión)');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUserId('user-123');
    alert('Sesión cerrada');
  };

  // -----------------------
  // ORIGINAL FUNCTIONS (preservadas y sin cambios lógicos)
  // -----------------------
  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/catalog`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setBooks(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      const response = await fetch(`${API_URL}/cart/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setCart(data.items || []);
      } else {
        setCart([]);
      }
    } catch (err) {
      console.log('Carrito vacío o error:', err);
      setCart([]);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory/`);
      if (response.ok) {
        const data = await response.json();
        const inventoryArray = Array.isArray(data) ? data : [];
        const inventoryMap = {};
        inventoryArray.forEach(item => {
          if (item.book_id) {
            inventoryMap[item.book_id] = item.stock || 0;
          }
        });
        setInventory(inventoryMap);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setInventory({});
    }
  };

  const getAvailableStock = (bookId) => {
    return inventory[bookId] !== undefined ? inventory[bookId] : 0;
  };

  const addToCart = async (book) => {
    const availableStock = getAvailableStock(book._id);

    if (availableStock <= 0) {
      alert('Este libro no tiene stock disponible');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          book_id: book._id,
          title: book.name,
          price: book.price,
          quantity: 1,
        }),
      });

      if (response.ok) {
        await updateInventoryStock(book._id, availableStock - 1);
        await fetchCart();
        await fetchInventory();
        alert(`"${book.name}" agregado al carrito`);
      } else {
        const text = await response.text().catch(() => 'Error');
        alert('Error al agregar al carrito: ' + text);
      }
    } catch (err) {
      alert('Error al agregar al carrito');
      console.error(err);
    }
  };

  const updateInventoryStock = async (bookId, newStock) => {
    try {
      await fetch(`${API_URL}/inventory/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          stock: newStock,
        }),
      });
    } catch (err) {
      console.error('Error updating inventory:', err);
    }
  };

  const updateQuantity = async (bookId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(bookId);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cart/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          book_id: bookId,
          quantity: newQuantity,
        }),
      });

      if (response.ok) {
        await fetchCart();
      } else {
        console.error('Error updating quantity', response.status);
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeFromCart = async (bookId) => {
    try {
      const response = await fetch(`${API_URL}/cart/remove/${bookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCart();
      } else {
        console.error('Error removing item', response.status);
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const clearCart = async (silent = false) => {
    if (!silent && !confirm('¿Vaciar todo el carrito?')) return;

    try {
      const response = await fetch(`${API_URL}/cart/clear/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCart();
      } else {
        console.error('Error clearing cart', response.status);
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  // processOrder: create orders, then create payment and open modal
  const processOrder = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!confirm('¿Confirmar pedido?')) return;

    try {
      // create an order batch id (used to link payment)
      const orderBatchId = `ORDER-${Date.now()}`;

      // create orders for each item
      const orderPromises = cart.map(item =>
        fetch(`${API_URL}/order/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            book_id: item.book_id,
            quantity: item.quantity,
            price: item.price,
            orderBatchId: orderBatchId, // optional for grouping
          }),
        })
      );

      await Promise.all(orderPromises);

      // create payment in payment-service and open modal
      const totalAmount = getCartTotal();

      const created = await createPaymentAndOpenModal(orderBatchId, totalAmount);
      if (!created) {
        alert('No se pudo crear la referencia de pago.');
      } else {
        // show cart so user can click pay (modal opens automatically)
        setShowCart(true);
      }
    } catch (err) {
      console.error('Error en processOrder:', err);
      alert('Error al procesar el pedido');
    }
  };

  // Create payment via API gateway, then open payment modal
  const createPaymentAndOpenModal = async (orderId, amount) => {
    try {
      const res = await fetch(`${API_URL}/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          orderId: orderId,
          amount: amount,
          currency: 'COP',
          description: `Pago por pedido ${orderId}`,
          buyerEmail: 'testbuyer@example.com',
          paymentMethod: 'credit_card',
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('create payment failed', res.status, body);
        return false;
      }

      const payment = await res.json();
      if (!payment.reference) {
        console.error('payment response missing reference', payment);
        return false;
      }

      setPaymentRef(payment.reference);
      setShowPaymentModal(true);
      return true;
    } catch (err) {
      console.error('Error creating payment:', err);
      return false;
    }
  };

  // Process payment by calling /payment/{reference}/process with card data
  const processPayment = async () => {
    if (!paymentRef) {
      alert('Referencia de pago no encontrada');
      return;
    }

    if (!cardData.cardNumber || !cardData.cardHolder) {
      alert('Ingrese los datos de la tarjeta');
      return;
    }

    setProcessingPayment(true);

    try {
      const res = await fetch(`${API_URL}/payment/${paymentRef}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: cardData.cardNumber,
          cardHolder: cardData.cardHolder,
          expiryDate: cardData.expiryDate,
          cvv: cardData.cvv,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('process payment failed', res.status, body);
        alert('Error al procesar el pago');
        setProcessingPayment(false);
        return;
      }

      const result = await res.json();
      const status = result.status || result.Status || result.Status;

      if (status === 'APPROVED') {
        alert('✅ Pago aprobado: ' + (result.responseMessage || result.ResponseMessage || 'Aprobado'));
        // Clear cart after successful payment
        await clearCart(true);
        setShowPaymentModal(false);
        setPaymentRef(null);
        setCardData({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
        setShowCart(false);
      } else if (status === 'DECLINED') {
        alert('❌ Pago rechazado: ' + (result.responseMessage || result.ResponseMessage || 'Rechazado'));
      } else {
        alert('⚠️ Pago con error: ' + (result.responseMessage || result.ResponseMessage || 'Error'));
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Error procesando pago (conexión)');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  };

  // Helper to avoid duplicate keys warning: use index fallback
  const keyFor = (id, i) => (id ? `${id}-${i}` : `item-${i}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 p-6 text-white bg-indigo-600 shadow-md">
        <div className="container flex items-center justify-between mx-auto">
          <h1 className="text-3xl font-bold">📚 Librería Telemática</h1>

          <div className="flex items-center gap-3">
            {/* User UI */}
            {user ? (
              <>
                <span className="text-sm font-medium">👋 {user.username || user.email || 'Usuario'}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm bg-red-500 rounded hover:bg-red-600"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-3 py-1 text-sm text-indigo-600 bg-white rounded hover:bg-indigo-50"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => setShowRegister(true)}
                  className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded hover:bg-green-200"
                >
                  Registrarse
                </button>
              </>
            )}

            <button
              onClick={() => setShowCart(!showCart)}
              className="relative flex items-center gap-2 px-4 py-2 text-indigo-600 transition-colors bg-white rounded-lg hover:bg-indigo-50"
            >
              <ShoppingCart size={20} />
              <span>Carrito</span>
              {getCartItemCount() > 0 && (
                <span className="absolute flex items-center justify-center w-6 h-6 text-xs text-white bg-red-500 rounded-full -top-2 -right-2">
                  {getCartItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container p-8 mx-auto">
        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block w-12 h-12 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Cargando libros...</p>
          </div>
        )}

        {error && (
          <div className="px-6 py-4 text-red-800 border border-red-200 rounded-lg bg-red-50">
            <h3 className="mb-2 font-bold">Error al cargar los libros</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">
              Catálogo de Libros
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book, i) => (
                <div
                  key={keyFor(book._id, i)}
                  className="overflow-hidden transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-xl"
                >
                  <div className="relative flex items-center justify-center w-full h-64 overflow-hidden bg-white">
                    {book.image ? (
                      <img
                        src={book.image}
                        alt={book.name}
                        className="object-contain w-full h-full p-4"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          if (!parent.querySelector('.placeholder-icon')) {
                            const icon = document.createElement('div');
                            icon.className = 'flex items-center justify-center w-full h-48 placeholder-icon';
                            icon.innerHTML = '<span class="text-6xl">📚</span>';
                            parent.appendChild(icon);
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-48">
                        <span className="text-6xl">📚</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-gray-900">{book.name}</h3>
                    <p className="mb-2 text-gray-600">por {book.author}</p>
                    <p className="mb-4 text-sm text-gray-500 line-clamp-2">{book.description}</p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-indigo-600">${Number(book.price).toLocaleString()}</span>
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          getAvailableStock(book._id) > 5
                            ? 'bg-green-100 text-green-800'
                            : getAvailableStock(book._id) > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Stock: {getAvailableStock(book._id)}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(book)}
                      disabled={getAvailableStock(book._id) === 0}
                      className="flex items-center justify-center w-full gap-2 py-2 text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={18} />
                      {getAvailableStock(book._id) === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {showCart && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowCart(false)}>
          <div
            className="fixed top-0 right-0 w-full h-full max-w-md overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🛒 Mi Carrito</h2>
                <button onClick={() => setShowCart(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Tu carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 space-y-4">
                    {cart.map((item, i) => (
                      <div key={keyFor(item.book_id, i)} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="flex-1 font-semibold text-gray-900">{item.title}</h3>
                          <button onClick={() => removeFromCart(item.book_id)} className="ml-2 text-red-500 hover:text-red-700">
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <p className="mb-3 font-bold text-indigo-600">${Number(item.price).toLocaleString()}</p>

                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(item.book_id, item.quantity - 1)} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                            <Minus size={16} />
                          </button>

                          <span className="w-8 font-semibold text-center">{item.quantity}</span>

                          <button onClick={() => updateQuantity(item.book_id, item.quantity + 1)} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                            <Plus size={16} />
                          </button>

                          <span className="ml-auto font-bold">${(Number(item.price) * Number(item.quantity)).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 mb-4 border-t">
                      <div className="flex items-center justify-between mb-4 text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-indigo-600">${getCartTotal().toLocaleString()}</span>
                      </div>

                      <button onClick={() => clearCart()} className="w-full py-3 mb-3 text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600">
                        Vaciar Carrito
                      </button>

                      <button onClick={processOrder} className="flex items-center justify-center w-full gap-2 py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700">
                        <Package size={20} />
                        Confirmar Pedido
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">💳 Procesar Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <p className="mb-2 text-sm text-gray-600">Referencia: <span className="font-mono">{paymentRef || '—'}</span></p>
            <p className="mb-4 text-sm text-gray-600">Total: <strong>${getCartTotal().toLocaleString()}</strong></p>

            <div className="space-y-3">
              <input
                value={cardData.cardNumber}
                onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Número de tarjeta (pruebas)"
              />
              <input
                value={cardData.cardHolder}
                onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="Titular"
              />
              <div className="flex gap-2">
                <input
                  value={cardData.expiryDate}
                  onChange={(e) => setCardData({ ...cardData, expiryDate: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="MM/YY"
                />
                <input
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                  className="w-24 px-3 py-2 border rounded"
                  placeholder="CVV"
                />
              </div>

              <div className="flex gap-3 mt-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
                  Cancelar
                </button>

                <button onClick={async () => {
                  // If no paymentRef yet, create it first
                  if (!paymentRef) {
                    const created = await createPaymentAndOpenModal(`ORDER-TMP-${Date.now()}`, getCartTotal());
                    if (!created) return;
                  }
                  await processPayment();
                }} disabled={processingPayment} className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-300">
                  {processingPayment ? 'Procesando...' : 'Pagar ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOGIN Modal */}
      {showLogin && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-center">Iniciar Sesión</h2>
            <input
              className="w-full p-2 mb-3 border rounded"
              placeholder="Usuario"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            />
            <input
              type="password"
              className="w-full p-2 mb-3 border rounded"
              placeholder="Contraseña"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <div className="flex gap-3">
              <button
                onClick={handleLogin}
                className="flex-1 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Entrar
              </button>
              <button
                onClick={() => { setShowLogin(false); setShowRegister(true); }}
                className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER Modal */}
      {showRegister && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="w-full max-w-sm p-6 bg-white rounded-lg shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-center">Registrarse</h2>
            <input
              className="w-full p-2 mb-3 border rounded"
              placeholder="Usuario"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
            />
            <input
              type="email"
              className="w-full p-2 mb-3 border rounded"
              placeholder="Correo"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              type="password"
              className="w-full p-2 mb-3 border rounded"
              placeholder="Contraseña"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRegister}
                className="flex-1 py-2 text-white bg-green-600 rounded hover:bg-green-700"
              >
                Registrarse
              </button>
              <button
                onClick={() => { setShowRegister(false); setShowLogin(true); }}
                className="flex-1 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="p-4 mt-12 text-center text-white bg-gray-800">
        <p>© 2025 BookStore. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
