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

// Delete all inactive chats for current user (cleanup)
router.delete('/inactive/cleanup', verifyToken, async (req, res) => {
    try {
        const now = new Date();
        const result = await Chat.deleteMany({
            $and: [
                {
                    $or: [
                        { instructor: req.user._id },
                        { student: req.user._id }
                    ]
                },
                {
                    $or: [
                        { isActive: false },
                        { endDate: { $lt: now } }
                    ]
                }
            ]
        });

        res.json({
            message: 'Inactive chats removed successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Cleanup inactive chats error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Start or reactivate a chat with a specific student
router.post('/start', verifyToken, async (req, res) => {
    try {
        const { courseId, studentId } = req.body;
        if (!courseId || !studentId) {
            return res.status(400).json({ message: 'Course ID and Student ID are required' });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();
        const courseAuthorId = (course.author?._id || course.author || '').toString();
        const isInstructor = courseAuthorId === userId;
        const isStudent = studentId.toString() === userId;

        if (!isInstructor && !isStudent) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const enrollment = (course.enrollments || []).find(
            e => e.student && (e.student?._id || e.student || '').toString() === studentId.toString() && e.status === 'approved'
        );

        if (!enrollment) {
            return res.status(400).json({ message: 'Student does not have an approved enrollment in this course' });
        }

        const startDate = enrollment.startDate || new Date();
        const endDate = enrollment.endDate || new Date(Date.now() + Number(course.duration || 4) * 7 * 24 * 60 * 60 * 1000);

        let chat = await Chat.findOne({
            course: courseId,
            instructor: course.author,
            student: studentId
        });

        if (chat) {
            chat.isActive = true;
            chat.startDate = startDate;
            chat.endDate = endDate;
            await chat.save();
        } else {
            chat = await Chat.create({
                course: courseId,
                instructor: course.author,
                student: studentId,
                startDate,
                endDate,
                isActive: true
            });
        }

        chat = await Chat.findById(chat._id)
            .populate('messages.sender', 'name')
            .populate('course', 'name imageUrl duration skills author')
            .populate('instructor', 'name email')
            .populate('student', 'name email');

        res.status(200).json(chat);
    } catch (error) {
        console.error('Start chat error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Reactivate an expired or inactive chat
router.put('/:chatId/reactivate', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
        const studentId = (chat.student?._id || chat.student || '').toString();
        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();

        if (instructorId !== userId && studentId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const course = await Course.findById(chat.course);
        const durationWeeks = course?.duration || 4;

        chat.isActive = true;
        chat.startDate = new Date();
        chat.endDate = new Date(Date.now() + Number(durationWeeks) * 7 * 24 * 60 * 60 * 1000);
        await chat.save();

        const populatedChat = await Chat.findById(chat._id)
            .populate('messages.sender', 'name')
            .populate('course', 'name imageUrl duration skills author')
            .populate('instructor', 'name email')
            .populate('student', 'name email');

        res.json({ message: 'Chat reactivated successfully', chat: populatedChat });
    } catch (error) {
        console.error('Reactivate chat error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a single chat by ID
router.delete('/:chatId', verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
        const studentId = (chat.student?._id || chat.student || '').toString();
        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();

        if (instructorId !== userId && studentId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Chat.findByIdAndDelete(req.params.chatId);

        res.json({ message: 'Chat removed successfully', chatId: req.params.chatId });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get chat by course ID (supports optional ?studentId=... for instructors, or direct chatId fallback)
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const { studentId } = req.query;
        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();

        // 1. Safe fallback: check if req.params.courseId is actually a direct Chat ID
        try {
            const directChat = await Chat.findById(req.params.courseId)
                .populate('messages.sender', 'name')
                .populate('course', 'name imageUrl duration skills author')
                .populate('instructor', 'name email')
                .populate('student', 'name email');

            if (directChat) {
                const instId = (directChat.instructor?._id || directChat.instructor || '').toString();
                const studId = (directChat.student?._id || directChat.student || '').toString();

                if (instId === userId || studId === userId) {
                    const now = new Date();
                    if (now > directChat.endDate && directChat.isActive) {
                        directChat.isActive = false;
                        await directChat.save();
                    }
                    return res.json(directChat);
                }
            }
        } catch {
            // Not a valid ObjectId or not a chat ID, continue to course lookup
        }

        // 2. Look up by course ID
        let query;
        if (studentId) {
            query = {
                course: req.params.courseId,
                student: studentId,
                instructor: req.user._id
            };
        } else {
            query = {
                course: req.params.courseId,
                $or: [
                    { student: req.user._id },
                    { instructor: req.user._id }
                ]
            };
        }

        let chat = await Chat.findOne(query)
            .sort({ isActive: -1, updatedAt: -1 })
            .populate('messages.sender', 'name')
            .populate('course', 'name imageUrl duration skills author')
            .populate('instructor', 'name email')
            .populate('student', 'name email');

        if (!chat) {
            const course = await Course.findById(req.params.courseId);
            if (course) {
                const isInstructor = (course.author?._id || course.author || '').toString() === userId;
                let targetStudentId = studentId;

                if (!targetStudentId && isInstructor) {
                    const firstApproved = (course.enrollments || []).find(
                        e => e.status === 'approved' && e.student
                    );
                    if (firstApproved) {
                        targetStudentId = (firstApproved.student?._id || firstApproved.student || '').toString();
                    }
                }

                if (!targetStudentId && !isInstructor) {
                    targetStudentId = userId;
                }

                if (targetStudentId) {
                    const enrollment = (course.enrollments || []).find(
                        e => e.student && (e.student?._id || e.student || '').toString() === targetStudentId && e.status === 'approved'
                    );

                    if (enrollment) {
                        const startDate = enrollment.startDate || new Date();
                        const endDate = enrollment.endDate || new Date(Date.now() + Number(course.duration || 4) * 7 * 24 * 60 * 60 * 1000);

                        const newChat = await Chat.create({
                            course: course._id,
                            instructor: course.author,
                            student: targetStudentId,
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
        }

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found. Please ensure enrollment is approved.' });
        }

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

        const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
        const studentId = (chat.student?._id || chat.student || '').toString();
        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();

        if (studentId !== userId && instructorId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const now = new Date();
        if (now > chat.endDate) {
            chat.isActive = false;
            await chat.save();
            return res.status(400).json({ message: 'Chat duration has expired' });
        }

        const { content, resourceUrl, resourceType, fileName, fileSize } = req.body;
        chat.messages.push({
            sender: req.user._id,
            content,
            resourceUrl,
            resourceType,
            fileName: fileName || '',
            fileSize: fileSize || 0
        });

        await chat.save();
        await chat.populate('messages.sender', 'name');
        res.status(201).json(chat.messages[chat.messages.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all chats for a user (student or instructor)
router.get('/', verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { student: req.user._id },
                { instructor: req.user._id }
            ]
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

// Get all chats for instructor (across all courses, including new enrolled students)
router.get('/instructor/all', verifyToken, async (req, res) => {
    try {
        const [chats, myCourses] = await Promise.all([
            Chat.find({ instructor: req.user._id })
                .populate('course', 'name')
                .populate('student', 'name email')
                .populate('messages.sender', 'name')
                .sort({ 'messages.timestamp': -1 }),
            Course.find({ author: req.user._id })
                .populate('enrollments.student', 'name email')
        ]);

        const chatsByCourse = {};

        for (const course of myCourses) {
            chatsByCourse[course.name] = [];
        }

        const studentChatKeys = new Set();

        for (const chat of chats) {
            const courseName = chat.course?.name || 'Untitled Course';
            if (!chatsByCourse[courseName]) {
                chatsByCourse[courseName] = [];
            }
            const studentIdStr = (chat.student?._id || chat.student || '').toString();
            studentChatKeys.add(`${chat.course?._id || chat.course}_${studentIdStr}`);

            chatsByCourse[courseName].push({
                chatId: chat._id,
                courseId: chat.course?._id || chat.course,
                studentId: chat.student?._id || chat.student,
                student: chat.student?.name || 'Student',
                studentEmail: chat.student?.email,
                isActive: chat.isActive,
                lastMessage: chat.messages[chat.messages.length - 1]?.content || 'No messages yet',
                lastMessageTime: chat.messages[chat.messages.length - 1]?.timestamp,
                totalMessages: chat.messages.length
            });
        }

        // Add new enrolled students without an active chat yet
        for (const course of myCourses) {
            const courseName = course.name;
            for (const enrollment of (course.enrollments || [])) {
                if (enrollment.status === 'approved' && enrollment.student) {
                    const studentIdStr = enrollment.student._id
                        ? enrollment.student._id.toString()
                        : enrollment.student.toString();
                    const key = `${course._id}_${studentIdStr}`;

                    if (!studentChatKeys.has(key)) {
                        chatsByCourse[courseName].push({
                            chatId: null,
                            courseId: course._id,
                            studentId: studentIdStr,
                            student: enrollment.student.name || 'New Student',
                            studentEmail: enrollment.student.email,
                            isActive: true,
                            isNewStudent: true,
                            lastMessage: 'Newly enrolled student! Click to start chat.',
                            lastMessageTime: enrollment.startDate || new Date(),
                            totalMessages: 0
                        });
                    }
                }
            }
        }

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

        const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
        const studentId = (chat.student?._id || chat.student || '').toString();
        const userId = (req.user?._id || req.user?.id || req.user?.userId || '').toString();

        if (instructorId !== userId && studentId !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

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