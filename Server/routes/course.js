import express from 'express';
import Course from '../models/Course.js';
import Chat from '../models/Chat.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/create', verifyToken, async (req, res) => {
    try {
        const { name, skills, duration, imageUrl } = req.body;

        if (
            !name ||
            !Array.isArray(skills) ||
            skills.length === 0 ||
            !duration ||
            !imageUrl
        ) {
            return res.status(400).json({
                message:
                    'Please provide course name, skills, duration and image.'
            });
        }

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
        console.error('Create course error:', error);

        res.status(500).json({
            message: error.message
        });
    }
});

router.get('/search', async (req, res) => {
    try {
        const skill = (req.query.skill || '').trim();

        const filter = skill
            ? {
                skills: {
                    $regex: skill,
                    $options: 'i'
                }
            }
            : {};

        const courses = await Course.find(filter)
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.json(courses);
    } catch (error) {
        console.error('Search courses error:', error);

        res.status(500).json({
            message: error.message
        });
    }
});

router.post('/enroll/:courseId', verifyToken, async (req, res) => {
    try {
        const course = await Course.findById(
            req.params.courseId
        );

        if (!course) {
            return res.status(404).json({
                message: 'Course not found'
            });
        }

        if (
            course.author.toString() ===
            req.user._id.toString()
        ) {
            return res.status(400).json({
                message:
                    'You cannot enroll in your own course.'
            });
        }

        const existingEnrollment =
            course.enrollments.find(
                enrollment =>
                    enrollment.student.toString() ===
                    req.user._id.toString()
            );

        if (existingEnrollment) {
            if (
                existingEnrollment.status ===
                'rejected'
            ) {
                existingEnrollment.status = 'pending';
                existingEnrollment.startDate = undefined;
                existingEnrollment.endDate = undefined;

                await course.save();

                return res.json({
                    message:
                        'Enrollment request sent again'
                });
            }

            return res.status(400).json({
                message:
                    existingEnrollment.status ===
                    'approved'
                        ? 'You are already enrolled in this course'
                        : 'Enrollment request is already pending'
            });
        }

        course.enrollments.push({
            student: req.user._id,
            status: 'pending'
        });

        await course.save();

        res.json({
            message: 'Enrollment request sent'
        });
    } catch (error) {
        console.error(
            'Enrollment request error:',
            error
        );

        res.status(500).json({
            message: error.message
        });
    }
});

router.put(
    '/enrollment/:courseId/:studentId',
    verifyToken,
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            if (
                !['approved', 'rejected'].includes(
                    status
                )
            ) {
                return res.status(400).json({
                    message:
                        'Status must be approved or rejected'
                });
            }

            const course =
                await Course.findById(
                    req.params.courseId
                );

            if (!course) {
                return res.status(404).json({
                    message: 'Course not found'
                });
            }

            if (
                course.author.toString() !==
                req.user._id.toString()
            ) {
                return res.status(403).json({
                    message: 'Not authorized'
                });
            }

            const enrollment =
                course.enrollments.find(
                    enrollment =>
                        enrollment.student.toString() ===
                        req.params.studentId
                );

            if (!enrollment) {
                return res.status(404).json({
                    message:
                        'Enrollment not found'
                });
            }

            enrollment.status = status;

            if (status === 'approved') {
                enrollment.startDate =
                    new Date();

                enrollment.endDate =
                    new Date();

                enrollment.endDate.setDate(
                    enrollment.endDate.getDate() +
                    Number(course.duration) * 7
                );

                const existingChat =
                    await Chat.findOne({
                        course: course._id,
                        instructor:
                            course.author,
                        student:
                            req.params.studentId
                    });

                if (existingChat) {
                    existingChat.isActive = true;
                    existingChat.startDate =
                        enrollment.startDate;
                    existingChat.endDate =
                        enrollment.endDate;

                    await existingChat.save();
                } else {
                    await Chat.create({
                        course: course._id,
                        instructor:
                            course.author,
                        student:
                            req.params.studentId,
                        startDate:
                            enrollment.startDate,
                        endDate:
                            enrollment.endDate,
                        isActive: true
                    });
                }
            } else {
                enrollment.startDate =
                    undefined;

                enrollment.endDate =
                    undefined;

                await Chat.updateMany(
                    {
                        course: course._id,
                        instructor:
                            course.author,
                        student:
                            req.params.studentId
                    },
                    {
                        $set: {
                            isActive: false
                        }
                    }
                );
            }

            await course.save();

            res.json({
                message:
                    `Enrollment ${status}`,
                courseId:
                    course._id,
                studentId:
                    req.params.studentId,
                status
            });
        } catch (error) {
            console.error(
                'Update enrollment error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.delete(
    '/enrollment/:courseId/:studentId',
    verifyToken,
    async (req, res) => {
        try {
            const {
                courseId,
                studentId
            } = req.params;

            const course =
                await Course.findById(
                    courseId
                );

            if (!course) {
                return res.status(404).json({
                    message:
                        'Course not found'
                });
            }

            if (
                course.author.toString() !==
                req.user._id.toString()
            ) {
                return res.status(403).json({
                    message:
                        'Not authorized'
                });
            }

            const enrollment =
                course.enrollments.find(
                    enrollment =>
                        enrollment.student.toString() ===
                        studentId
                );

            if (!enrollment) {
                return res.status(404).json({
                    message:
                        'Student is not enrolled in this course'
                });
            }

            course.enrollments =
                course.enrollments.filter(
                    enrollment =>
                        enrollment.student.toString() !==
                        studentId
                );

            await course.save();

            await Chat.updateMany(
                {
                    course: courseId,
                    instructor:
                        req.user._id,
                    student: studentId
                },
                {
                    $set: {
                        isActive: false
                    }
                }
            );

            res.json({
                message:
                    'Student enrollment cancelled successfully'
            });
        } catch (error) {
            console.error(
                'Cancel enrollment error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.get(
    '/my-courses',
    verifyToken,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    author: req.user._id
                })
                    .populate(
                        'enrollments.student',
                        'name email'
                    )
                    .sort({
                        createdAt: -1
                    });

            res.json(courses);
        } catch (error) {
            console.error(
                'My courses error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.get(
    '/enrolled',
    verifyToken,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    enrollments: {
                        $elemMatch: {
                            student:
                                req.user._id,
                            status:
                                'approved'
                        }
                    }
                })
                    .populate(
                        'author',
                        'name email'
                    )
                    .sort({
                        createdAt: -1
                    });

            res.json(courses);
        } catch (error) {
            console.error(
                'Enrolled courses error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

router.get(
    '/my-enrollment-requests',
    verifyToken,
    async (req, res) => {
        try {
            const courses =
                await Course.find({
                    'enrollments.student':
                        req.user._id
                })
                    .populate(
                        'author',
                        'name email'
                    )
                    .sort({
                        createdAt: -1
                    });

            const requests = [];

            for (const course of courses) {
                const enrollment =
                    course.enrollments.find(
                        item =>
                            item.student.toString() ===
                            req.user._id.toString()
                    );

                if (enrollment) {
                    requests.push({
                        courseId:
                            course._id,
                        courseName:
                            course.name,
                        instructor:
                            course.author,
                        status:
                            enrollment.status,
                        startDate:
                            enrollment.startDate,
                        endDate:
                            enrollment.endDate
                    });
                }
            }

            res.json(requests);
        } catch (error) {
            console.error(
                'Enrollment requests error:',
                error
            );

            res.status(500).json({
                message: error.message
            });
        }
    }
);

export default router;