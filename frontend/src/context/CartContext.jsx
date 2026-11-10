import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { cartAPI } from '../api/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { token } = useAuth();

  // Instant initialization from localStorage cache (0ms cold start)
  const [cart, setCart] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_cart');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.items)) return parsed;
      }
    } catch (e) {}
    return { items: [], totalPrice: 0 };
  });

  const [loading, setLoading] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Sync ref with current cart state for optimistic updates
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
    try {
      localStorage.setItem('cached_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  // Background fetch to reconcile server state
  const fetchCart = async () => {
    if (!token) {
      setCart({ items: [], totalPrice: 0 });
      return;
    }

    try {
      const response = await cartAPI.getCart();
      const serverCart = response.data?.cart || response.data;
      if (serverCart && Array.isArray(serverCart.items)) {
        setCart(serverCart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCart();
    } else {
      setCart({ items: [], totalPrice: 0 });
      localStorage.removeItem('cached_cart');
    }
  }, [token]);

  // Instant Optimistic Add To Cart (0ms UI latency)
  const addToCart = async (productOrId, quantity = 1) => {
    const isObject = typeof productOrId === 'object' && productOrId !== null;
    const productId = isObject ? (productOrId._id || productOrId.id) : productOrId;
    if (!productId) return false;

    const qtyToAdd = Number(quantity) || 1;

    // 1. Instant Optimistic State Update
    const currentItems = [...(cartRef.current.items || [])];
    const existingIndex = currentItems.findIndex(item => {
      const pId = item.productId?._id || item.productId;
      return String(pId) === String(productId);
    });

    let optimisticItems;
    if (existingIndex > -1) {
      optimisticItems = currentItems.map((item, idx) => {
        if (idx === existingIndex) {
          return {
            ...item,
            quantity: item.quantity + qtyToAdd,
          };
        }
        return item;
      });
    } else {
      const productObj = isObject ? productOrId : { _id: productId };
      const itemPrice = isObject ? (productOrId.price || 0) : 0;
      optimisticItems = [
        ...currentItems,
        {
          productId: productObj,
          quantity: qtyToAdd,
          price: itemPrice,
        },
      ];
    }

    const optimisticTotal = optimisticItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    const optimisticCart = {
      items: optimisticItems,
      totalPrice: optimisticTotal,
    };

    setCart(optimisticCart);

    if (!token) return true;

    // 2. Single-Trip Non-Blocking Backend Sync (no secondary fetchCart)
    try {
      const response = await cartAPI.addToCart(productId, qtyToAdd);
      const serverCart = response.data?.cart || response.data;
      if (serverCart && Array.isArray(serverCart.items)) {
        setCart(serverCart);
      }
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    }
  };

  // Instant Optimistic Update Quantity (0ms UI latency)
  const updateCartItem = async (productId, quantity) => {
    if (!productId) return;
    const numQty = Number(quantity);

    // 1. Instant Optimistic State Update
    const currentItems = [...(cartRef.current.items || [])];
    let optimisticItems;

    if (numQty <= 0) {
      optimisticItems = currentItems.filter(item => {
        const pId = item.productId?._id || item.productId;
        return String(pId) !== String(productId);
      });
    } else {
      optimisticItems = currentItems.map(item => {
        const pId = item.productId?._id || item.productId;
        if (String(pId) === String(productId)) {
          return { ...item, quantity: numQty };
        }
        return item;
      });
    }

    const optimisticTotal = optimisticItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    setCart({
      items: optimisticItems,
      totalPrice: optimisticTotal,
    });

    if (!token) return;

    // 2. Single-Trip Non-Blocking Backend Sync
    try {
      const response = await cartAPI.updateCartItem(productId, numQty);
      const serverCart = response.data?.cart || response.data;
      if (serverCart && Array.isArray(serverCart.items)) {
        setCart(serverCart);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  // Instant Optimistic Remove Item (0ms UI latency)
  const removeFromCart = async (productId) => {
    if (!productId) return;

    // 1. Instant Optimistic State Update
    const currentItems = [...(cartRef.current.items || [])];
    const optimisticItems = currentItems.filter(item => {
      const pId = item.productId?._id || item.productId;
      return String(pId) !== String(productId);
    });

    const optimisticTotal = optimisticItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    setCart({
      items: optimisticItems,
      totalPrice: optimisticTotal,
    });

    if (!token) return;

    // 2. Single-Trip Non-Blocking Backend Sync
    try {
      const response = await cartAPI.removeFromCart(productId);
      const serverCart = response.data?.cart || response.data;
      if (serverCart && Array.isArray(serverCart.items)) {
        setCart(serverCart);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  // Instant Clear Cart
  const clearCart = async () => {
    setCart({ items: [], totalPrice: 0 });
    localStorage.removeItem('cached_cart');

    if (!token) return;

    try {
      await cartAPI.clearCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getProductQuantity = (productId) => {
    const item = (cart.items || []).find((cartItem) => {
      const cartProductId = cartItem.productId?._id || cartItem.productId;
      return String(cartProductId) === String(productId);
    });

    return item?.quantity || 0;
  };

  const totalItems = (cart.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      totalItems, 
      loading, 
      fetchCart, 
      addToCart, 
      removeFromCart, 
      updateCartItem, 
      clearCart, 
      getProductQuantity,
      isCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
