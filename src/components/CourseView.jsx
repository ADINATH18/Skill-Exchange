import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button, Form, ProgressBar, Alert, Badge } from 'react-bootstrap';
import {
    FaArrowLeft,
    FaComments,
    FaClock,
    FaChalkboardTeacher,
    FaGraduationCap,
    FaCheckCircle,
    FaLightbulb,
    FaBookOpen,
    FaVideo,
    FaUpload,
    FaPlus,
    FaTrash,
    FaTimes,
    FaEdit
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
    const [isAuthor, setIsAuthor] = useState(false);

    // Instructor Curriculum & Video Management Modal
    const [showManageModal, setShowManageModal] = useState(false);
    const [courseVideoInput, setCourseVideoInput] = useState('');
    const [modulesList, setModulesList] = useState([]);
    const [uploadingTarget, setUploadingTarget] = useState(null); // 'course' or module index number
    const [uploadProgress, setUploadProgress] = useState(0);
    const [savingModules, setSavingModules] = useState(false);
    const [manageError, setManageError] = useState('');
    const [manageSuccess, setManageSuccess] = useState('');

    const courseVideoFileRef = useRef(null);

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
            setIsAuthor(Boolean(data.isAuthor));
            setCourseVideoInput(data.course?.videoUrl || '');
            setModulesList(Array.isArray(data.course?.modules) ? data.course.modules : []);
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

    const handleUploadMediaFile = async (file, target) => {
        if (!file) return;

        if (file.size > 500 * 1024 * 1024) {
            setManageError('File size exceeds 500MB limit. Please choose a video up to 500MB.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploadingTarget(target);
        setUploadProgress(0);
        setManageError('');

        try {
            const res = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    }
                }
            });

            const fileUrl = res.data.url.startsWith('http') ? res.data.url : `${API_URL}${res.data.url}`;

            if (target === 'course') {
                setCourseVideoInput(fileUrl);
            } else if (typeof target === 'number') {
                setModulesList((prev) => {
                    const next = [...prev];
                    next[target] = { ...next[target], videoUrl: fileUrl };
                    return next;
                });
            }
        } catch (err) {
            console.error('Upload video error:', err);
            setManageError(err.response?.data?.message || 'Failed to upload video');
        } finally {
            setUploadingTarget(null);
            setUploadProgress(0);
        }
    };

    const handleAddModule = () => {
        setModulesList((prev) => [
            ...prev,
            { title: `Module ${prev.length + 1}`, description: '', videoUrl: '' }
        ]);
    };

    const handleRemoveModule = (index) => {
        setModulesList((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleModuleChange = (index, field, value) => {
        setModulesList((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSaveCourseContent = async (e) => {
        e?.preventDefault();
        setSavingModules(true);
        setManageError('');
        setManageSuccess('');

        try {
            const res = await axios.put(
                `${API_URL}/api/courses/${courseId}/modules`,
                {
                    modules: modulesList,
                    videoUrl: courseVideoInput
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setCourse(res.data.course);
            setManageSuccess('Course videos & curriculum updated successfully!');
            setTimeout(() => {
                setManageSuccess('');
                setShowManageModal(false);
            }, 1500);
        } catch (err) {
            console.error('Save modules error:', err);
            setManageError(err.response?.data?.message || 'Failed to update course content');
        } finally {
            setSavingModules(false);
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
                <div className="container py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                        <button
                            className="btn btn-outline-secondary d-flex align-items-center"
                            onClick={() => navigate('/dashboard')}
                        >
                            <FaArrowLeft className="me-2" /> Back to Dashboard
                        </button>

                        <button
                            className="btn btn-outline-primary d-flex align-items-center"
                            onClick={() => navigate('/messages')}
                        >
                            Messages
                        </button>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        {isAuthor && (
                            <Button
                                variant="outline-success"
                                className="d-flex align-items-center shadow-xs"
                                onClick={() => {
                                    setCourseVideoInput(course.videoUrl || '');
                                    setModulesList(Array.isArray(course.modules) ? course.modules : []);
                                    setShowManageModal(true);
                                }}
                            >
                                <FaVideo className="me-2 text-danger" /> Upload Videos & Curriculum
                            </Button>
                        )}

                        <button
                            className="btn btn-primary d-flex align-items-center shadow-sm"
                            onClick={() => navigate(`/chat/${course._id}`)}
                            title="Chat with instructor"
                        >
                            <FaComments className="me-2" /> Chat
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
                                    {course.videoUrl && (
                                        <span className="badge bg-danger px-3 py-2 rounded-pill">
                                            <FaVideo className="me-1" /> Video Lecture Included
                                        </span>
                                    )}
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
                        {/* Course Video Player (if course has an introductory video) */}
                        {course.videoUrl && (
                            <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                                <h4 className="fw-bold mb-3 d-flex align-items-center text-dark">
                                    <FaVideo className="text-danger me-2" /> Course Introduction & Video Lecture
                                </h4>
                                <div className="ratio ratio-16x9 rounded-3 overflow-hidden shadow-xs" style={{ backgroundColor: '#000' }}>
                                    <video
                                        src={course.videoUrl}
                                        controls
                                        preload="metadata"
                                        className="w-100 h-100"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Instructor Added Modules */}
                        {hasInstructorModules && (
                            <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0 d-flex align-items-center text-dark">
                                        <FaBookOpen className="text-primary me-2" /> Course Curriculum & Video Lessons
                                    </h4>
                                    {isAuthor && (
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => setShowManageModal(true)}
                                        >
                                            <FaEdit className="me-1" /> Edit Curriculum
                                        </Button>
                                    )}
                                </div>

                                <div className="d-flex flex-column gap-3">
                                    {course.modules.map((mod, index) => (
                                        <div key={index} className="p-3 border rounded-3 bg-light">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h5 className="fw-bold text-dark mb-0">
                                                    {mod.title || `Module ${index + 1}`}
                                                </h5>
                                                {mod.videoUrl && (
                                                    <Badge bg="danger" pill>
                                                        <FaVideo className="me-1" /> Video Lesson
                                                    </Badge>
                                                )}
                                            </div>

                                            {mod.description && (
                                                <p className="text-muted small mb-2">
                                                    {mod.description}
                                                </p>
                                            )}

                                            {/* Module Video Player */}
                                            {mod.videoUrl && (
                                                <div className="mt-3">
                                                    <div className="ratio ratio-16x9 rounded overflow-hidden shadow-xs" style={{ maxHeight: '340px', backgroundColor: '#000' }}>
                                                        <video
                                                            src={mod.videoUrl}
                                                            controls
                                                            preload="metadata"
                                                            className="w-100 h-100"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                Connect directly with {course.authorName} to ask questions, review projects, exchange skills, and send attachments/videos up to 500MB!
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
                                    <span>Watch course lectures and video lessons at your own pace.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>2</span>
                                    <span>Message your instructor to set up your weekly 1-on-1 video call.</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <span className="badge bg-light text-primary border rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 26, height: 26 }}>3</span>
                                    <span>Share large project files, recordings, and code directly in the chat!</span>
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

            {/* INSTRUCTOR CURRICULUM & VIDEO MANAGEMENT MODAL */}
            {isAuthor && (
                <Modal show={showManageModal} onHide={() => setShowManageModal(false)} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title className="fw-bold d-flex align-items-center">
                            <FaVideo className="text-danger me-2" /> Upload Videos & Manage Curriculum
                        </Modal.Title>
                    </Modal.Header>

                    <Modal.Body>
                        {manageError && (
                            <Alert variant="danger" dismissible onClose={() => setManageError('')}>
                                {manageError}
                            </Alert>
                        )}

                        {manageSuccess && (
                            <Alert variant="success" dismissible onClose={() => setManageSuccess('')}>
                                {manageSuccess}
                            </Alert>
                        )}

                        {uploadingTarget !== null && (
                            <div className="mb-3 p-3 bg-light border rounded">
                                <div className="d-flex justify-content-between small text-muted mb-1">
                                    <span>Uploading video file (up to 500MB)...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <ProgressBar animated now={uploadProgress} label={`${uploadProgress}%`} variant="success" />
                            </div>
                        )}

                        <Form onSubmit={handleSaveCourseContent}>
                            {/* Course Intro Video */}
                            <div className="p-3 bg-light rounded border mb-4">
                                <Form.Label className="fw-bold text-dark d-flex align-items-center">
                                    <FaVideo className="text-danger me-2" /> Course Introduction Video Lecture
                                </Form.Label>
                                <p className="text-muted small mb-2">
                                    Upload a video lecture or introductory preview for your students (MP4, WebM, MOV, etc. up to 500MB).
                                </p>

                                <div className="d-flex gap-2 mb-2 flex-wrap">
                                    <input
                                        ref={courseVideoFileRef}
                                        type="file"
                                        accept="video/*"
                                        className="d-none"
                                        onChange={(e) => handleUploadMediaFile(e.target.files[0], 'course')}
                                    />
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        type="button"
                                        className="d-flex align-items-center"
                                        onClick={() => courseVideoFileRef.current?.click()}
                                        disabled={uploadingTarget !== null}
                                    >
                                        <FaUpload className="me-1" /> Upload Course Video (up to 500MB)
                                    </Button>
                                </div>

                                <Form.Control
                                    type="url"
                                    value={courseVideoInput}
                                    onChange={(e) => setCourseVideoInput(e.target.value)}
                                    placeholder="Or paste video URL (e.g. /uploads/video.mp4 or https://...)"
                                />

                                {courseVideoInput && (
                                    <div className="mt-2 p-2 bg-white rounded border">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <small className="text-success fw-bold d-flex align-items-center">
                                                <FaCheckCircle className="me-1" /> Video attached
                                            </small>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-danger p-0"
                                                onClick={() => setCourseVideoInput('')}
                                            >
                                                <FaTimes /> Remove
                                            </Button>
                                        </div>
                                        <video
                                            src={courseVideoInput}
                                            controls
                                            preload="metadata"
                                            className="w-100 rounded"
                                            style={{ maxHeight: '180px', backgroundColor: '#000' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Modules & Lesson Videos */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="fw-bold text-dark mb-0">
                                        Modules & Lesson Videos ({modulesList.length})
                                    </h5>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        type="button"
                                        onClick={handleAddModule}
                                        className="d-flex align-items-center"
                                    >
                                        <FaPlus className="me-1" /> Add Module
                                    </Button>
                                </div>

                                {modulesList.length === 0 ? (
                                    <div className="text-center p-4 bg-light rounded border text-muted">
                                        <p className="mb-2">No modules added yet. Add modules to organize your video lessons and curriculum!</p>
                                        <Button variant="primary" size="sm" onClick={handleAddModule}>
                                            <FaPlus className="me-1" /> Add First Module
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-3">
                                        {modulesList.map((mod, idx) => (
                                            <div key={idx} className="p-3 bg-light border rounded">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-primary">Module {idx + 1}</span>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        type="button"
                                                        className="p-1"
                                                        onClick={() => handleRemoveModule(idx)}
                                                        title="Delete module"
                                                    >
                                                        <FaTrash size={12} />
                                                    </Button>
                                                </div>

                                                <Form.Group className="mb-2">
                                                    <Form.Label className="small fw-semibold mb-1">Module Title</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        size="sm"
                                                        value={mod.title}
                                                        onChange={(e) => handleModuleChange(idx, 'title', e.target.value)}
                                                        placeholder="e.g. Introduction to React Hooks"
                                                        required
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mb-2">
                                                    <Form.Label className="small fw-semibold mb-1">Description / Notes</Form.Label>
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={2}
                                                        size="sm"
                                                        value={mod.description}
                                                        onChange={(e) => handleModuleChange(idx, 'description', e.target.value)}
                                                        placeholder="What will students learn in this module?"
                                                    />
                                                </Form.Group>

                                                {/* Module Video Upload */}
                                                <Form.Group>
                                                    <Form.Label className="small fw-semibold mb-1 d-flex align-items-center">
                                                        <FaVideo className="text-danger me-1" /> Module Video Lesson
                                                    </Form.Label>

                                                    <div className="d-flex gap-2 mb-1 flex-wrap">
                                                        <label className="btn btn-outline-danger btn-sm mb-0">
                                                            <FaUpload className="me-1" /> Upload Video File
                                                            <input
                                                                type="file"
                                                                accept="video/*"
                                                                className="d-none"
                                                                onChange={(e) => handleUploadMediaFile(e.target.files[0], idx)}
                                                                disabled={uploadingTarget !== null}
                                                            />
                                                        </label>
                                                    </div>

                                                    <Form.Control
                                                        type="url"
                                                        size="sm"
                                                        value={mod.videoUrl || ''}
                                                        onChange={(e) => handleModuleChange(idx, 'videoUrl', e.target.value)}
                                                        placeholder="Or paste video lesson URL (e.g. /uploads/video.mp4)"
                                                    />

                                                    {mod.videoUrl && (
                                                        <div className="mt-2 p-2 bg-white rounded border">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <small className="text-success fw-bold">
                                                                    <FaCheckCircle className="me-1" /> Video attached
                                                                </small>
                                                                <Button
                                                                    variant="link"
                                                                    size="sm"
                                                                    className="text-danger p-0"
                                                                    onClick={() => handleModuleChange(idx, 'videoUrl', '')}
                                                                >
                                                                    <FaTimes />
                                                                </Button>
                                                            </div>
                                                            <video
                                                                src={mod.videoUrl}
                                                                controls
                                                                preload="metadata"
                                                                className="w-100 rounded"
                                                                style={{ maxHeight: '160px', backgroundColor: '#000' }}
                                                            />
                                                        </div>
                                                    )}
                                                </Form.Group>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                                <Button variant="secondary" onClick={() => setShowManageModal(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" disabled={savingModules || uploadingTarget !== null}>
                                    {savingModules ? 'Saving Content...' : 'Save Videos & Curriculum'}
                                </Button>
                            </div>
                        </Form>
                    </Modal.Body>
                </Modal>
            )}
        </div>
    );
};

export default CourseView;
