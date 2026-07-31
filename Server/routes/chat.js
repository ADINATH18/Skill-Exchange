import express from 'express';
import Chat from '../models/Chat.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get chat by course ID
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findOne({
            course: req.params.courseId,
            $or: [
                { student: req.user._id },
                { instructor: req.user._id }
            ]
        }).populate('messages.sender', 'name');

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Check if chat is still active based on duration
        const now = new Date();
        if (now > chat.endDate) {
            chat.isActive = false;
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
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

// Get all active chats for a user
router.get('/', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { student: req.user._id },
                { instructor: req.user._id }
            ],
            isActive: true
        }).populate('course', 'name')
          .populate('student', 'name')
          .populate('instructor', 'name');

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
            const courseName = chat.course.name;
            if (!acc[courseName]) {
                acc[courseName] = [];
            }
            acc[courseName].push({
                chatId: chat._id,
                student: chat.student.name,
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

// Get chat by ID (for instructor view)
router.get('/id/:chatId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId)
            .populate('messages.sender', 'name')
            .populate('course', 'name');

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Verify user is the instructor of this chat
        if (chat.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Check if chat is still active based on duration
        const now = new Date();
        if (now > chat.endDate) {
            chat.isActive = false;
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router; 