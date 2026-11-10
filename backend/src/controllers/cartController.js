const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [], totalPrice: 0 });
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId.toString()
    );

    const qty = Number(quantity) || 1;
    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        price: product.price,
      });
    }

    // Calculate total price
    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.price || 0) * (item.quantity || 0);
    }, 0);

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId.toString()
    );

    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.price || 0) * (item.quantity || 0);
    }, 0);

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [] });
    }

    const numQty = Number(quantity);

    if (numQty <= 0) {
      cart.items = cart.items.filter(
        (item) => item.productId.toString() !== productId.toString()
      );
    } else {
      const item = cart.items.find(
        (item) => item.productId.toString() === productId.toString()
      );

      if (item) {
        item.quantity = numQty;
      } else {
        const product = await Product.findById(productId).lean();
        if (product) {
          cart.items.push({
            productId,
            quantity: numQty,
            price: product.price,
          });
        }
      }
    }

    cart.totalPrice = cart.items.reduce((total, item) => {
      return total + (item.price || 0) * (item.quantity || 0);
    }, 0);

    await cart.save();
    await cart.populate('items.productId');
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [], totalPrice: 0 });
    } else {
      cart.items = [];
      cart.totalPrice = 0;
      await cart.save();
    }

    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
