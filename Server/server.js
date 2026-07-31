import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/course.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);

app.use((err, req, res, next) => {

    console.error("Error:", err);

    if (err instanceof multer.MulterError) {

        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: 'File is too large. Maximum size is 50MB.'
            });
        }

        return res.status(400).json({
            message: `Upload error: ${err.message}`
        });
    }

    if (err) {
        return res.status(500).json({
            message: err.message || 'Something went wrong'
        });
    }

    next();
});

const initializeDB = async () => {

    try {

        await mongoose.connect(
            'mongodb+srv://dalviadinath7777_db_user:yeTUvCuYi7pkMXno@skillexchange.fgrdmvb.mongodb.net/skill_exchange?retryWrites=true&w=majority'
        );

        console.log('Connected to MongoDB');

        return true;

    } catch (error) {

        console.error('Database initialization error:', error);

        return false;
    }
};

const startServer = async () => {

    const dbInitialized = await initializeDB();

    if (dbInitialized) {

        const PORT = 1337;

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } else {

        console.error('Failed to initialize database. Server not started.');

        process.exit(1);
    }
};

startServer();