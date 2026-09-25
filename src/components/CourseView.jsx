import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FaArrowLeft,
    FaComments,
    FaBookOpen,
    FaCheckCircle,
    FaRegCircle,
    FaClock,
    FaChalkboardTeacher,
    FaGraduationCap,
    FaLaptopCode,
    FaLightbulb,
    FaExternalLinkAlt
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';

const CourseView = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [course, setCourse] = useState(null);
    const [enrollment, setEnrollment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [completedWeeks, setCompletedWeeks] = useState([]);
    const [savingProgress, setSavingProgress] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchCourseDetails();
    }, [courseId, token]);

    const fetchCourseDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/courses/${courseId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = response.data;
            setCourse(data.course);
            setEnrollment(data.enrollment);

            const initialProgress = data.progress || data.enrollment?.progress || 0;
            setProgress(initialProgress);

            // Load completed modules from storage if available, or initialize from progress
            const storageKey = `course_${courseId}_completed_weeks`;
            const savedWeeks = localStorage.getItem(storageKey);
            const duration = data.course?.duration || 4;

            if (savedWeeks) {
                try {
                    setCompletedWeeks(JSON.parse(savedWeeks));
                } catch {
                    initializeWeeksFromProgress(initialProgress, duration);
                }
            } else {
                initializeWeeksFromProgress(initialProgress, duration);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching course:', err);
            setError(err.response?.data?.message || 'Error loading course details');
            setLoading(false);
        }
    };

    const initializeWeeksFromProgress = (currentProgress, duration) => {
        const completedCount = Math.round((currentProgress / 100) * duration);
        const initial = [];
        for (let i = 0; i < completedCount; i++) {
            initial.push(i);
        }
        setCompletedWeeks(initial);
    };

    const handleToggleWeek = async (weekIndex) => {
        if (!course) return;

        const duration = course.duration || 4;
        let updatedWeeks;

        if (completedWeeks.includes(weekIndex)) {
            updatedWeeks = completedWeeks.filter((idx) => idx !== weekIndex);
        } else {
            updatedWeeks = [...completedWeeks, weekIndex];
        }

        setCompletedWeeks(updatedWeeks);
        localStorage.setItem(`course_${courseId}_completed_weeks`, JSON.stringify(updatedWeeks));

        const newProgress = Math.min(100, Math.round((updatedWeeks.length / duration) * 100));
        setProgress(newProgress);

        try {
            setSavingProgress(true);
            await axios.put(
                `${API_URL}/api/courses/${courseId}/progress`,
                { progress: newProgress },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );
        } catch (err) {
            console.error('Failed to update progress on server:', err);
        } finally {
            setSavingProgress(false);
        }
    };

    const generateWeeklyModules = () => {
        if (!course) return [];
        const duration = course.duration || 4;
        const skills = course.skills || [];

        const modules = [];
        for (let week = 1; week <= duration; week++) {
            const skillFocus = skills[(week - 1) % (skills.length || 1)] || course.name;

            let title = `Week ${week}: Mastering ${skillFocus}`;
            let description = `Deep-dive study, practical implementation, and guided skill exchange session for ${skillFocus}.`;
            let topics = [
                `Foundational principles and syntax for ${skillFocus}`,
                `Hands-on coding exercise and mini-project integration`,
                `1-on-1 exchange & peer discussion with ${course.authorName}`
            ];

            if (week === 1) {
                title = `Week 1: Introduction & Fundamentals of ${skills[0] || course.name}`;
                description = `Set up your learning roadmap, environment configuration, and core concepts.`;
                topics = [
                    `Development environment and project setup`,
                    `Understanding essential concepts of ${skills[0] || course.name}`,
                    `First hands-on demonstration & instructor intro session`
                ];
            } else if (week === duration) {
                title = `Week ${week}: Comprehensive Project & Skill Review`;
                description = `Bring all concepts together in a real-world project exchange.`;
                topics = [
                    `Final capstone implementation applying all learned skills`,
                    `Code review and constructive feedback session with ${course.authorName}`,
                    `Skill exchange milestone celebration and next steps`
                ];
            }

            modules.push({
                weekNumber: week,
                title,
                description,
                topics
            });
        }
        return modules;
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-muted">Loading your learning dashboard...</h4>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="container py-5">
                <div className="alert alert-danger shadow-sm text-center p-4">
                    <FaLightbulb size={36} className="mb-2 text-danger" />
                    <h4>Course Not Found</h4>
                    <p className="mb-3">{error || 'Could not find the requested course.'}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                        <FaArrowLeft className="me-2" /> Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const weeklyModules = generateWeeklyModules();

    return (
        <div className="course-view-container bg-light min-vh-100 pb-5">
            {/* Top Navigation Bar */}
            <header className="bg-white border-bottom shadow-sm sticky-top">
                <div className="container py-3 d-flex justify-content-between align-items-center">
                    <button
                        className="btn btn-outline-secondary d-flex align-items-center"
                        onClick={() => navigate('/dashboard')}
                    >
                        <FaArrowLeft className="me-2" /> Back to Dashboard
                    </button>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            className="btn btn-primary d-flex align-items-center shadow-sm"
                            onClick={() => navigate(`/chat/${course._id}`)}
                            title="Chat with your instructor"
                        >
                            <FaComments className="me-2" /> Chat with Instructor
                        </button>
                    </div>
                </div>
            </header>

            <div className="container mt-4">
                {/* Hero Header Card */}
                <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                    <div className="row g-0">
                        <div className="col-md-4">
                            <img
                                src={course.imageUrl}
                                alt={course.name}
                                className="img-fluid w-100 h-100"
                                style={{ objectFit: 'cover', minHeight: '220px' }}
                            />
                        </div>
                        <div className="col-md-8 p-4 d-flex flex-column justify-content-between">
                            <div>
                                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                    <span className="badge bg-primary px-3 py-2 rounded-pill">
                                        <FaGraduationCap className="me-1" /> Student Learning
                                    </span>
                                    <span className="badge bg-info text-dark px-3 py-2 rounded-pill">
                                        <FaClock className="me-1" /> {course.duration} Weeks
                                    </span>
                                    {progress === 100 && (
                                        <span className="badge bg-success px-3 py-2 rounded-pill">
                                            <FaCheckCircle className="me-1" /> Completed!
                                        </span>
                                    )}
                                </div>

                                <h2 className="fw-bold text-dark mb-2">{course.name}</h2>

                                <div className="text-muted d-flex align-items-center gap-2 mb-3">
                                    <FaChalkboardTeacher className="text-primary" />
                                    <span>Instructor: <strong>{course.authorName}</strong></span>
                                </div>

                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {(course.skills || []).map((skill, index) => (
                                        <span key={index} className="badge bg-light text-dark border">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="bg-light p-3 rounded-3 mt-2 border">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="fw-semibold text-secondary">
                                        Overall Completion Progress
                                    </span>
                                    <span className="fw-bold text-primary">
                                        {progress}% {savingProgress && <small className="text-muted ms-1">(Saving...)</small>}
                                    </span>
                                </div>
                                <div className="progress" style={{ height: '10px' }}>
                                    <div
                                        className={`progress-bar progress-bar-striped ${
                                            progress === 100 ? 'bg-success' : 'bg-primary'
                                        }`}
                                        role="progressbar"
                                        style={{ width: `${progress}%` }}
                                        aria-valuenow={progress}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                                <small className="text-muted mt-1 d-block">
                                    {completedWeeks.length} of {course.duration || 4} modules completed. Check modules below to track progress.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Left Column: Weekly Curriculum */}
                    <div className="col-lg-8">
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                                <h4 className="fw-bold mb-0 d-flex align-items-center text-dark">
                                    <FaBookOpen className="text-primary me-2" /> Course Curriculum & Modules
                                </h4>
                                <span className="text-muted small">
                                    {weeklyModules.length} Weekly Milestones
                                </span>
                            </div>

                            <div className="accordion-modules d-flex flex-column gap-3">
                                {weeklyModules.map((module, index) => {
                                    const isDone = completedWeeks.includes(index);
                                    return (
                                        <div
                                            key={index}
                                            className={`card border rounded-3 p-3 transition-all ${
                                                isDone ? 'border-success bg-white shadow-xs' : 'bg-white'
                                            }`}
                                            style={{ transition: 'all 0.2s ease-in-out' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start gap-3">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                        <span
                                                            className={`badge ${
                                                                isDone ? 'bg-success' : 'bg-secondary'
                                                            } rounded-pill`}
                                                        >
                                                            Week {module.weekNumber}
                                                        </span>
                                                        <h5 className="mb-0 fw-semibold text-dark">
                                                            {module.title}
                                                        </h5>
                                                    </div>

                                                    <p className="text-muted small mb-2">
                                                        {module.description}
                                                    </p>

                                                    <ul className="list-unstyled mb-0 ps-1">
                                                        {module.topics.map((topic, tIdx) => (
                                                            <li
                                                                key={tIdx}
                                                                className="d-flex align-items-center text-secondary small py-1"
                                                            >
                                                                <span className="me-2 text-primary">•</span>
                                                                {topic}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="text-end ps-2">
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${
                                                            isDone
                                                                ? 'btn-success text-white'
                                                                : 'btn-outline-primary'
                                                        } d-flex align-items-center gap-1 text-nowrap`}
                                                        onClick={() => handleToggleWeek(index)}
                                                    >
                                                        {isDone ? (
                                                            <>
                                                                <FaCheckCircle /> Completed
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaRegCircle /> Mark Done
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Instructor Connection & Resources */}
                    <div className="col-lg-4">
                        {/* Instructor Chat Box */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-primary text-white">
                            <h5 className="fw-bold mb-3 d-flex align-items-center">
                                <FaComments className="me-2" /> Direct Instructor Chat
                            </h5>
                            <p className="small text-white-50 mb-3">
                                Have questions about an assignment or want to schedule a skill exchange call? Chat 1-on-1 with {course.authorName} anytime.
                            </p>
                            <button
                                className="btn btn-light text-primary fw-bold w-100 py-2 d-flex align-items-center justify-content-center"
                                onClick={() => navigate(`/chat/${course._id}`)}
                            >
                                <FaComments className="me-2" /> Open Chat with {course.authorName}
                            </button>
                        </div>

                        {/* Learning Tips Card */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                            <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                <FaLightbulb className="text-warning me-2" /> Learning Tips
                            </h5>
                            <div className="d-flex flex-column gap-3 small text-secondary">
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>1</span>
                                    <span>Stay consistent by covering one module per week.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>2</span>
                                    <span>Share questions and exchange code snippets via the chat.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>3</span>
                                    <span>Use the integrated Video Call inside chat for live exchange sessions.</span>
                                </div>
                            </div>
                        </div>

                        {/* Course Overview Quick Facts */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 bg-white">
                            <h5 className="fw-bold mb-3 text-dark">Course Details</h5>
                            <ul className="list-group list-group-flush small">
                                <li className="list-group-item d-flex justify-content-between px-0">
                                    <span className="text-muted">Instructor</span>
                                    <span className="fw-semibold">{course.authorName}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between px-0">
                                    <span className="text-muted">Total Duration</span>
                                    <span className="fw-semibold">{course.duration} Weeks</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between px-0">
                                    <span className="text-muted">Primary Skills</span>
                                    <span className="fw-semibold">{(course.skills || []).join(', ')}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between px-0">
                                    <span className="text-muted">Status</span>
                                    <span className="badge bg-success">Active Enrollment</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseView;
