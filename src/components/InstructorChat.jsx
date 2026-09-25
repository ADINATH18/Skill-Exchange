import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, ListGroup, Badge, Accordion, Button, Nav, Alert } from 'react-bootstrap';
import {
    FaArrowLeft,
    FaComments,
    FaGraduationCap,
    FaChalkboardTeacher,
    FaRegCommentDots,
    FaTrash,
    FaSync,
    FaUserPlus
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';

const InstructorChat = () => {
    const navigate = useNavigate();
    const [allChats, setAllChats] = useState([]);
    const [instructorGroupedChats, setInstructorGroupedChats] = useState({});
    const [viewMode, setViewMode] = useState('all'); // 'all', 'student', 'instructor'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const token = localStorage.getItem('token');

    const getCurrentUserId = () => {
        try {
            if (!token) return localStorage.getItem('userId');
            const payload = JSON.parse(atob(token.split('.')[1]));
            return (payload._id || payload.userId || localStorage.getItem('userId') || '').toString();
        } catch {
            return (localStorage.getItem('userId') || '').toString();
        }
    };

    const currentUserId = getCurrentUserId();

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchChats();
        const interval = setInterval(fetchChats, 15000);
        return () => clearInterval(interval);
    }, [navigate, token]);

    const fetchChats = async () => {
        try {
            const [userChatsRes, instructorChatsRes] = await Promise.all([
                axios.get(`${API_URL}/api/chats`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: [] })),
                axios.get(`${API_URL}/api/chats/instructor/all`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: {} }))
            ]);

            setAllChats(userChatsRes.data || []);
            setInstructorGroupedChats(instructorChatsRes.data || {});
            setLoading(false);
        } catch (err) {
            console.error('Error fetching chats:', err);
            setError(err.response?.data?.message || 'Error fetching chats');
            setLoading(false);
        }
    };

    const handleDeleteChat = async (chatId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Are you sure you want to remove this inactive chat?')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/api/chats/${chatId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMsg('Chat removed successfully');
            setTimeout(() => setSuccessMsg(''), 4000);
            fetchChats();
        } catch (err) {
            console.error('Error deleting chat:', err);
            setError(err.response?.data?.message || 'Error removing chat');
        }
    };

    const handleClearInactiveChats = async () => {
        if (!window.confirm('Are you sure you want to remove all inactive chats data? This cannot be undone.')) {
            return;
        }

        try {
            const res = await axios.delete(`${API_URL}/api/chats/inactive/cleanup`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccessMsg(res.data.message || 'Inactive chats removed successfully');
            setTimeout(() => setSuccessMsg(''), 4000);
            fetchChats();
        } catch (err) {
            console.error('Error cleaning up inactive chats:', err);
            setError(err.response?.data?.message || 'Error removing inactive chats');
        }
    };

    const handleStartChatWithStudent = async (courseId, studentId, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await axios.post(
                `${API_URL}/api/chats/start`,
                { courseId, studentId },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            navigate(`/chat/${res.data._id}`, {
                state: { isInstructor: true }
            });
        } catch (err) {
            console.error('Error starting chat with student:', err);
            setError(err.response?.data?.message || 'Error starting chat with student');
        }
    };

    const handleReactivateChat = async (chatId, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await axios.put(
                `${API_URL}/api/chats/${chatId}/reactivate`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            navigate(`/chat/${chatId}`, {
                state: { isInstructor: true }
            });
        } catch (err) {
            console.error('Error reactivating chat:', err);
            setError(err.response?.data?.message || 'Error reactivating chat');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'No messages yet';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Filter student chats: where current user is student
    const studentChats = allChats.filter((chat) => {
        const studentId = (chat.student?._id || chat.student || '').toString();
        return studentId === currentUserId;
    });

    // Filter instructor chats: where current user is instructor
    const instructorChats = allChats.filter((chat) => {
        const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
        return instructorId === currentUserId;
    });

    // Count inactive chats
    const inactiveUserChatsCount = allChats.filter((c) => !c.isActive).length;
    const inactiveInstructorChatsCount = Object.values(instructorGroupedChats).reduce(
        (acc, list) => acc + list.filter((c) => !c.isActive && !c.isNewStudent).length,
        0
    );
    const totalInactiveCount = Math.max(inactiveUserChatsCount, inactiveInstructorChatsCount);

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-muted">Loading your conversations...</h5>
            </div>
        );
    }

    const hasStudentChats = studentChats.length > 0;
    const hasInstructorChats = Object.keys(instructorGroupedChats).length > 0 || instructorChats.length > 0;
    const totalChatsCount = studentChats.length + instructorChats.length;

    return (
        <div className="container mt-4 mb-5">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2 className="fw-bold mb-1 d-flex align-items-center">
                        <FaComments className="me-2 text-primary" /> Messages & Chat Center
                    </h2>
                    <p className="text-muted mb-0 small">
                        Real-time communication with your instructors and students
                    </p>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {totalInactiveCount > 0 && (
                        <Button
                            variant="outline-danger"
                            size="sm"
                            className="d-flex align-items-center shadow-xs"
                            onClick={handleClearInactiveChats}
                            title="Delete all inactive/expired chats data from database"
                        >
                            <FaTrash className="me-1" /> Remove Inactive Chats ({totalInactiveCount})
                        </Button>
                    )}

                    <Button
                        variant="outline-secondary"
                        className="d-flex align-items-center"
                        onClick={() => navigate('/dashboard')}
                    >
                        <FaArrowLeft className="me-2" /> Back to Dashboard
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')} className="shadow-sm mb-4">
                    {error}
                </Alert>
            )}

            {successMsg && (
                <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="shadow-sm mb-4">
                    {successMsg}
                </Alert>
            )}

            {/* Filter Tabs */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-2">
                    <Nav variant="pills" className="nav-fill" activeKey={viewMode} onSelect={(k) => setViewMode(k)}>
                        <Nav.Item>
                            <Nav.Link eventKey="all" className="d-flex align-items-center justify-content-center">
                                <FaComments className="me-2" /> All Chats ({totalChatsCount})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="student" className="d-flex align-items-center justify-content-center">
                                <FaGraduationCap className="me-2" /> Student Chats ({studentChats.length})
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="instructor" className="d-flex align-items-center justify-content-center">
                                <FaChalkboardTeacher className="me-2" /> Instructor Chats ({instructorChats.length})
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </div>
            </div>

            {/* STUDENT CHATS SECTION */}
            {(viewMode === 'all' || viewMode === 'student') && (
                <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="fw-bold mb-0 text-dark d-flex align-items-center">
                            <FaGraduationCap className="me-2 text-primary" /> My Learning Chats (with Instructors)
                        </h4>
                        <Badge bg="primary" pill>
                            {studentChats.length} total
                        </Badge>
                    </div>

                    {studentChats.length > 0 ? (
                        <div className="row g-3">
                            {studentChats.map((chat) => {
                                const lastMsg = chat.messages?.[chat.messages.length - 1];
                                const courseId = chat.course?._id || chat.course;
                                const courseName = chat.course?.name || 'Enrolled Course';
                                const instructorName = chat.instructor?.name || 'Course Instructor';

                                return (
                                    <div key={chat._id} className="col-md-6">
                                        <div
                                            className="card shadow-sm border h-100 p-3"
                                            style={{
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s',
                                                borderLeft: `4px solid ${chat.isActive ? '#0d6efd' : '#6c757d'}`
                                            }}
                                            onClick={() => navigate(`/chat/${courseId}`)}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div>
                                                    <h5 className="fw-bold text-primary mb-1">
                                                        {courseName}
                                                    </h5>
                                                    <div className="text-muted small">
                                                        Instructor: <strong>{instructorName}</strong>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-1">
                                                    <Badge bg={chat.isActive ? 'success' : 'secondary'}>
                                                        {chat.isActive ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {!chat.isActive && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="p-1 line-height-1"
                                                            title="Delete inactive chat"
                                                            onClick={(e) => handleDeleteChat(chat._id, e)}
                                                        >
                                                            <FaTrash size={12} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-secondary small mb-3 text-truncate">
                                                {lastMsg?.content || 'No messages sent yet. Click to start discussion!'}
                                            </p>

                                            <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                                                <small className="text-muted">
                                                    {formatTime(lastMsg?.timestamp || chat.updatedAt)}
                                                </small>
                                                <div className="d-flex gap-2">
                                                    {!chat.isActive && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-success"
                                                            onClick={(e) => handleReactivateChat(chat._id, e)}
                                                        >
                                                            <FaSync className="me-1" /> Reactivate
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant={chat.isActive ? 'primary' : 'outline-secondary'}
                                                        className="d-flex align-items-center"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/chat/${courseId}`);
                                                        }}
                                                    >
                                                        <FaComments className="me-1" /> Open Chat
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        viewMode === 'student' && (
                            <Card className="text-center p-4 border-0 shadow-sm">
                                <Card.Body>
                                    <FaRegCommentDots size={40} className="text-muted mb-3" />
                                    <h5>No Student Chats Yet</h5>
                                    <p className="text-muted mb-3">
                                        Once your enrollment in a course is approved, your chat with the instructor will appear here.
                                    </p>
                                    <Button variant="primary" onClick={() => navigate('/dashboard')}>
                                        Browse Courses
                                    </Button>
                                </Card.Body>
                            </Card>
                        )
                    )}
                </div>
            )}

            {/* INSTRUCTOR CHATS SECTION */}
            {(viewMode === 'all' || viewMode === 'instructor') && (
                <div className="mb-4">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h4 className="fw-bold mb-0 text-dark d-flex align-items-center">
                            <FaChalkboardTeacher className="me-2 text-success" /> My Teaching Chats (with Students)
                        </h4>
                        <div className="d-flex gap-2">
                            <Badge bg="success" pill>
                                {Object.values(instructorGroupedChats).reduce((acc, c) => acc + c.length, 0)} student contacts
                            </Badge>
                        </div>
                    </div>

                    {Object.keys(instructorGroupedChats).length > 0 ? (
                        <Accordion defaultActiveKey="0">
                            {Object.entries(instructorGroupedChats).map(([courseName, courseChats], index) => (
                                <Accordion.Item key={index} eventKey={index.toString()} className="mb-2 shadow-sm border rounded">
                                    <Accordion.Header>
                                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                            <span className="fw-semibold">{courseName}</span>
                                            <Badge bg="success" pill>
                                                {courseChats.length} student{courseChats.length > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </Accordion.Header>
                                    <Accordion.Body className="p-0">
                                        <ListGroup variant="flush">
                                            {courseChats.map((chat, cIdx) => (
                                                <ListGroup.Item
                                                    key={chat.chatId || `new-student-${cIdx}`}
                                                    className="d-flex justify-content-between align-items-center p-3"
                                                    action={!chat.isNewStudent}
                                                    onClick={() => {
                                                        if (chat.chatId) {
                                                            navigate(`/chat/${chat.chatId}`, {
                                                                state: { isInstructor: true }
                                                            });
                                                        } else if (chat.isNewStudent) {
                                                            handleStartChatWithStudent(chat.courseId, chat.studentId);
                                                        }
                                                    }}
                                                >
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <h6 className="mb-1 fw-bold text-dark">
                                                                Student: {chat.student}
                                                            </h6>
                                                            {chat.isNewStudent && (
                                                                <Badge bg="primary" pill>
                                                                    <FaUserPlus className="me-1" /> New Student
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="mb-1 text-muted small text-truncate" style={{ maxWidth: '400px' }}>
                                                            {chat.lastMessage}
                                                        </p>
                                                        <small className="text-muted">
                                                            {formatTime(chat.lastMessageTime)}
                                                        </small>
                                                    </div>

                                                    <div className="text-end d-flex align-items-center gap-2">
                                                        {chat.isNewStudent ? (
                                                            <Button
                                                                size="sm"
                                                                variant="success"
                                                                onClick={(e) => handleStartChatWithStudent(chat.courseId, chat.studentId, e)}
                                                            >
                                                                <FaComments className="me-1" /> Start Chat
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Badge bg={chat.isActive ? 'success' : 'secondary'}>
                                                                    {chat.isActive ? 'Active' : 'Inactive'}
                                                                </Badge>

                                                                {!chat.isActive && (
                                                                    <>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-success"
                                                                            title="Reactivate chat and extend duration"
                                                                            onClick={(e) => handleReactivateChat(chat.chatId, e)}
                                                                        >
                                                                            <FaSync className="me-1" /> Reactivate
                                                                        </Button>

                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-danger"
                                                                            title="Delete inactive chat data"
                                                                            onClick={(e) => handleDeleteChat(chat.chatId, e)}
                                                                        >
                                                                            <FaTrash />
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {chat.isActive && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline-success"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/chat/${chat.chatId}`, {
                                                                                state: { isInstructor: true }
                                                                            });
                                                                        }}
                                                                    >
                                                                        Chat
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </Accordion.Body>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    ) : (
                        viewMode === 'instructor' && (
                            <Card className="text-center p-4 border-0 shadow-sm">
                                <Card.Body>
                                    <FaRegCommentDots size={40} className="text-muted mb-3" />
                                    <h5>No Instructor Chats Available</h5>
                                    <p className="text-muted mb-3">
                                        You don't have active chats with students yet. Create a course and approve enrollments to chat!
                                    </p>
                                    <Button variant="success" onClick={() => navigate('/dashboard')}>
                                        Go to Dashboard
                                    </Button>
                                </Card.Body>
                            </Card>
                        )
                    )}
                </div>
            )}

            {/* EMPTY STATE ACROSS ALL MODES */}
            {viewMode === 'all' && !hasStudentChats && !hasInstructorChats && (
                <Card className="text-center p-5 shadow-sm border-0 rounded-4">
                    <Card.Body>
                        <FaComments size={48} className="text-primary mb-3" />
                        <h4 className="fw-bold">No Conversations Yet</h4>
                        <p className="text-muted mb-4">
                            You don't have any active chats yet. Enroll in courses to connect with instructors or teach skills to connect with students!
                        </p>
                        <Button variant="primary" onClick={() => navigate('/dashboard')}>
                            Explore Courses on Dashboard
                        </Button>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default InstructorChat;