import express from 'express';
import Course from '../models/Course.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = [];

        const teachingCourses = await Course.find({
            author: req.user._id
        })
            .populate(
                'enrollments.student',
                'name email'
            )
            .sort({
                createdAt: -1
            });

        teachingCourses.forEach(course => {
            course.enrollments
                .filter(
                    enrollment =>
                        enrollment.status === 'pending'
                )
                .forEach(enrollment => {
                    notifications.push({
                        _id: `${course._id}-${enrollment._id}`,
                        type: 'primary',
                        title: 'New enrollment request',
                        message:
                            `${enrollment.student?.name ||
                                enrollment.student?.email ||
                                'A student'} requested to join ${course.name}.`,
                        courseId: course._id,
                        studentId:
                            enrollment.student?._id ||
                            enrollment.student
                    });
                });
        });

        const studentCourses = await Course.find({
            'enrollments.student': req.user._id
        }).sort({
            createdAt: -1
        });

        studentCourses.forEach(course => {
            const enrollment =
                course.enrollments.find(
                    item =>
                        item.student.toString() ===
                        req.user._id.toString()
                );

            if (!enrollment) {
                return;
            }

            if (enrollment.status === 'approved') {
                notifications.push({
                    _id:
                        `${course._id}-approved-${req.user._id}`,
                    type: 'success',
                    title: 'Enrollment approved',
                    message:
                        `Your enrollment in ${course.name} has been approved.`
                });
            }

            if (enrollment.status === 'rejected') {
                notifications.push({
                    _id:
                        `${course._id}-rejected-${req.user._id}`,
                    type: 'danger',
                    title: 'Enrollment rejected',
                    message:
                        `Your enrollment request for ${course.name} was rejected.`
                });
            }
        });

        res.json(
            notifications.slice(0, 50)
        );
    } catch (error) {
        console.error(
            'Notification error:',
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
});

export default router;