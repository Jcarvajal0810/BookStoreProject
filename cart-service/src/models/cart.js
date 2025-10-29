const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  items: [
    {
      book_id: { type: String, required: true },
      title: { type: String },
      price: { type: Number },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cart', cartSchema);
