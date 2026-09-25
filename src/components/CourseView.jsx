import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    FaArrowLeft,
    FaComments,
    FaClock,
    FaChalkboardTeacher,
    FaGraduationCap,
    FaCheckCircle,
    FaLightbulb,
    FaBookOpen,
    FaRegSmile
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
            setProgress(data.progress || data.enrollment?.progress || 0);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching course:', err);
            setError(err.response?.data?.message || 'Error loading course details');
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (newProgress) => {
        if (!course) return;

        const clampedProgress = Math.min(100, Math.max(0, newProgress));
        setProgress(clampedProgress);

        try {
            setSavingProgress(true);
            await axios.put(
                `${API_URL}/api/courses/${courseId}/progress`,
                { progress: clampedProgress },
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

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-muted">Loading course details...</h4>
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

    const hasInstructorModules = Array.isArray(course.modules) && course.modules.length > 0;

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

                    <button
                        className="btn btn-primary d-flex align-items-center shadow-sm"
                        onClick={() => navigate(`/chat/${course._id}`)}
                        title="Chat with your instructor"
                    >
                        <FaComments className="me-2" /> Chat with Instructor
                    </button>
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
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-semibold text-secondary">
                                        Completion Progress
                                    </span>
                                    <span className="fw-bold text-primary">
                                        {progress}% {savingProgress && <small className="text-muted ms-1">(Saving...)</small>}
                                    </span>
                                </div>
                                <div className="progress mb-2" style={{ height: '10px' }}>
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

                                {/* Quick Progress Controls */}
                                <div className="d-flex align-items-center gap-2 flex-wrap pt-1">
                                    <small className="text-muted me-1">Update Progress:</small>
                                    {[25, 50, 75, 100].map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            className={`btn btn-sm ${
                                                progress === val ? 'btn-primary' : 'btn-outline-secondary'
                                            } py-0 px-2`}
                                            style={{ fontSize: '0.8rem' }}
                                            onClick={() => handleUpdateProgress(val)}
                                        >
                                            {val === 100 ? '100% Done' : `${val}%`}
                                        </button>
                                    ))}
                                    {progress > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-link text-muted p-0 ms-auto"
                                            style={{ fontSize: '0.8rem' }}
                                            onClick={() => handleUpdateProgress(0)}
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {/* Main Left Column */}
                    <div className="col-lg-8">
                        {/* Instructor Added Modules (Only shown if instructor actually added them) */}
                        {hasInstructorModules ? (
                            <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                                <h4 className="fw-bold mb-3 d-flex align-items-center text-dark">
                                    <FaBookOpen className="text-primary me-2" /> Course Curriculum & Modules
                                </h4>
                                <div className="d-flex flex-column gap-3">
                                    {course.modules.map((mod, index) => (
                                        <div key={index} className="p-3 border rounded-3 bg-light">
                                            <h5 className="fw-bold text-dark mb-1">
                                                {mod.title || `Module ${index + 1}`}
                                            </h5>
                                            {mod.description && (
                                                <p className="text-muted small mb-0">
                                                    {mod.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Course Overview & Learning Plan */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                            <h4 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                <FaBookOpen className="text-primary me-2" /> Course Overview & Exchange Plan
                            </h4>

                            <p className="text-secondary mb-4">
                                {course.description || `Welcome to ${course.name}! In this skill exchange course, you will learn hands-on practical skills directly from ${course.authorName}.`}
                            </p>

                            <div className="p-4 rounded-3 bg-light border mb-4">
                                <div className="d-flex align-items-start gap-3">
                                    <div className="bg-white p-3 rounded-circle text-primary shadow-xs">
                                        <FaComments size={24} />
                                    </div>
                                    <div>
                                        <h5 className="fw-bold text-dark mb-1">
                                            Coordinated with Instructor
                                        </h5>
                                        <p className="text-muted small mb-3">
                                            Your instructor <strong>{course.authorName}</strong> will guide your learning schedule, share study materials, and assign practice exercises directly through the 1-on-1 chat and video sessions.
                                        </p>
                                        <button
                                            className="btn btn-primary btn-sm d-flex align-items-center"
                                            onClick={() => navigate(`/chat/${course._id}`)}
                                        >
                                            <FaComments className="me-2" /> Start Discussion with {course.authorName}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <h5 className="fw-bold text-dark mb-3">Skills You Are Learning</h5>
                            <div className="d-flex flex-wrap gap-2">
                                {(course.skills || []).map((skill, index) => (
                                    <span key={index} className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 rounded-pill">
                                        ✓ {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Instructor Connection & Course Details */}
                    <div className="col-lg-4">
                        {/* Instructor Chat Box */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-primary text-white">
                            <h5 className="fw-bold mb-3 d-flex align-items-center">
                                <FaComments className="me-2" /> 1-on-1 Instructor Chat
                            </h5>
                            <p className="small text-white-50 mb-3">
                                Connect directly with {course.authorName} to ask questions, review projects, and exchange skills.
                            </p>
                            <button
                                className="btn btn-light text-primary fw-bold w-100 py-2 d-flex align-items-center justify-content-center"
                                onClick={() => navigate(`/chat/${course._id}`)}
                            >
                                <FaComments className="me-2" /> Open Chat
                            </button>
                        </div>

                        {/* Learning Tips Card */}
                        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                            <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                <FaLightbulb className="text-warning me-2" /> Tips for Success
                            </h5>
                            <div className="d-flex flex-column gap-3 small text-secondary">
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>1</span>
                                    <span>Message your instructor to set up your weekly exchange schedule.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>2</span>
                                    <span>Share questions, code, and resources via the built-in chat attachments.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>3</span>
                                    <span>Update your progress percentage above as you learn!</span>
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
