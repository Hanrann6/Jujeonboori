import mongoose from "mongoose";

const alcoholSchema = new mongoose.Schema({
  name: String,
  category: String,
  abv: Number,
  price: Number,
  region: String,
  sweetness: Number,
  sourness: Number,
  freshness: Number,
  body: Number,
  sparkling: Number,
  imageUrl: String,
});

const Alcohol = mongoose.model("Alcohol", alcoholSchema);
export default Alcohol;
