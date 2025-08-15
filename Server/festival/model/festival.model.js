import mongoose from "mongoose";

const festivalSchema = new mongoose.Schema({
    festival_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, maxlength: 255 },
    description: { type: String, required: true },
    location: { type: String, required: true, maxlength: 255 },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    official_url: { type: String, maxlength: 255 },
    image_url: { type: String, maxlength: 255 },
    created_at: { type: Date, default: Date.now }
});

const Festival = mongoose.model('Festival', festivalSchema);
export default Festival;