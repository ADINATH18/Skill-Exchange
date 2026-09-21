import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/course.js';
import chatRoutes from './routes/chat.js';
import uploadRoutes from './routes/upload.js';
import notificationRoutes from './routes/notification.js';

import path from 'path';
import {
    fileURLToPath
} from 'url';

import {
    createServer
} from 'http';

import {
    Server
} from 'socket.io';

import multer from 'multer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const httpServer = createServer(app);

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://skill-exchange-fawn-six.vercel.app'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (
            !origin ||
            allowedOrigins.includes(origin)
        ) {
            callback(null, true);
        } else {
            callback(
                new Error('CORS origin not allowed')
            );
        }
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization'
    ]
};

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: [
            'GET',
            'POST'
        ],
        credentials: true
    }
});

app.use(cors(corsOptions));

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

const uploadsPath = path.join(
    __dirname,
    'uploads'
);

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(
        uploadsPath,
        {
            recursive: true
        }
    );
}

app.use(
    '/uploads',
    express.static(uploadsPath)
);

app.get('/test', (req, res) => {
    res.json({
        message: 'Server is working!'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',

        database:
            mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected'
    });
});

app.use(
    '/api/auth',
    authRoutes
);

app.use(
    '/api/courses',
    courseRoutes
);

app.use(
    '/api/chats',
    chatRoutes
);

app.use(
    '/api/messages',
    chatRoutes
);

app.use(
    '/api/notifications',
    notificationRoutes
);

app.use(
    '/api/upload',
    uploadRoutes
);

io.on('connection', socket => {

    socket.on(
        'join-call',
        roomId => {
            if (!roomId) {
                return;
            }

            socket.join(roomId);

            socket.data.callRoom =
                roomId;

            const room =
                io.sockets.adapter.rooms.get(
                    roomId
                );

            const existingUsers =
                room
                    ? Array.from(room).filter(
                        id => id !== socket.id
                    )
                    : [];

            socket.emit(
                'existing-users',
                existingUsers
            );

            socket.to(roomId).emit(
                'user-joined',
                socket.id
            );
        }
    );

    socket.on(
        'offer',
        ({ target, offer }) => {
            if (!target || !offer) {
                return;
            }

            io.to(target).emit(
                'offer',
                {
                    sender: socket.id,
                    offer
                }
            );
        }
    );

    socket.on(
        'answer',
        ({ target, answer }) => {
            if (!target || !answer) {
                return;
            }

            io.to(target).emit(
                'answer',
                {
                    sender: socket.id,
                    answer
                }
            );
        }
    );

    socket.on(
        'ice-candidate',
        ({ target, candidate }) => {
            if (!target || !candidate) {
                return;
            }

            io.to(target).emit(
                'ice-candidate',
                {
                    sender: socket.id,
                    candidate
                }
            );
        }
    );

    socket.on(
        'end-call',
        ({ roomId }) => {
            if (!roomId) {
                return;
            }

            socket
                .to(roomId)
                .emit('call-ended');
        }
    );

    socket.on(
        'disconnect',
        () => {
            const roomId =
                socket.data.callRoom;

            if (roomId) {
                socket
                    .to(roomId)
                    .emit(
                        'peer-disconnected',
                        socket.id
                    );
            }
        }
    );
});

const initializeDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                'MONGO_URI is not defined in Server/.env'
            );
        }

        if (!process.env.JWT_SECRET) {
            throw new Error(
                'JWT_SECRET is not defined in Server/.env'
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            'Connected to MongoDB'
        );

        return true;
    } catch (error) {
        console.error(
            'Database initialization error:',
            error
        );

        return false;
    }
};

const startServer = async () => {
    const dbInitialized =
        await initializeDB();

    if (!dbInitialized) {
        console.error(
            'Failed to initialize database. Server not started.'
        );

        process.exit(1);
    }

    const PORT =
        process.env.PORT || 1337;

    httpServer.listen(
        PORT,
        '0.0.0.0',
        () => {
            console.log(
                `Server is running on port ${PORT}`
            );
        }
    );
};

app.use(
    (err, req, res, next) => {
        console.error(
            'Error:',
            err
        );

        if (
            err instanceof
            multer.MulterError
        ) {
            if (
                err.code ===
                'LIMIT_FILE_SIZE'
            ) {
                return res.status(400).json({
                    message:
                        'File is too large. Maximum size is 50MB.'
                });
            }

            return res.status(400).json({
                message:
                    `Upload error: ${err.message}`
            });
        }

        return res.status(500).json({
            message:
                err.message ||
                'Something went wrong'
        });
    }
);

startServer();