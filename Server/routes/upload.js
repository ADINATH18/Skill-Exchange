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
        const originalExt = path.extname(file.originalname).slice(1);
        const mimeExt = mime.extension(file.mimetype);
        const extension = originalExt || mimeExt || 'bin';
        const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const baseName = path.basename(safeFileName, path.extname(safeFileName)) || 'file';
        cb(null, `${baseName}-${uniqueSuffix}.${extension}`);
    }
});

// Allow all file types (videos, images, audio, documents, archives, code, spreadsheets, presentations, etc.)
const fileFilter = (req, file, cb) => {
    // Permit any valid file upload
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit for large files and videos
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
        
        // Return file details
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
                return res.status(400).json({ message: 'File is too large. Maximum size is 500MB.' });
            }
            return res.status(400).json({ message: `Upload error: ${error.message}` });
        }
        res.status(500).json({ message: error.message || 'Error uploading file' });
    }
};

// File upload endpoint
router.post('/', verifyToken, handleUpload);

// Download file endpoint with proper attachment header
router.get('/download/:filename', (req, res) => {
    try {
        const rawFilename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, '..', 'uploads', rawFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        const downloadName = req.query.name || rawFilename;
        res.download(filePath, downloadName);
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ message: error.message || 'Error downloading file' });
    }
});

// Read file endpoint for inline preview and text-based files
router.get('/read/:filename', (req, res) => {
    try {
        const rawFilename = path.basename(req.params.filename);
        const filePath = path.join(__dirname, '..', 'uploads', rawFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        const ext = path.extname(rawFilename).toLowerCase();
        const textExtensions = [
            '.txt', '.md', '.markdown', '.json', '.csv', '.tsv', 
            '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', 
            '.cpp', '.cs', '.html', '.css', '.scss', '.xml', 
            '.yaml', '.yml', '.sql', '.log', '.sh', '.bat', '.env'
        ];

        if (textExtensions.includes(ext)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const stats = fs.statSync(filePath);
            return res.json({
                filename: rawFilename,
                isText: true,
                size: stats.size,
                extension: ext,
                content
            });
        }

        // For PDF or other files, serve with inline disposition
        const detectedMime = mime.lookup(filePath) || 'application/octet-stream';
        res.setHeader('Content-Type', detectedMime);
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(filePath);
    } catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ message: error.message || 'Error reading file' });
    }
});

export default router; 