import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    author: { type: String },
    description: { type: String },
    image: { type: String },
    countInStock: { type: Number, default: 0 },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Book || mongoose.model("Book", bookSchema);
