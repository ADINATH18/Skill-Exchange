import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Remove any existing indexes
userSchema.indexes().forEach(index => {
    userSchema.index(index.fields, { unique: false });
});

// Add a new unique index for email
userSchema.index({ email: 1 }, { 
    unique: true,
    sparse: true,
    background: true
});

export default mongoose.model('User', userSchema); 