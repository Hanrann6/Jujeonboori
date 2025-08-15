import mongoose from 'mongoose';

const validateObjectId = (paramName) => (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ 
            message: `Invalid ID format for parameter: ${paramName}`
        });
    }
    next();
};

export default validateObjectId;