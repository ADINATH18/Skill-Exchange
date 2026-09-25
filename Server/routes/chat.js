import express from 'express';
import Chat from '../models/Chat.js';
import Course from '../models/Course.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get unread count
router.get(
    '/unread-count',
    verifyToken,
    async (req, res) => {
        try {
            const chats = await Chat.find({
                $or: [
                    { student: req.user._id },
                    { instructor: req.user._id }
                ],
                isActive: true
            });

            res.json({
                count: 0
            });
        } catch (error) {
            console.error(
                'Unread count error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

// Get chat by course ID (for students & instructors)
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        let chat = await Chat.findOne({
            course: req.params.courseId,
            $or: [
                { student: req.user._id },
                { instructor: req.user._id }
            ]
        })
        .populate('messages.sender', 'name')
        .populate('course', 'name imageUrl duration skills author')
        .populate('instructor', 'name email')
        .populate('student', 'name email');

        if (!chat) {
            // Check if course exists and student has approved enrollment
            const course = await Course.findById(req.params.courseId);
            if (course) {
                const enrollment = (course.enrollments || []).find(
                    e => e.student && e.student.toString() === req.user._id.toString() && e.status === 'approved'
                );

                if (enrollment) {
                    const startDate = enrollment.startDate || new Date();
                    const endDate = enrollment.endDate || new Date(Date.now() + Number(course.duration || 4) * 7 * 24 * 60 * 60 * 1000);

                    const newChat = await Chat.create({
                        course: course._id,
                        instructor: course.author,
                        student: req.user._id,
                        startDate,
                        endDate,
                        isActive: true
                    });

                    chat = await Chat.findById(newChat._id)
                        .populate('messages.sender', 'name')
                        .populate('course', 'name imageUrl duration skills author')
                        .populate('instructor', 'name email')
                        .populate('student', 'name email');
                }
            }
        }

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found. Please ensure you are enrolled and approved.' });
        }

        // Check if chat is still active based on duration
        const now = new Date();
        if (now > chat.endDate && chat.isActive) {
            chat.isActive = false;
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        console.error('Fetch chat by courseId error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Send a message
router.post('/:chatId/message', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Verify user is part of the chat
        if (chat.student.toString() !== req.user._id.toString() && 
            chat.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if chat is still active
        const now = new Date();
        if (now > chat.endDate) {
            return res.status(400).json({ message: 'Chat duration has expired' });
        }

        const { content, resourceUrl, resourceType } = req.body;
        chat.messages.push({
            sender: req.user._id,
            content,
            resourceUrl,
            resourceType
        });

        await chat.save();
        res.status(201).json(chat.messages[chat.messages.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all active chats for a user (student or instructor)
router.get('/', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { student: req.user._id },
                { instructor: req.user._id }
            ],
            isActive: true
        })
        .populate('course', 'name imageUrl duration skills')
        .populate('student', 'name email')
        .populate('instructor', 'name email')
        .populate('messages.sender', 'name')
        .sort({ updatedAt: -1 });

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all chats for instructor (across all courses)
router.get('/instructor/all', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({
            instructor: req.user._id
        })
        .populate('course', 'name')
        .populate('student', 'name')
        .populate('messages.sender', 'name')
        .sort({ 'messages.timestamp': -1 });

        // Group chats by course
        const chatsByCourse = chats.reduce((acc, chat) => {
            const courseName = chat.course?.name || 'Untitled Course';
            if (!acc[courseName]) {
                acc[courseName] = [];
            }
            acc[courseName].push({
                chatId: chat._id,
                student: chat.student?.name || 'Student',
                isActive: chat.isActive,
                lastMessage: chat.messages[chat.messages.length - 1]?.content || 'No messages yet',
                lastMessageTime: chat.messages[chat.messages.length - 1]?.timestamp,
                totalMessages: chat.messages.length
            });
            return acc;
        }, {});

        res.json(chatsByCourse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get chat by ID (for student or instructor)
router.get('/id/:chatId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('messages.sender', 'name')
            .populate('course', 'name imageUrl duration skills author')
            .populate('instructor', 'name email')
            .populate('student', 'name email');

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Verify user is part of this chat
        if (
            chat.instructor.toString() !== req.user._id.toString() &&
            chat.student.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if chat is still active based on duration
        const now = new Date();
        if (now > chat.endDate && chat.isActive) {
            chat.isActive = false;
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router; 