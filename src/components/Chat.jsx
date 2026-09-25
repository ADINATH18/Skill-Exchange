import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button, Form, Modal } from 'react-bootstrap';
import {
    FaArrowLeft,
    FaDownload,
    FaExclamationTriangle,
    FaFile,
    FaImage,
    FaPaperclip,
    FaPaperPlane,
    FaTimes,
    FaVideo,
    FaTrash,
    FaSync
} from 'react-icons/fa';
import VideoCall from './VideoCall';

const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:1337';

const Chat = () => {
    const { courseId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const isInstructorView = location.state?.isInstructor;

    const [chat, setChat] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resourceFile, setResourceFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const getCurrentUserId = () => {
        try {
            if (!token) return localStorage.getItem('userId');
            const payload = JSON.parse(atob(token.split('.')[1]));
            return (payload._id || payload.userId || localStorage.getItem('userId') || '').toString();
        } catch {
            return (localStorage.getItem('userId') || '').toString();
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchChat();

        const interval = setInterval(fetchChat, 5000);

        return () => clearInterval(interval);
    }, [courseId, navigate, token, isInstructorView]);

    const fetchChat = async () => {
        try {
            const studentIdParam = location.state?.studentId ? `?studentId=${location.state.studentId}` : '';
            let response;

            try {
                // If isInstructorView, try direct chat ID endpoint first; otherwise try course endpoint
                const primaryUrl = isInstructorView
                    ? `${API_URL}/api/chats/id/${courseId}`
                    : `${API_URL}/api/chats/${courseId}${studentIdParam}`;

                response = await axios.get(primaryUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            } catch (initialErr) {
                // If 404 or 400 from first attempt, gracefully try alternative endpoint
                if (initialErr.response?.status === 404 || initialErr.response?.status === 400) {
                    const fallbackUrl = isInstructorView
                        ? `${API_URL}/api/chats/${courseId}${studentIdParam}`
                        : `${API_URL}/api/chats/id/${courseId}`;

                    response = await axios.get(fallbackUrl, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                } else {
                    throw initialErr;
                }
            }

            setChat(response.data);
            setError('');
            setLoading(false);

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: 'smooth'
                });
            }, 0);
        } catch (err) {
            console.error('Fetch chat error:', err);
            setError(
                err.response?.data?.message ||
                'Error fetching chat'
            );
            setLoading(false);
        }
    };

    const handleDeleteChat = async () => {
        if (!chat) return;
        if (!window.confirm('Are you sure you want to remove this inactive chat? All messages will be deleted.')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/api/chats/${chat._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/messages');
        } catch (err) {
            console.error('Error deleting chat:', err);
            setErrorMessage(err.response?.data?.message || 'Error removing chat');
            setShowErrorModal(true);
        }
    };

    const handleReactivateChat = async () => {
        if (!chat) return;
        try {
            const res = await axios.put(`${API_URL}/api/chats/${chat._id}/reactivate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChat(res.data.chat);
        } catch (err) {
            console.error('Error reactivating chat:', err);
            setErrorMessage(err.response?.data?.message || 'Error reactivating chat');
            setShowErrorModal(true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            (!message.trim() && !resourceFile) ||
            sending ||
            !chat
        ) {
            return;
        }

        setSending(true);
        setError('');

        try {
            let resourceUrl = '';
            let resourceType = '';

            if (resourceFile) {
                if (resourceFile.size > 500 * 1024 * 1024) {
                    setErrorMessage(
                        'File size exceeds 500MB limit. Please choose a file up to 500MB.'
                    );
                    setShowErrorModal(true);
                    setSending(false);
                    return;
                }

                const formData = new FormData();
                formData.append('file', resourceFile);
                setUploadProgress(0);

                try {
                    const uploadResponse = await axios.post(
                        `${API_URL}/api/upload`,
                        formData,
                        {
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
                        }
                    );

                    resourceUrl = `${API_URL}${uploadResponse.data.url}`;
                    const mimeType = (resourceFile.type || '').toLowerCase();
                    const fileName = (resourceFile.name || '').toLowerCase();

                    if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName)) {
                        resourceType = 'image';
                    } else if (mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)$/i.test(fileName)) {
                        resourceType = 'video';
                    } else if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(fileName)) {
                        resourceType = 'audio';
                    } else {
                        resourceType = 'document';
                    }
                } catch (uploadError) {
                    setErrorMessage(
                        uploadError.response?.data?.message ||
                        'Error uploading file. Please try again.'
                    );

                    setShowErrorModal(true);
                    setSending(false);
                    setUploadProgress(0);
                    return;
                }
            }

            await axios.post(
                `${API_URL}/api/chats/${chat._id}/message`,
                {
                    content:
                        message.trim() || ' ',
                    resourceUrl:
                        resourceUrl || undefined,
                    resourceType:
                        resourceType || undefined
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setMessage('');
            setResourceFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            await fetchChat();
        } catch (err) {
            setErrorMessage(
                err.response?.data?.message ||
                    'Error sending message'
            );

            setShowErrorModal(true);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];

        if (!file) {
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            setErrorMessage(
                'File size exceeds 500MB limit. Please choose a file up to 500MB.'
            );

            setShowErrorModal(true);
            e.target.value = '';

            return;
        }

        setResourceFile(file);
        setError('');
    };

    const removeFile = () => {
        setResourceFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getFileIcon = (type, name = '') => {
        const lowerType = (type || '').toLowerCase();
        const lowerName = (name || '').toLowerCase();

        if (lowerType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
            return <FaImage className="text-info" />;
        }

        if (lowerType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(lowerName)) {
            return <FaVideo className="text-danger" />;
        }

        return <FaFile className="text-secondary" />;
    };

    const getResourceUrl = (url) => {
        if (!url) {
            return '';
        }

        return url.startsWith('http')
            ? url
            : `${API_URL}${url}`;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div
                    className="spinner-border text-primary"
                    role="status"
                >
                    <span className="visually-hidden">
                        Loading...
                    </span>
                </div>
            </div>
        );
    }

    if (error || !chat) {
        return (
            <div className="container py-5 d-flex justify-content-center align-items-center min-vh-100">
                <div className="card shadow-sm border-0 p-4 text-center rounded-4" style={{ maxWidth: '480px', width: '100%' }}>
                    <div className="mb-3 text-warning">
                        <FaExclamationTriangle size={48} />
                    </div>
                    <h4 className="fw-bold mb-2">Unable to Load Chat</h4>
                    <p className="text-muted mb-4">
                        {error || 'The requested chat conversation could not be found or you do not have permission.'}
                    </p>
                    <div className="d-flex flex-column gap-2">
                        <Button
                            variant="primary"
                            className="d-flex align-items-center justify-content-center"
                            onClick={() => {
                                setLoading(true);
                                setError('');
                                fetchChat();
                            }}
                        >
                            <FaSync className="me-2" /> Try Again
                        </Button>
                        <Button
                            variant="outline-primary"
                            className="d-flex align-items-center justify-content-center"
                            onClick={() => navigate('/messages')}
                        >
                            <FaArrowLeft className="me-2" /> Go to Message Center
                        </Button>
                        <Button
                            variant="outline-secondary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentUserId = getCurrentUserId();
    const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
    const isUserInstructor = Boolean(currentUserId && instructorId === currentUserId) || Boolean(isInstructorView);

    return (
        <div className="chat-container vh-100 d-flex flex-column">
            <div className="chat-header bg-white shadow-sm py-3 px-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center">
                        <div className="d-flex align-items-center me-3 gap-2">
                            <button
                                className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/messages')}
                                title="Back to Message Center"
                            >
                                <FaArrowLeft className="me-1" /> Messages
                            </button>
                            <button
                                className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                onClick={() => navigate('/dashboard')}
                                title="Back to Dashboard"
                            >
                                Dashboard
                            </button>
                        </div>

                        <div>
                            <h5 className="mb-0 fw-bold text-dark">
                                {chat.course?.name || 'Skill Exchange Course'}
                            </h5>

                            <small className="text-muted">
                                {isUserInstructor
                                    ? `Student: ${chat.student?.name || 'Student'} (${chat.student?.email || ''})`
                                    : `Instructor: ${chat.instructor?.name || 'Instructor'} (${chat.instructor?.email || ''})`}
                            </small>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-success d-flex align-items-center"
                            onClick={() =>
                                setShowVideoCall(true)
                            }
                            disabled={!chat.isActive}
                        >
                            <FaVideo className="me-2" />
                            Video Call
                        </button>

                        <div className="chat-status">
                            <span
                                className={`badge ${
                                    chat.isActive
                                        ? 'bg-success'
                                        : 'bg-danger'
                                }`}
                            >
                                {chat.isActive
                                    ? 'Active'
                                    : 'Inactive'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {!chat.isActive && (
                <div className="alert alert-warning mb-0 rounded-0 px-4 py-2 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom">
                    <div className="d-flex align-items-center">
                        <FaExclamationTriangle className="me-2 text-warning" />
                        <span>This chat is currently inactive (duration has expired).</span>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm d-flex align-items-center"
                            onClick={handleDeleteChat}
                            title="Remove this inactive chat and its data"
                        >
                            <FaTrash className="me-1" /> Delete Inactive Chat
                        </button>
                        <button
                            type="button"
                            className="btn btn-success btn-sm d-flex align-items-center"
                            onClick={handleReactivateChat}
                            title="Reactivate chat and extend duration"
                        >
                            <FaSync className="me-1" /> Reactivate & Allow Chatting
                        </button>
                    </div>
                </div>
            )}

            <div
                className="chat-messages flex-grow-1 p-4"
                style={{ overflowY: 'auto' }}
            >
                {chat.messages.map((msg, index) => {
                    const instructorId = (chat.instructor?._id || chat.instructor || '').toString();
                    const senderId = (msg.sender?._id || msg.sender || '').toString();
                    const isInstructorMessage = senderId === instructorId;

                    const resourceUrl =
                        getResourceUrl(
                            msg.resourceUrl
                        );

                    return (
                        <div
                            key={index}
                            className={`message-wrapper mb-3 ${
                                isInstructorMessage
                                    ? 'instructor'
                                    : 'student'
                            }`}
                        >
                            <div
                                className={`message ${
                                    isInstructorMessage
                                        ? 'instructor-message'
                                        : 'student-message'
                                }`}
                            >
                                <div className="message-sender mb-1">
                                    {msg.sender?.name || (isInstructorMessage ? 'Instructor' : 'Student')}
                                </div>

                                {msg.content?.trim() && (
                                    <div className="message-content mb-2">
                                        {msg.content}
                                    </div>
                                )}

                                {msg.resourceUrl && (() => {
                                    const isVideo = msg.resourceType === 'video' || /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)(\?.*)?$/i.test(resourceUrl);
                                    const isAudio = msg.resourceType === 'audio' || /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i.test(resourceUrl);
                                    const isImage = msg.resourceType === 'image' || /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(resourceUrl);

                                    return (
                                        <div className="message-resource my-2">
                                            {isImage ? (
                                                <div className="image-preview">
                                                    <img
                                                        src={resourceUrl}
                                                        alt="Shared image"
                                                        className="img-fluid rounded"
                                                        style={{ maxHeight: '350px' }}
                                                    />
                                                    <div className="mt-1">
                                                        <a
                                                            href={resourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download
                                                            className="file-download btn btn-sm btn-light border py-1 px-2"
                                                        >
                                                            <FaDownload className="me-1" /> Download Image
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : isVideo ? (
                                                <div className="video-preview" style={{ maxWidth: '400px' }}>
                                                    <video
                                                        src={resourceUrl}
                                                        controls
                                                        preload="metadata"
                                                        className="rounded w-100 shadow-sm"
                                                        style={{ maxHeight: '360px', backgroundColor: '#000' }}
                                                    />
                                                    <div className="mt-1">
                                                        <a
                                                            href={resourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download
                                                            className="file-download btn btn-sm btn-light border py-1 px-2"
                                                        >
                                                            <FaDownload className="me-1" /> Download Video
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : isAudio ? (
                                                <div className="audio-preview" style={{ maxWidth: '350px' }}>
                                                    <audio src={resourceUrl} controls className="w-100" />
                                                    <div className="mt-1">
                                                        <a
                                                            href={resourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download
                                                            className="file-download btn btn-sm btn-light border py-1 px-2"
                                                        >
                                                            <FaDownload className="me-1" /> Download Audio
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="file-preview">
                                                    <a
                                                        href={resourceUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        className="file-download btn btn-light border d-inline-flex align-items-center py-2 px-3 rounded-3"
                                                    >
                                                        <FaFile className="me-2 text-primary" size={22} />
                                                        <div className="text-start">
                                                            <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '220px' }}>
                                                                {resourceUrl.split('/').pop()}
                                                            </div>
                                                            <small className="text-muted">
                                                                <FaDownload className="me-1" /> Download File
                                                            </small>
                                                        </div>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="message-time">
                                    {new Date(
                                        msg.timestamp
                                    ).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>

            {!chat.isActive ? (
                <div className="chat-expired bg-light p-3 text-center">
                    <div className="alert alert-warning mb-0">
                        Chat duration has expired. You can no longer send messages.
                    </div>
                </div>
            ) : (
                <div className="chat-input bg-white border-top p-3">
                    <Form onSubmit={handleSubmit}>
                        <div className="input-group mb-3">
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={message}
                                onChange={(e) =>
                                    setMessage(
                                        e.target.value
                                    )
                                }
                                placeholder="Type your message..."
                                className="border-0 shadow-none"
                                style={{
                                    resize: 'none'
                                }}
                            />
                        </div>

                        {resourceFile && (
                            <div className="selected-file mb-3 p-2 bg-light rounded border d-flex align-items-center">
                                {getFileIcon(
                                    resourceFile.type,
                                    resourceFile.name
                                )}

                                <span className="ms-2 fw-semibold text-truncate" style={{ maxWidth: '280px' }}>
                                    {resourceFile.name}
                                </span>

                                <small className="text-muted ms-2">
                                    ({(resourceFile.size / (1024 * 1024)).toFixed(2)} MB)
                                </small>

                                <button
                                    type="button"
                                    className="btn btn-link text-danger ms-auto p-0"
                                    onClick={removeFile}
                                    title="Remove file"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}

                        {sending && uploadProgress > 0 && (
                            <div className="mb-3">
                                <div className="d-flex justify-content-between small text-muted mb-1">
                                    <span>Uploading file / video...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated bg-success"
                                        role="progressbar"
                                        style={{ width: `${uploadProgress}%` }}
                                        aria-valuenow={uploadProgress}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <div className="d-flex align-items-center gap-2">
                                {/* General file input (all types supported: zip, pdf, docs, code, audio, etc.) */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="*"
                                    className="d-none"
                                    id="file-input"
                                />

                                {/* Dedicated video file input */}
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="video/*"
                                    className="d-none"
                                    id="video-input"
                                />

                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm d-flex align-items-center"
                                    onClick={() => videoInputRef.current?.click()}
                                    title="Upload and send video (MP4, WebM, MOV, etc.)"
                                >
                                    <FaVideo className="me-1" /> Video
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload any file (PDF, ZIP, DOC, code, audio, etc.)"
                                >
                                    <FaPaperclip className="me-1" /> Any File
                                </button>

                                <small className="text-muted d-none d-sm-inline">
                                    Max: 500MB (all types supported)
                                </small>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={
                                    (!message.trim() &&
                                        !resourceFile) ||
                                    sending
                                }
                                className="px-4"
                            >
                                {sending ? (
                                    <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                ) : (
                                    <>
                                        <FaPaperPlane className="me-2" />
                                        Send
                                    </>
                                )}
                            </Button>
                        </div>
                    </Form>
                </div>
            )}

            {showVideoCall && (
                <VideoCall
                    roomId={chat._id}
                    onClose={() =>
                        setShowVideoCall(false)
                    }
                />
            )}

            <Modal
                show={showErrorModal}
                onHide={() =>
                    setShowErrorModal(false)
                }
                centered
            >
                <Modal.Header
                    closeButton
                    className="bg-danger text-white"
                >
                    <Modal.Title>
                        <FaExclamationTriangle className="me-2" />
                        Error
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <div className="d-flex align-items-center">
                        <FaExclamationTriangle
                            className="text-danger me-3"
                            size={24}
                        />

                        <p className="mb-0">
                            {errorMessage}
                        </p>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() =>
                            setShowErrorModal(false)
                        }
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <style jsx>{`
                .chat-container {
                    background-color: #f8f9fa;
                }

                .chat-header {
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }

                .message-wrapper {
                    display: flex;
                    margin-bottom: 1rem;
                }

                .message-wrapper.instructor {
                    justify-content: flex-end;
                }

                .message {
                    max-width: 70%;
                    padding: 1rem;
                    border-radius: 1rem;
                    position: relative;
                }

                .instructor-message {
                    background-color: #0d6efd;
                    color: white;
                    border-top-right-radius: 0.25rem;
                }

                .student-message {
                    background-color: white;
                    color: #212529;
                    border-top-left-radius: 0.25rem;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }

                .message-sender {
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .message-time {
                    font-size: 0.75rem;
                    opacity: 0.8;
                    margin-top: 0.5rem;
                }

                .image-preview {
                    max-width: 300px;
                    margin-top: 0.5rem;
                }

                .image-preview img {
                    width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                }

                .video-preview {
                    max-width: 300px;
                    margin-top: 0.5rem;
                }

                .video-preview video {
                    width: 100%;
                    border-radius: 0.5rem;
                }

                .file-download {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.5rem 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 0.5rem;
                    color: inherit;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .file-download:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .selected-file {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 0.5rem;
                }

                .chat-input {
                    position: sticky;
                    bottom: 0;
                    background: white;
                    z-index: 1000;
                }

                .chat-input textarea {
                    background: #f8f9fa;
                    border-radius: 1rem;
                    padding: 0.75rem 1rem;
                }

                .chat-input textarea:focus {
                    background: white;
                    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
                }

                .chat-status .badge {
                    padding: 0.5em 1em;
                    font-weight: normal;
                }

                @media (max-width: 768px) {
                    .message {
                        max-width: 85%;
                    }
                }

                .modal-content {
                    border: none;
                    border-radius: 15px;
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                }

                .modal-header {
                    border-top-left-radius: 15px;
                    border-top-right-radius: 15px;
                }

                .modal-footer {
                    border-bottom-left-radius: 15px;
                    border-bottom-right-radius: 15px;
                }

                .btn-secondary {
                    background-color: #6c757d;
                    border: none;
                    padding: 0.5rem 1.5rem;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .btn-secondary:hover {
                    background-color: #5a6268;
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

export default Chat;