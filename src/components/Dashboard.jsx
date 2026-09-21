import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateCourseModal from './CreateCourseModal';
import { FaGraduationCap, FaChalkboardTeacher, FaSearch, FaBook, FaSignOutAlt, FaPlus, FaComments, 
    FaStar, FaUsers, FaFilter, FaClock, FaChartLine, FaBell, FaLightbulb } from 'react-icons/fa';

const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:1337';

const Dashboard = () => {
    const navigate = useNavigate();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchSkill, setSearchSkill] = useState('');
    const [courses, setCourses] = useState([]);
    const [myCourses, setMyCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedLevel, setSelectedLevel] = useState('all');
    const [showNotification, setShowNotification] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState([]);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [courseStats, setCourseStats] = useState({
        averageProgress: 0,
        totalStudents: 0,
        averageRating: 0
    });

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        let mounted = true;

        const refreshDashboard = async () => {
            if (!mounted) return;
            await fetchCourses();
            await fetchNotifications();
            await fetchUnreadMessages();
        };

        refreshDashboard();

        const interval = setInterval(refreshDashboard, 5000);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [navigate, token, searchSkill]);

    const fetchCourses = async () => {
        try {
            const [coursesRes, myCoursesRes, enrolledRes] = await Promise.all([
                axios.get(`${API_URL}/api/courses/search`, {
                    params: { skill: searchSkill },
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/api/courses/my-courses`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/api/courses/enrolled`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setCourses(coursesRes.data);
            setMyCourses(myCoursesRes.data);
            setEnrolledCourses(enrolledRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setLoading(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const fetchUnreadMessages = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/messages/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadMessages(response.data.count);
        } catch (error) {
            console.error('Error fetching unread messages:', error);
        }
    };

    useEffect(() => {
        const progress = enrolledCourses.reduce(
            (acc, course) => acc + (course.progress || 0),
            0
        );

        const averageProgress = enrolledCourses.length
            ? Math.round(progress / enrolledCourses.length)
            : 0;

        const totalStudents = myCourses.reduce(
            (acc, course) =>
                acc + course.enrollments.filter(e => e.status === 'approved').length,
            0
        );

        const totalRating = myCourses.reduce(
            (acc, course) => acc + (course.rating || 0),
            0
        );

        const averageRating = myCourses.length
            ? (totalRating / myCourses.length).toFixed(1)
            : 0;

        setCourseStats({
            averageProgress,
            totalStudents,
            averageRating
        });
    }, [enrolledCourses, myCourses]);

    const calculateCourseStats = () => {
        const progress = enrolledCourses.reduce(
            (acc, course) => acc + (course.progress || 0),
            0
        );

        const averageProgress = enrolledCourses.length
            ? Math.round(progress / enrolledCourses.length)
            : 0;

        const totalStudents = myCourses.reduce(
            (acc, course) =>
                acc + course.enrollments.filter(e => e.status === 'approved').length,
            0
        );

        const totalRating = myCourses.reduce(
            (acc, course) => acc + (course.rating || 0),
            0
        );

        const averageRating = myCourses.length
            ? (totalRating / myCourses.length).toFixed(1)
            : 0;

        setCourseStats({
            averageProgress,
            totalStudents,
            averageRating
        });
    };

    const categories = [
        'All',
        'Programming',
        'Data Science',
        'Web Development',
        'Mobile Development',
        'AI/ML'
    ];

    const levels = [
        'All',
        'Beginner',
        'Intermediate',
        'Advanced'
    ];

    const filteredCourses = courses.filter(course => {
        if (!searchSkill.trim()) return false;

        const matchesSkill = course.skills.some(skill =>
            skill.toLowerCase().includes(searchSkill.toLowerCase())
        );

        const matchesCategory =
            selectedCategory === 'all' ||
            course.category === selectedCategory;

        const matchesLevel =
            selectedLevel === 'all' ||
            course.level === selectedLevel;

        return matchesSkill && matchesCategory && matchesLevel;
    });

    const handleEnrollRequest = async (courseId) => {
        try {
            await axios.post(
                `${API_URL}/api/courses/enroll/${courseId}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert('Enrollment request sent successfully!');
            fetchCourses();
        } catch (error) {
            alert(
                error.response?.data?.message ||
                'Error sending enrollment request'
            );
        }
    };

    const handleApproveReject = async (
        courseId,
        studentId,
        status
    ) => {
        try {
            await axios.put(
                `${API_URL}/api/courses/enrollment/${courseId}/${studentId}`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert(`Enrollment ${status} successfully!`);
            fetchCourses();
        } catch (error) {
            alert(
                error.response?.data?.message ||
                `Error ${status}ing enrollment`
            );
        }
    };

    const handleCancelEnrollment = async (courseId, studentId) => {
        const confirmed = window.confirm(
            'Are you sure you want to cancel this student enrollment?'
        );

        if (!confirmed) return;

        try {
            await axios.delete(
                `${API_URL}/api/courses/enrollment/${courseId}/${studentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            alert('Student enrollment cancelled successfully');
            await fetchCourses();
        } catch (error) {
            console.error('Cancel enrollment error:', error);
            alert(
                error.response?.data?.message ||
                'Failed to cancel enrollment'
            );
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        navigate('/login');
    };

    const renderStarRating = (rating) => {
        return [...Array(5)].map((_, index) => (
            <FaStar
                key={index}
                className={
                    index < Math.floor(rating)
                        ? 'text-warning'
                        : 'text-muted'
                }
                size={14}
            />
        ));
    };

    return (
        <div className="dashboard-container">

            <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
                <div className="container">
                    <a
                        className="navbar-brand d-flex align-items-center"
                        href="#"
                    >
                        <FaGraduationCap
                            className="me-2 brand-icon"
                            size={24}
                        />
                        SkillShare
                    </a>

                    <div className="d-flex align-items-center">

                        <div className="position-relative me-3">
                            <button
                                className="btn btn-outline-light notification-btn"
                                onClick={() =>
                                    setShowNotification(!showNotification)
                                }
                            >
                                <FaBell />

                                {notifications.length > 0 && (
                                    <span className="notification-badge">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {showNotification && (
                                <div className="notification-dropdown">
                                    {notifications.length > 0 ? (
                                        notifications.map(notification => (
                                            <div
                                                key={notification._id}
                                                className="notification-item"
                                            >
                                                <FaLightbulb
                                                    className={`text-${notification.type} me-2`}
                                                />

                                                <div>
                                                    <strong>
                                                        {notification.title}
                                                    </strong>

                                                    <p className="mb-0">
                                                        {notification.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="notification-item text-center">
                                            <p className="mb-0">
                                                No new notifications
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            className="btn btn-outline-light me-2 d-flex align-items-center pulse-button"
                            onClick={() =>
                                navigate('/instructor-chats')
                            }
                        >
                            <FaComments className="me-2" />
                            Messages

                            {unreadMessages > 0 && (
                                <span className="pulse-badge">
                                    {unreadMessages}
                                </span>
                            )}
                        </button>

                        <button
                            className="btn btn-outline-light me-2 d-flex align-items-center"
                            onClick={() =>
                                setShowCreateModal(true)
                            }
                        >
                            <FaPlus className="me-2" />
                            Create Course
                        </button>

                        <button
                            className="btn btn-danger d-flex align-items-center"
                            onClick={handleLogout}
                        >
                            <FaSignOutAlt className="me-2" />
                            Logout
                        </button>

                    </div>
                </div>
            </nav>

            <div className="container main-content mt-5 pt-4">

                <div className="welcome-banner text-center py-5 mb-4 rounded position-relative overflow-hidden">

                    <div className="welcome-content">

                        <h1 className="display-4 mb-3">
                            Welcome back, {localStorage.getItem('userName')}! 👋
                        </h1>

                        <p className="lead mb-4">
                            Ready to continue your learning journey?
                        </p>

                        <div className="stats-container d-flex justify-content-center gap-4">

                            <div className="stat-item">
                                <div className="stat-value">
                                    {enrolledCourses.length}
                                </div>
                                <div className="stat-label">
                                    Courses in Progress
                                </div>
                            </div>

                            <div className="stat-item">
                                <div className="stat-value">
                                    {courseStats.totalStudents}
                                </div>
                                <div className="stat-label">
                                    Total Students
                                </div>
                            </div>

                            <div className="stat-item">
                                <div className="stat-value">
                                    {courseStats.averageProgress}%
                                </div>
                                <div className="stat-label">
                                    Average Progress
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="welcome-shapes">
                        <div className="shape shape-1"></div>
                        <div className="shape shape-2"></div>
                        <div className="shape shape-3"></div>
                    </div>

                </div>

                <div className="quick-actions mb-5">

                    <div className="row g-4">

                        <div className="col-md-4">
                            <div
                                className="quick-action-card"
                                onClick={() =>
                                    document
                                        .querySelector('input[type="text"]')
                                        .focus()
                                }
                            >
                                <FaSearch className="quick-action-icon" />
                                <h4>Find Courses</h4>
                                <p>
                                    Discover new learning opportunities
                                </p>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div
                                className="quick-action-card"
                                onClick={() =>
                                    navigate('/instructor-chats')
                                }
                            >
                                <FaComments className="quick-action-icon" />
                                <h4>Message Center</h4>
                                <p>
                                    Connect with instructors and peers
                                </p>
                            </div>
                        </div>

                        <div className="col-md-4">
                            <div
                                className="quick-action-card"
                                onClick={() =>
                                    setShowCreateModal(true)
                                }
                            >
                                <FaChalkboardTeacher className="quick-action-icon" />
                                <h4>Start Teaching</h4>
                                <p>
                                    Share your knowledge with others
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                <div className="search-section mb-5">

                    <div className="search-box position-relative mb-3">

                        <FaSearch
                            className="search-icon position-absolute text-muted"
                            style={{
                                left: '15px',
                                top: '50%',
                                transform: 'translateY(-50%)'
                            }}
                        />

                        <input
                            type="text"
                            className="form-control form-control-lg ps-5"
                            placeholder="What do you want to learn? Enter skills..."
                            value={searchSkill}
                            onChange={(e) =>
                                setSearchSkill(e.target.value)
                            }
                            style={{
                                borderRadius: '50px'
                            }}
                        />

                    </div>

                    {showFilters && (
                        <div className="filter-section p-3 bg-white rounded shadow-sm mb-4">

                            <div className="row">

                                <div className="col-md-6">

                                    <label className="form-label">
                                        Category
                                    </label>

                                    <select
                                        className="form-select"
                                        value={selectedCategory}
                                        onChange={(e) =>
                                            setSelectedCategory(
                                                e.target.value
                                            )
                                        }
                                    >
                                        {categories.map(category => (
                                            <option
                                                key={category.toLowerCase()}
                                                value={category.toLowerCase()}
                                            >
                                                {category}
                                            </option>
                                        ))}
                                    </select>

                                </div>

                                <div className="col-md-6">

                                    <label className="form-label">
                                        Level
                                    </label>

                                    <select
                                        className="form-select"
                                        value={selectedLevel}
                                        onChange={(e) =>
                                            setSelectedLevel(
                                                e.target.value
                                            )
                                        }
                                    >
                                        {levels.map(level => (
                                            <option
                                                key={level.toLowerCase()}
                                                value={level.toLowerCase()}
                                            >
                                                {level}
                                            </option>
                                        ))}
                                    </select>

                                </div>

                            </div>
                        </div>
                    )}

                    <div className="text-center mt-2 text-muted">
                        <small>
                            Popular skills: JavaScript, Python, React, Data Science
                        </small>
                    </div>

                </div>

                <div className="course-tabs mb-4">

                    <div className="nav nav-pills">

                        <button
                            className={`nav-link ${
                                activeTab === 'all' ? 'active' : ''
                            }`}
                            onClick={() => setActiveTab('all')}
                        >
                            All Courses
                        </button>

                        <button
                            className={`nav-link ${
                                activeTab === 'learning'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveTab('learning')
                            }
                        >
                            My Learning
                        </button>

                        <button
                            className={`nav-link ${
                                activeTab === 'teaching'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveTab('teaching')
                            }
                        >
                            Teaching
                        </button>

                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <div
                            className="spinner-border text-primary"
                            role="status"
                        >
                            <span className="visually-hidden">
                                Loading...
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        {searchSkill.trim() && (
                            <div className="courses-section mb-5">

                                <div className="section-header d-flex justify-content-between align-items-center mb-4">

                                    <div className="d-flex align-items-center">
                                        <FaSearch
                                            className="me-2 text-primary"
                                            size={24}
                                        />
                                        <h2 className="mb-0">
                                            Available Courses
                                        </h2>
                                    </div>

                                    <div className="text-muted">
                                        {filteredCourses.length} courses found
                                    </div>

                                </div>

                                <div className="row g-4">

                                    {filteredCourses.length > 0 ? (
                                        filteredCourses.map(course => (
                                            <div
                                                key={course._id}
                                                className="col-md-4"
                                            >

                                                <div className="card h-100 course-card shadow-sm">

                                                    <div className="position-relative">

                                                        <img
                                                            src={course.imageUrl}
                                                            className="card-img-top"
                                                            alt={course.name}
                                                            style={{
                                                                height: '200px',
                                                                objectFit: 'cover'
                                                            }}
                                                        />

                                                        <div
                                                            className="position-absolute top-0 end-0 m-2"
                                                        >
                                                            <span className="badge bg-primary">
                                                                {course.level ||
                                                                    'All Levels'}
                                                            </span>
                                                        </div>

                                                    </div>

                                                    <div className="card-body">

                                                        <div className="d-flex justify-content-between align-items-start mb-2">

                                                            <h5 className="card-title text-primary">
                                                                {course.name}
                                                            </h5>

                                                            <span className="badge bg-light text-dark">
                                                                {course.category ||
                                                                    'General'}
                                                            </span>

                                                        </div>

                                                        <p className="card-text text-muted">
                                                            {course.description}
                                                        </p>

                                                        <div className="skills-container mb-3">

                                                            {course.skills.map(
                                                                (
                                                                    skill,
                                                                    index
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="badge bg-light text-dark me-2 mb-2"
                                                                    >
                                                                        {skill}
                                                                    </span>
                                                                )
                                                            )}

                                                        </div>

                                                        <div className="course-meta d-flex justify-content-between align-items-center mb-3">

                                                            <span className="text-muted d-flex align-items-center">
                                                                <FaClock className="me-2" />
                                                                {
                                                                    course.duration
                                                                }{' '}
                                                                weeks
                                                            </span>

                                                            <span className="text-muted d-flex align-items-center">
                                                                <FaChartLine className="me-2" />
                                                                {course.level ||
                                                                    'All Levels'}
                                                            </span>

                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center">

                                                            <div>
                                                                {renderStarRating(
                                                                    course.rating ||
                                                                        0
                                                                )}

                                                                <span className="ms-2 text-muted">
                                                                    {course.rating ||
                                                                        0}
                                                                </span>
                                                            </div>

                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() =>
                                                                    handleEnrollRequest(
                                                                        course._id
                                                                    )
                                                                }
                                                            >
                                                                Enroll
                                                            </button>

                                                        </div>

                                                    </div>
                                                </div>

                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-12">

                                            <div className="alert alert-info text-center py-5">

                                                <FaSearch
                                                    size={48}
                                                    className="mb-3 text-primary"
                                                />

                                                <h4>
                                                    No courses found
                                                </h4>

                                                <p>
                                                    Try searching for another skill.
                                                </p>

                                            </div>

                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {activeTab !== 'teaching' && (
                            <div className="courses-section mb-5">

                                <div className="section-header d-flex justify-content-between align-items-center mb-4">

                                    <div className="d-flex align-items-center">
                                        <FaBook
                                            className="me-2 text-primary"
                                            size={24}
                                        />

                                        <h2 className="mb-0">
                                            My Learning
                                        </h2>
                                    </div>

                                    <div className="text-muted">
                                        {enrolledCourses.length} courses enrolled
                                    </div>

                                </div>

                                <div className="row g-4">

                                    {enrolledCourses.length > 0 ? (
                                        enrolledCourses.map(course => (
                                            <div
                                                key={course._id}
                                                className="col-md-4"
                                            >

                                                <div className="card h-100 course-card shadow-sm">

                                                    <div className="position-relative">

                                                        <img
                                                            src={course.imageUrl}
                                                            className="card-img-top"
                                                            alt={course.name}
                                                            style={{
                                                                height: '200px',
                                                                objectFit: 'cover'
                                                            }}
                                                        />

                                                        <div
                                                            className="card-progress-bar"
                                                            style={{
                                                                width: `${course.progress || 0}%`
                                                            }}
                                                        ></div>

                                                    </div>

                                                    <div className="card-body">

                                                        <div className="d-flex justify-content-between align-items-start mb-2">

                                                            <h5 className="card-title text-primary">
                                                                {course.name}
                                                            </h5>

                                                            <span className="badge bg-success">
                                                                Enrolled
                                                            </span>

                                                        </div>

                                                        <p className="card-text text-muted">
                                                            {course.description}
                                                        </p>

                                                        <div className="progress mb-3">
                                                            <div
                                                                className="progress-bar"
                                                                role="progressbar"
                                                                style={{
                                                                    width: `${
                                                                        course.progress ||
                                                                        0
                                                                    }%`
                                                                }}
                                                            >
                                                                {
                                                                    course.progress ||
                                                                    0
                                                                }%
                                                            </div>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center">

                                                            <span className="text-muted">
                                                                Progress
                                                            </span>

                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/course/${course._id}`
                                                                    )
                                                                }
                                                            >
                                                                Continue Learning
                                                            </button>

                                                        </div>

                                                    </div>
                                                </div>

                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-12">

                                            <div className="alert alert-info text-center py-5">

                                                <FaBook
                                                    size={48}
                                                    className="mb-3 text-primary"
                                                />

                                                <h4>
                                                    No enrolled courses yet
                                                </h4>

                                                <p className="mb-4">
                                                    Start your learning journey
                                                    by enrolling in a course!
                                                </p>

                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() =>
                                                        document
                                                            .querySelector(
                                                                'input[type="text"]'
                                                            )
                                                            .focus()
                                                    }
                                                >
                                                    Browse Courses
                                                </button>

                                            </div>

                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {activeTab !== 'learning' && (
                            <div className="courses-section mb-5">

                                <div className="section-header d-flex justify-content-between align-items-center mb-4">

                                    <div className="d-flex align-items-center">

                                        <FaChalkboardTeacher
                                            className="me-2 text-primary"
                                            size={24}
                                        />

                                        <h2 className="mb-0">
                                            My Teaching
                                        </h2>

                                    </div>

                                    <div className="text-muted">
                                        {myCourses.length} courses created
                                    </div>

                                </div>

                                <div className="row g-4">

                                    {myCourses.length > 0 ? (
                                        myCourses.map(course => (
                                            <div
                                                key={course._id}
                                                className="col-md-4"
                                            >

                                                <div className="card h-100 course-card shadow-sm">

                                                    <div className="position-relative">

                                                        <img
                                                            src={course.imageUrl}
                                                            className="card-img-top"
                                                            alt={course.name}
                                                            style={{
                                                                height: '200px',
                                                                objectFit: 'cover'
                                                            }}
                                                        />

                                                        <div
                                                            className="course-stats-overlay position-absolute bottom-0 start-0 end-0 p-2"
                                                            style={{
                                                                background:
                                                                    'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                                color: 'white'
                                                            }}
                                                        >

                                                            <div className="d-flex justify-content-between">

                                                                <span>
                                                                    <FaUsers className="me-2" />
                                                                    {
                                                                        course.enrollments.filter(
                                                                            e =>
                                                                                e.status ===
                                                                                'approved'
                                                                        ).length
                                                                    }{' '}
                                                                    Students
                                                                </span>

                                                                <span>
                                                                    <FaStar className="me-2" />
                                                                    {course.rating ||
                                                                        0}{' '}
                                                                    Rating
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </div>

                                                    <div className="card-body">

                                                        <div className="d-flex justify-content-between align-items-start mb-2">

                                                            <h5 className="card-title text-primary mb-0">
                                                                {course.name}
                                                            </h5>

                                                            <span className="badge bg-light text-dark">
                                                                {course.category ||
                                                                    'General'}
                                                            </span>

                                                        </div>

                                                        <div className="skills-container mb-3">

                                                            {course.skills.map(
                                                                (
                                                                    skill,
                                                                    index
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="badge bg-light text-dark me-2 mb-2"
                                                                    >
                                                                        {skill}
                                                                    </span>
                                                                )
                                                            )}

                                                        </div>

                                                        <div className="course-meta d-flex justify-content-between align-items-center mb-3">

                                                            <span className="text-muted d-flex align-items-center">
                                                                <FaClock className="me-2" />
                                                                {
                                                                    course.duration
                                                                }{' '}
                                                                weeks
                                                            </span>

                                                            <span className="text-muted d-flex align-items-center">
                                                                <FaChartLine className="me-2" />
                                                                {course.level ||
                                                                    'All Levels'}
                                                            </span>

                                                        </div>

                                                        <div className="enrollment-requests mt-3">

                                                            <h6 className="d-flex justify-content-between align-items-center mb-3">

                                                                <span>
                                                                    Enrollment
                                                                    Requests
                                                                </span>

                                                                <span className="badge bg-primary">
                                                                    {
                                                                        course.enrollments.filter(
                                                                            e =>
                                                                                e.status ===
                                                                                'pending'
                                                                        ).length
                                                                    }
                                                                </span>

                                                            </h6>

                                                            {course.enrollments
                                                                .filter(
                                                                    e =>
                                                                        e.status ===
                                                                        'pending'
                                                                )
                                                                .map(
                                                                    enrollment => (
                                                                        <div
                                                                            key={
                                                                                enrollment._id
                                                                            }
                                                                            className="enrollment-request p-3 mb-2 bg-light rounded"
                                                                        >

                                                                            <div className="d-flex justify-content-between align-items-center mb-2">

                                                                                <div className="d-flex align-items-center">

                                                                                    <FaUsers className="me-2 text-primary" />

                                                                                    <span>
                                                                                        {enrollment.student?.name || enrollment.student?.email || `Student ${enrollment.student?._id || enrollment.student}`}
                                                                                    </span>

                                                                                </div>

                                                                                <small className="text-muted">
                                                                                    2 days ago
                                                                                </small>

                                                                            </div>

                                                                            <div className="d-flex gap-2">

                                                                                <button
                                                                                    className="btn btn-success btn-sm flex-grow-1"
                                                                                    onClick={() =>
                                                                                        handleApproveReject(
                                                                                            course._id,
                                                                                            enrollment.student?._id || enrollment.student,
                                                                                            'approved'
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Approve
                                                                                </button>

                                                                                <button
                                                                                    className="btn btn-outline-danger btn-sm flex-grow-1"
                                                                                    onClick={() =>
                                                                                        handleApproveReject(
                                                                                            course._id,
                                                                                            enrollment.student?._id || enrollment.student,
                                                                                            'rejected'
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Reject
                                                                                </button>

                                                                            </div>

                                                                        </div>
                                                                    )
                                                                )}

                                                            {course.enrollments.filter(
                                                                e => e.status === 'approved'
                                                            ).length > 0 && (
                                                                <div className="mt-3">
                                                                    <h6 className="mb-2">
                                                                        Enrolled Students
                                                                    </h6>

                                                                    {course.enrollments
                                                                        .filter(e => e.status === 'approved')
                                                                        .map(enrollment => (
                                                                            <div
                                                                                key={`approved-${enrollment._id}`}
                                                                                className="d-flex justify-content-between align-items-center p-3 mb-2 bg-white border rounded"
                                                                            >
                                                                                <div className="d-flex align-items-center">
                                                                                    <FaUsers className="me-2 text-success" />
                                                                                    <span>
                                                                                        {enrollment.student?.name ||
                                                                                            enrollment.student?.email ||
                                                                                            `Student ${enrollment.student?._id || enrollment.student}`}
                                                                                    </span>
                                                                                </div>

                                                                                <button
                                                                                    className="btn btn-outline-danger btn-sm"
                                                                                    onClick={() =>
                                                                                        handleCancelEnrollment(
                                                                                            course._id,
                                                                                            enrollment.student?._id || enrollment.student
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Cancel Enrollment
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            )}

                                                            {course.enrollments.filter(
                                                                e =>
                                                                    e.status ===
                                                                    'pending'
                                                            ).length === 0 && (
                                                                <div className="text-muted text-center py-3 bg-light rounded">

                                                                    <FaUsers
                                                                        className="mb-2"
                                                                        size={24}
                                                                    />

                                                                    <p className="mb-0">
                                                                        No pending
                                                                        requests
                                                                    </p>

                                                                </div>
                                                            )}

                                                        </div>

                                                    </div>
                                                </div>

                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-12">

                                            <div className="alert alert-info text-center py-5">

                                                <FaChalkboardTeacher
                                                    size={48}
                                                    className="mb-3 text-primary"
                                                />

                                                <h4>
                                                    Start Teaching Today
                                                </h4>

                                                <p className="mb-4">
                                                    Share your knowledge by
                                                    creating your first course!
                                                </p>

                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() =>
                                                        setShowCreateModal(true)
                                                    }
                                                >
                                                    Create Course
                                                </button>

                                            </div>

                                        </div>
                                    )}

                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <CreateCourseModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onCourseCreated={fetchCourses}
            />

            <style jsx>{`
                .dashboard-container {
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    padding-bottom: 3rem;
                }

                .main-content {
                    padding-top: 2rem;
                }

                .search-section {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .course-card {
                    transition: transform 0.2s, box-shadow 0.2s;
                    border: none;
                    overflow: hidden;
                }

                .course-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
                }

                .card-progress-bar {
                    height: 4px;
                    background-color: #28a745;
                    position: absolute;
                    top: 0;
                    left: 0;
                    z-index: 1;
                }

                .section-header {
                    border-bottom: 2px solid #e9ecef;
                    padding-bottom: 1rem;
                }

                .welcome-banner {
                    background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
                    position: relative;
                    overflow: hidden;
                }

                .welcome-content {
                    position: relative;
                    z-index: 2;
                }

                .welcome-shapes .shape {
                    position: absolute;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                }

                .shape-1 {
                    width: 150px;
                    height: 150px;
                    top: -50px;
                    left: -50px;
                    animation: move1 8s linear infinite;
                }

                .shape-2 {
                    width: 100px;
                    height: 100px;
                    bottom: -30px;
                    right: 10%;
                    animation: move2 10s linear infinite;
                }

                .shape-3 {
                    width: 120px;
                    height: 120px;
                    top: 30%;
                    right: -30px;
                    animation: move3 12s linear infinite;
                }

                @keyframes move1 {
                    0% {
                        transform: translate(0, 0) rotate(0deg);
                    }

                    100% {
                        transform: translate(20px, 20px) rotate(360deg);
                    }
                }

                @keyframes move2 {
                    0% {
                        transform: translate(0, 0) rotate(0deg);
                    }

                    100% {
                        transform: translate(-20px, -20px) rotate(-360deg);
                    }
                }

                @keyframes move3 {
                    0% {
                        transform: translate(0, 0) rotate(0deg);
                    }

                    100% {
                        transform: translate(15px, -15px) rotate(360deg);
                    }
                }

                .stats-container {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }

                .stat-item {
                    padding: 0 20px;
                    border-right: 1px solid rgba(255, 255, 255, 0.2);
                }

                .stat-item:last-child {
                    border-right: none;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .stat-label {
                    font-size: 0.9rem;
                    opacity: 0.9;
                }

                .quick-action-card {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    text-align: center;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .quick-action-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
                }

                .quick-action-icon {
                    font-size: 2rem;
                    color: #0d6efd;
                    margin-bottom: 15px;
                }

                .notification-btn {
                    position: relative;
                }

                .notification-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                }

                .notification-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    width: 300px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    margin-top: 10px;
                }

                .notification-item {
                    padding: 15px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: start;
                }

                .notification-item:last-child {
                    border-bottom: none;
                }

                .pulse-button {
                    position: relative;
                }

                .pulse-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #28a745;
                    color: white;
                    border-radius: 50%;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% {
                        transform: scale(1);
                        opacity: 1;
                    }

                    50% {
                        transform: scale(1.2);
                        opacity: 0.8;
                    }

                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }

                .course-tabs {
                    background: white;
                    padding: 15px;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .nav-pills .nav-link {
                    color: #6c757d;
                    padding: 10px 20px;
                    border-radius: 25px;
                    transition: all 0.3s ease;
                }

                .nav-pills .nav-link.active {
                    background: #0d6efd;
                    color: white;
                }

                .nav-pills .nav-link:not(.active):hover {
                    background: #e9ecef;
                }

                .brand-icon {
                    animation: float 3s ease-in-out infinite;
                }

                @keyframes float {
                    0% {
                        transform: translateY(0px);
                    }

                    50% {
                        transform: translateY(-5px);
                    }

                    100% {
                        transform: translateY(0px);
                    }
                }
            `}</style>

        </div>
    );
};

export default Dashboard;