// src/App.jsx
import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X, Package } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRef, setPaymentRef] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardData, setCardData] = useState({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [userId, setUserId] = useState('user-123');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });

  // Gateway URL from Vite env or fallback
  const API_URL = import.meta.env.VITE_API_GATEWAY || 'http://54.224.117.4:32257';
  const cleanUrl = API_URL.replace(/^https?:\/\//, ''); // Remueve http:// o https://
  const protocol = API_URL.startsWith('https') ? 'wss' : 'ws';
  // derive WS URL from API_URL (http -> ws, https -> wss)
  const WS_URL = API_URL.replace(/^http/, 'ws');

  const wsRef = useRef(null);

  useEffect(() => {
    console.log(' [App] Iniciando aplicación...');
    fetchBooks();
    fetchCart();
    fetchInventory();
    initWebsocket();
    return () => {
      shutdownWebsocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------ WEBSOCKET ------------------
  function initWebsocket() {
    try {
      const url = WS_URL;
      console.log('🔌 Conectando WebSocket a', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🟢 WebSocket abierto');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // We expect { type: 'STOCK_UPDATE', bookId, stock }
          if (msg?.type === 'STOCK_UPDATE') {
            const bookId = msg.bookId || msg.book_id;
            const newStock = Number(msg.stock ?? msg.new_stock ?? msg.available_units ?? 0);
            console.log('📡 WS stock update:', bookId, newStock);
            handleRemoteStockUpdate(bookId, newStock);
          } else {
            // other messages (ignore)
            console.log('📩 WS msg:', msg);
          }
        } catch (err) {
          console.warn('⚠️ WS parse error', err);
        }
      };

      ws.onerror = (err) => {
        console.error('🔴 WebSocket error:', err);
      };

      ws.onclose = (ev) => {
        console.log('🔴 WebSocket cerrado', ev.reason || ev.code);
        // try reconnect after short delay
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            console.log('🔁 Reintentando conexión WebSocket...');
            initWebsocket();
          }
        }, 3000);
      };
    } catch (err) {
      console.error('❌ initWebsocket error:', err);
    }
  }

  function shutdownWebsocket() {
    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        console.log('🛑 WebSocket cerrado (cleanup)');
      }
    } catch (err) {
      console.warn('⚠️ Error cerrando WebSocket:', err);
    }
  }

  // Reaction when remote stock update arrives
  const handleRemoteStockUpdate = async (bookId, newStock) => {
    try {
      // Update local inventory map
      setInventory(prev => {
        const next = { ...prev, [bookId]: newStock };
        return next;
      });

      // Option B: alert to user
      alert(`Stock actualizado: el libro ${bookId} ahora tiene ${newStock} unidades`);

      // If any item in cart exceeds new stock, adjust cart and notify user.
      const cartItem = cart.find(i => i.book_id === bookId || i.book_id === bookId);
      if (cartItem) {
        const currentQty = Number(cartItem.quantity || 0);
        if (newStock <= 0) {
          // remove item
          try {
            await removeFromCart(bookId);
            alert(`El libro "${cartItem.title}" se eliminó del carrito: stock en 0`);
          } catch (err) {
            console.warn('Error removiendo del carrito en WS update:', err);
          }
        } else if (currentQty > newStock) {
          // reduce quantity to newStock
          try {
            await updateQuantity(bookId, newStock);
            alert(`La cantidad de "${cartItem.title}" en tu carrito fue ajustada a ${newStock} por cambio de stock.`);
          } catch (err) {
            console.warn('Error actualizando cantidad en WS update:', err);
            // As fallback, update local cart state so UI is consistent
            setCart(prev => prev.map(it => it.book_id === bookId ? { ...it, quantity: Math.min(it.quantity, newStock) } : it));
          }
        } else {
          // no action required
        }
      }
    } catch (err) {
      console.error('❌ handleRemoteStockUpdate error:', err);
    }
  };

  // ------------------ FETCH / API ------------------
  const fetchBooks = async () => {
    try {
      console.log('📚 [fetchBooks] Cargando catálogo...');
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/catalog`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();

      // If API returns books merged with stock, respect that; otherwise we keep as-is and rely on inventory map
      setBooks(Array.isArray(data) ? data : []);
      console.log(` [fetchBooks] ${Array.isArray(data) ? data.length : 0} libros cargados`);
    } catch (err) {
      setError(err.message);
      console.error(' [fetchBooks] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCart = async () => {
    try {
      console.log(` [fetchCart] Obteniendo carrito para userId: ${userId}`);
      const response = await fetch(`${API_URL}/cart/${userId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(` [fetchCart] Carrito obtenido: ${data.items?.length || 0} items`);
        setCart(data.items || []);
      } else {
        console.log(' [fetchCart] Carrito vacío o no encontrado');
        setCart([]);
      }
    } catch (err) {
      console.log(' [fetchCart] Error:', err);
      setCart([]);
    }
  };

  const fetchInventory = async () => {
    try {
      console.log('📦 [fetchInventory] Consultando inventario...');
      const response = await fetch(`${API_URL}/inventory/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const inventoryArray = Array.isArray(data) ? data : [];
        const inventoryMap = {};
        inventoryArray.forEach(item => {
          if (item.book_id) inventoryMap[item.book_id] = item.stock || 0;
        });
        setInventory(inventoryMap);
        console.log('✅ [fetchInventory] Inventario mapeado:', inventoryMap);
      } else {
        console.error('❌ [fetchInventory] Error HTTP:', response.status);
      }
    } catch (err) {
      console.error('❌ [fetchInventory] Error:', err.message);
      setInventory({});
    }
  };

  // ------------------ CART ACTIONS ------------------
  const getAvailableStock = (bookId) => {
    const stock = inventory[bookId] !== undefined ? inventory[bookId] : 0;
    return stock;
  };

  const addToCart = async (book) => {
    const availableStock = getAvailableStock(book._id);
    console.log(` [addToCart] Agregando "${book.name}" (Stock: ${availableStock})`);

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

      const textOrJson = await response.text();
      try {
        const json = JSON.parse(textOrJson);
        if (!response.ok) throw new Error(json.message || JSON.stringify(json));
      } catch (_) {
        if (!response.ok) throw new Error(textOrJson || 'Unknown error');
      }

      console.log(' [addToCart] Item agregado');
      await fetchCart();
      console.log(' [addToCart] Refrescando inventario...');
      await fetchInventory();
      alert(`"${book.name}" agregado al carrito`);
    } catch (err) {
      console.error(' [addToCart] Error:', err);
      alert('Error al agregar al carrito: ' + (err.message || err));
    }
  };

  const updateQuantity = async (bookId, newQuantity) => {
    console.log(` [updateQuantity] Book ${bookId}: ${newQuantity}`);
    if (newQuantity < 1) {
      await removeFromCart(bookId);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/cart/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, book_id: bookId, quantity: newQuantity }),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => 'Error');
        throw new Error(txt);
      }

      console.log(' [updateQuantity] Actualizado');
      await fetchCart();
      await fetchInventory();
    } catch (err) {
      console.error(' [updateQuantity] Error:', err);
      alert('No se pudo actualizar la cantidad: ' + (err.message || err));
    }
  };

  const removeFromCart = async (bookId) => {
    console.log(` [removeFromCart] Book ${bookId}`);
    try {
      const response = await fetch(`${API_URL}/cart/remove/${bookId}`, { method: 'DELETE' });
      if (!response.ok) {
        const txt = await response.text().catch(() => 'Error');
        throw new Error(txt);
      }
      console.log(' [removeFromCart] Eliminado');
      await fetchCart();
      await fetchInventory();
    } catch (err) {
      console.error(' [removeFromCart] Error:', err);
      alert('No se pudo eliminar el item del carrito: ' + (err.message || err));
    }
  };

  const clearCart = async (silent = false) => {
    if (!silent && !confirm('¿Vaciar carrito?')) return;
    console.log('🧹 [clearCart] Vaciando...');
    try {
      const response = await fetch(`${API_URL}/cart/clear/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const txt = await response.text().catch(() => 'Error');
        throw new Error(txt);
      }
      console.log('✅ [clearCart] Vaciado');
      await fetchCart();
      await fetchInventory();
    } catch (err) {
      console.error('❌ [clearCart] Error:', err);
      alert('Error al vaciar carrito: ' + (err.message || err));
    }
  };

  // ------------------ ORDER & PAYMENT (igual que tenías) ------------------
  const processOrder = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    if (!confirm('¿Confirmar pedido?')) return;

    try {
      console.log('📦 [processOrder] Creando orden...');
      const orderRes = await fetch(`${API_URL}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: userId })
      });

      if (!orderRes.ok) {
        const errorText = await orderRes.text().catch(() => 'Error');
        console.error('❌ [processOrder] Error:', orderRes.status, errorText);
        alert('Error al crear orden: ' + errorText);
        return;
      }

      const orderData = await orderRes.json();
      console.log('✅ [processOrder] Orden creada:', orderData);
      const orderId = orderData.order_id;

      if (!orderId) {
        alert('Error: No se recibió orderId');
        return;
      }

      setCurrentOrderId(orderId);
      console.log('💾 [processOrder] OrderId guardado:', orderId);
      console.log('🔄 [processOrder] Refrescando inventario tras reserva...');
      await fetchInventory();

      if (orderData.success && orderData.transaction_id) {
        alert(`✅ Orden completada!\nID: ${orderId}`);
        await clearCart(true);
        setShowCart(false);
        setCurrentOrderId(null);
        return;
      }

      const totalAmount = getCartTotal();
      const created = await createPaymentAndOpenModal(orderId, totalAmount);
      if (!created) {
        alert('Orden creada pero no se pudo iniciar pago');
        setCurrentOrderId(null);
      }
    } catch (err) {
      console.error('❌ [processOrder] Error:', err);
      alert('Error: ' + err.message);
      setCurrentOrderId(null);
    }
  };

  const createPaymentAndOpenModal = async (orderId, amount) => {
    try {
      console.log('💳 [createPayment] Creando pago...');
      const res = await fetch(`${API_URL}/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, orderId, amount, currency: 'COP',
          description: `Pago pedido ${orderId}`,
          buyerEmail: user?.email || 'test@example.com',
          paymentMethod: 'credit_card',
        }),
      });

      if (!res.ok) {
        console.error('❌ [createPayment] Error:', res.status);
        return false;
      }

      const payment = await res.json();
      if (!payment.reference) {
        console.error('❌ [createPayment] Sin referencia');
        return false;
      }

      console.log('✅ [createPayment] Ref:', payment.reference);
      setPaymentRef(payment.reference);
      setShowPaymentModal(true);
      return true;
    } catch (err) {
      console.error('❌ [createPayment] Error:', err);
      return false;
    }
  };

  const processPayment = async () => {
    if (!paymentRef) {
      alert('Referencia no encontrada');
      return;
    }
    if (!cardData.cardNumber || !cardData.cardHolder) {
      alert('Ingrese datos de tarjeta');
      return;
    }

    console.log('💳 [processPayment] Procesando pago...');
    setProcessingPayment(true);

    try {
      const res = await fetch(`${API_URL}/payment/${paymentRef}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ [processPayment] Respuesta no JSON');
        alert('Error del servidor');
        setProcessingPayment(false);
        return;
      }

      const result = await res.json();
      console.log('📄 [processPayment] Respuesta:', result);

      if (!res.ok && result.error === 'already processed') {
        const paymentStatus = result.status || result.payment?.status;
        console.log('⚠️ [processPayment] Ya procesado:', paymentStatus);
        if (paymentStatus === 'APPROVED') {
          alert('✅ Pago ya aprobado');
          await clearCart(true);
          setShowPaymentModal(false);
          setPaymentRef(null);
          setCardData({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
          setShowCart(false);
        } else {
          alert(`⚠️ Ya procesado: ${paymentStatus}`);
        }
        setProcessingPayment(false);
        return;
      }

      if (!res.ok) {
        console.error('❌ [processPayment] Fallido:', result);
        alert('❌ Error: ' + (result.error || result.message || 'Desconocido'));
        setProcessingPayment(false);
        return;
      }

      const status = result.status || result.Status;
      const responseMsg = result.responseMessage || result.ResponseMessage || '';
      const transactionId = result.transactionId || result.TransactionID || '';

      console.log('📊 [processPayment] Status:', status, 'TxID:', transactionId);

      if (currentOrderId) {
        try {
          console.log(`📤 [processPayment] Notificando Order Service...`);
          await fetch(`${API_URL}/orders/${currentOrderId}/payment-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify({ status, transactionId, message: responseMsg })
          });
          console.log('✅ [processPayment] Notificado');
          setCurrentOrderId(null);
        } catch (notifyErr) {
          console.error('❌ [processPayment] Error notificando:', notifyErr);
        }
      }

      if (status === 'APPROVED') {
        console.log('✅ [processPayment] APROBADO');
        alert('✅ Pago aprobado: ' + (responseMsg || 'Exitoso'));
        await clearCart(true);
        setShowPaymentModal(false);
        setPaymentRef(null);
        setCardData({ cardNumber: '', cardHolder: '', expiryDate: '', cvv: '' });
        setShowCart(false);
        console.log('🔄 [processPayment] Refrescando inventario...');
        await fetchInventory();
      } else if (status === 'DECLINED' || status === 'REJECTED') {
        console.log('❌ [processPayment] RECHAZADO');
        alert('❌ Rechazado: ' + (responseMsg || 'Declinado'));
      } else {
        console.log(`⚠️ [processPayment] Estado: ${status}`);
        alert('⚠️ Estado: ' + status + '\n' + responseMsg);
      }
    } catch (err) {
      console.error('❌ [processPayment] Error:', err);
      alert('Error: ' + err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  // ------------------ AUTH ------------------
  const handleLogin = async () => {
    try {
      console.log('🔐 [handleLogin] Intentando login...');
      const res = await fetch(`${API_URL}/users/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authForm.username, password: authForm.password }),
      });

      if (!res.ok) {
        console.error('❌ [handleLogin] Fallido');
        alert('Credenciales incorrectas');
        return;
      }

      const data = await res.json();
      if (data.error || !data.token || !data.user) {
        alert('Error: ' + (data.error || 'Respuesta incompleta'));
        return;
      }

      console.log('✅ [handleLogin] Exitoso:', data.user.username);
      setToken(data.token);
      setUser(data.user);
      setUserId(data.user.id || data.user._id || 'user-123');
      setShowLogin(false);
      setAuthForm({ username: '', email: '', password: '' });
      alert(`✅ Bienvenido, ${data.user.username}`);
      await fetchCart();
    } catch (err) {
      console.error('❌ [handleLogin] Error:', err);
      alert('Error de conexión');
    }
  };

  const handleRegister = async () => {
    try {
      console.log('📝 [handleRegister] Intentando registro...');
      const res = await fetch(`${API_URL}/users/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authForm.username, email: authForm.email, password: authForm.password }),
      });

      if (!res.ok) {
        console.error('❌ [handleRegister] Fallido');
        alert('Error al registrarse');
        return;
      }

      console.log('✅ [handleRegister] Exitoso');
      alert('Registro exitoso. Ahora inicia sesión.');
      setShowRegister(false);
      setShowLogin(true);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (err) {
      console.error('❌ [handleRegister] Error:', err);
      alert('Error de conexión');
    }
  };

  const handleLogout = () => {
    console.log('👋 [handleLogout] Cerrando sesión');
    setToken(null);
    setUser(null);
    setUserId('user-123');
    alert('Sesión cerrada');
  };

  // ------------------ HELPERS ------------------
  const getCartTotal = () => cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const getCartItemCount = () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const keyFor = (id, i) => (id ? `${id}-${i}` : `item-${i}`);

  // ------------------ RENDER ------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 p-6 text-white bg-indigo-600 shadow-md">
        <div className="container flex items-center justify-between mx-auto">
          <h1 className="text-3xl font-bold">📚 Librería Telemática</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm font-medium">👋 {user.username}</span>
                <button onClick={handleLogout} className="px-3 py-1 text-sm bg-red-500 rounded hover:bg-red-600">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} className="px-3 py-1 text-sm text-indigo-600 bg-white rounded hover:bg-indigo-50">
                  Iniciar sesión
                </button>
                <button onClick={() => setShowRegister(true)} className="px-3 py-1 text-sm text-green-700 bg-green-100 rounded hover:bg-green-200">
                  Registrarse
                </button>
              </>
            )}
            <button onClick={() => setShowCart(!showCart)} className="relative flex items-center gap-2 px-4 py-2 text-indigo-600 bg-white rounded-lg hover:bg-indigo-50">
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
            <h3 className="mb-2 font-bold">Error al cargar libros</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <h2 className="mb-6 text-2xl font-semibold text-gray-800">Catálogo de Libros</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {books.map((book, i) => (
                <div key={keyFor(book._id, i)} className="overflow-hidden transition-shadow bg-white rounded-lg shadow-md hover:shadow-xl">
                  <div className="relative flex items-center justify-center w-full h-64 overflow-hidden bg-white">
                    {book.image ? (
                      <img src={book.image} alt={book.name} className="object-contain w-full h-full p-4" onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (!parent.querySelector('.placeholder-icon')) {
                          const icon = document.createElement('div');
                          icon.className = 'flex items-center justify-center w-full h-48 placeholder-icon';
                          icon.innerHTML = '<span class="text-6xl">📚</span>';
                          parent.appendChild(icon);
                        }
                      }} />
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
                      <span className={`text-sm px-2 py-1 rounded ${
                        getAvailableStock(book._id) > 5 ? 'bg-green-100 text-green-800' :
                        getAvailableStock(book._id) > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        Stock: {getAvailableStock(book._id)}
                      </span>
                    </div>
                    <button onClick={() => addToCart(book)} disabled={getAvailableStock(book._id) === 0}
                      className="flex items-center justify-center w-full gap-2 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
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
          <div className="fixed top-0 right-0 w-full h-full max-w-md overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-4 text-xl font-bold">
                        <span>Total:</span>
                        <span className="text-indigo-600">${getCartTotal().toLocaleString()}</span>
                      </div>
                      <button onClick={() => clearCart()} className="w-full py-3 mb-3 text-white bg-red-500 rounded-lg hover:bg-red-600">
                        Vaciar Carrito
                      </button>
                      <button onClick={processOrder} className="flex items-center justify-center w-full gap-2 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700">
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

      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-60">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">💳 Procesar Pago</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-600">Referencia: <span className="font-mono">{paymentRef}</span></p>
            <p className="mb-4 text-sm text-gray-600">Total: <strong>${getCartTotal().toLocaleString()}</strong></p>
            <div className="space-y-3">
              <input value={cardData.cardNumber} onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded" placeholder="Número de tarjeta" />
              <input value={cardData.cardHolder} onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })}
                className="w-full px-3 py-2 border rounded" placeholder="Titular" />
              <div className="flex gap-2">
                <input value={cardData.expiryDate} onChange={(e) => setCardData({ ...cardData, expiryDate: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded" placeholder="MM/YY" />
                <input value={cardData.cvv} onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                  className="w-24 px-3 py-2 border rounded" placeholder="CVV" />
              </div>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300">
                  Cancelar
                </button>
                <button onClick={processPayment} disabled={processingPayment}
                  className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
                  {processingPayment ? 'Procesando...' : 'Pagar ahora'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
