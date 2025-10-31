import { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, X, Package } from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [userId] = useState('user-123');

  const API_URL = 'http://localhost:4500';

  useEffect(() => {
    fetchBooks();
    fetchCart();
    fetchInventory();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/catalog`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setBooks(data);
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
          if (item.book_id && item.book_id !== 'book001') {
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
          quantity: 1
        })
      });
      
      if (response.ok) {
        await updateInventoryStock(book._id, availableStock - 1);
        await fetchCart();
        await fetchInventory();
        alert(`"${book.name}" agregado al carrito`);
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
          stock: newStock
        })
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
          quantity: newQuantity
        })
      });
      
      if (response.ok) {
        await fetchCart();
      }
    } catch (err) {
      console.error('Error updating quantity:', err);
    }
  };

  const removeFromCart = async (bookId) => {
    try {
      const response = await fetch(`${API_URL}/cart/remove/${bookId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchCart();
      }
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  const clearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return;
    
    try {
      const response = await fetch(`${API_URL}/cart/clear/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchCart();
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!confirm('¿Confirmar pedido?')) return;

    try {
      // Crear órdenes para cada item del carrito
      const orderPromises = cart.map(item => 
        fetch(`${API_URL}/order/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            book_id: item.book_id,
            quantity: item.quantity,
            price: item.price
          })
        })
      );

      await Promise.all(orderPromises);
      
      // Vaciar carrito después de crear órdenes
      await clearCart();
      
      alert('✅ Pedido realizado con éxito! Estado: CREATED');
      setShowCart(false);
    } catch (err) {
      alert('Error al procesar el pedido');
      console.error(err);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 p-6 text-white bg-indigo-600 shadow-md">
        <div className="container flex items-center justify-between mx-auto">
          <h1 className="text-3xl font-bold">📚 Librería Telemática</h1>
          
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
              {books.map(book => (
                <div 
                  key={book._id} 
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
                    <h3 className="mb-2 text-xl font-bold text-gray-900">
                      {book.name}
                    </h3>
                    <p className="mb-2 text-gray-600">
                      por {book.author}
                    </p>
                    <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                      {book.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-indigo-600">
                        ${book.price.toLocaleString()}
                      </span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        getAvailableStock(book._id) > 5 ? 'bg-green-100 text-green-800' : 
                        getAvailableStock(book._id) > 0 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
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
                <button 
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
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
                    {cart.map(item => (
                      <div key={item.book_id} className="p-4 rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="flex-1 font-semibold text-gray-900">
                            {item.title}
                          </h3>
                          <button
                            onClick={() => removeFromCart(item.book_id)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        
                        <p className="mb-3 font-bold text-indigo-600">
                          ${item.price.toLocaleString()}
                        </p>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.book_id, item.quantity - 1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Minus size={16} />
                          </button>
                          
                          <span className="w-8 font-semibold text-center">
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => updateQuantity(item.book_id, item.quantity + 1)}
                            className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                          >
                            <Plus size={16} />
                          </button>
                          
                          <span className="ml-auto font-bold">
                            ${(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 mb-4 border-t">
                    <div className="flex items-center justify-between mb-4 text-xl font-bold">
                      <span>Total:</span>
                      <span className="text-indigo-600">
                        ${getCartTotal().toLocaleString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={clearCart}
                      className="w-full py-3 mb-3 text-white transition-colors bg-red-500 rounded-lg hover:bg-red-600"
                    >
                      Vaciar Carrito
                    </button>
                    
                    <button
                      onClick={processOrder}
                      className="flex items-center justify-center w-full gap-2 py-3 text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Package size={20} />
                      Confirmar Pedido
                    </button>
                  </div>
                </>
              )}
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