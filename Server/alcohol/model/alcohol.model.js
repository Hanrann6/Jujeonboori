import mongoose from "mongoose";

const alcoholSchema = new mongoose.Schema({
    index: { 
        type: Number, 
        unique: true, 
        required: true 
    },
    alcoholName: { 
        type: String, 
        required: true 
    },
    normalizedName: String,
    foodPairing: String,
    sweetness: Number,
    sourness: Number,
    freshness: Number,
    body: Number,
    degree: Number,
    alcoholType: String,
    keywords: [String],
    volume: String,
    price: String,
    priceValue: Number,
    ingredients: String,
    brewery: String,
    description: String,
    representative: String,
    address: String,
    contact: String,
    website: String,
    imageUrl: String,
    detailPageUrl: String,
    docId: String
}, { 
    timestamps: true 
});

const Alcohol = mongoose.model("Alcohol", alcoholSchema);

export default Alcohol;