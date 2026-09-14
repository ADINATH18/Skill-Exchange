import express from 'express';
import multer from 'multer';
import path from 'path';
import { verifyToken } from '../middleware/auth.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mime from 'mime-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with original name and proper extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = mime.extension(file.mimetype) || path.extname(file.originalname).slice(1);
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        const baseName = path.basename(safeFileName, path.extname(safeFileName));
        cb(null, `${baseName}-${uniqueSuffix}.${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'video/mp4', 'video/quicktime',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPG, PNG, GIF, MP4, PDF, DOC, DOCX`));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Wrap the upload middleware in a try-catch block
const handleUpload = async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            upload.single('file')(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get the filename from the saved file
        const filename = path.basename(req.file.path);
        
        // Return the file URL
        const fileUrl = `/uploads/${filename}`;
        
        // Set proper content type for the response
        res.json({ 
            url: fileUrl,
            filename: filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('File upload error:', error);
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ message: `Upload error: ${error.message}` });
        }
        res.status(500).json({ message: error.message || 'Error uploading file' });
    }
};

// File upload endpoint
router.post('/', verifyToken, handleUpload);

export default router; 