import express from 'express';
import Course from '../models/Course.js';
import Chat from '../models/Chat.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new course
router.post('/create', verifyToken, async (req, res) => {
    try {
        const { name, skills, duration, imageUrl } = req.body;
        const course = new Course({
            name,
            skills,
            duration,
            imageUrl,
            author: req.user._id,
            authorName: req.user.name
        });
        await course.save();
        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search courses by skills
router.get('/search', async (req, res) => {
    try {
        const { skill } = req.query;
        const courses = await Course.find({
            skills: { $regex: skill, $options: 'i' }
        });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Request to enroll in a course
router.post('/enroll/:courseId', verifyToken, async (req, res) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Check if already enrolled
        const existingEnrollment = course.enrollments.find(
            e => e.student.toString() === req.user._id.toString()
        );
        if (existingEnrollment) {
            return res.status(400).json({ message: 'Already enrolled or requested' });
        }

        course.enrollments.push({
            student: req.user._id,
            status: 'pending'
        });
        await course.save();
        res.json({ message: 'Enrollment request sent' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Approve/reject enrollment request
router.put('/enrollment/:courseId/:studentId', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        const course = await Course.findById(req.params.courseId);
        
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        if (course.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const enrollment = course.enrollments.find(
            e => e.student.toString() === req.params.studentId
        );

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        enrollment.status = status;
        if (status === 'approved') {
            enrollment.startDate = new Date();
            enrollment.endDate = new Date();
            enrollment.endDate.setDate(enrollment.endDate.getDate() + (course.duration * 7));

            // Create a chat room
            const chat = new Chat({
                course: course._id,
                instructor: course.author,
                student: req.params.studentId,
                startDate: enrollment.startDate,
                endDate: enrollment.endDate
            });
            await chat.save();
        }

        await course.save();
        res.json({ message: `Enrollment ${status}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get my courses (as instructor)
router.get('/my-courses', verifyToken, async (req, res) => {
    try {
        const courses = await Course.find({ author: req.user._id });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get enrolled courses (as student)
router.get('/enrolled', verifyToken, async (req, res) => {
    try {
        const courses = await Course.find({
            'enrollments.student': req.user._id,
            'enrollments.status': 'approved'
        });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router; 