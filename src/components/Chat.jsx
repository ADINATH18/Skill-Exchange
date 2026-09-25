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
    FaSync,
    FaEye,
    FaFileAlt,
    FaFilePdf,
    FaFileCode,
    FaFileArchive,
    FaExternalLinkAlt,
    FaCopy,
    FaCheck,
    FaChalkboardTeacher,
    FaBookOpen
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

    // Download & File Reader state
    const [downloadingUrl, setDownloadingUrl] = useState(null);
    const [readerModalOpen, setReaderModalOpen] = useState(false);
    const [activeReader, setActiveReader] = useState({
        url: '',
        name: '',
        type: '',
        isFromInstructor: false,
        size: 0,
        isText: false,
        textContent: '',
        loading: false,
        error: ''
    });
    const [copiedText, setCopiedText] = useState(false);

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
                    const rawFileName = (resourceFile.name || '').toLowerCase();
                    var uploadedOriginalName = uploadResponse.data.originalName || resourceFile.name || '';
                    var uploadedFileSize = uploadResponse.data.size || resourceFile.size || 0;

                    if (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(rawFileName)) {
                        resourceType = 'image';
                    } else if (mimeType.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)$/i.test(rawFileName)) {
                        resourceType = 'video';
                    } else if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(rawFileName)) {
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
                        resourceType || undefined,
                    fileName:
                        uploadedOriginalName || undefined,
                    fileSize:
                        uploadedFileSize || undefined
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

    const getDocumentIcon = (fileName = '', type = '') => {
        const ext = '.' + (fileName.split('.').pop() || '').toLowerCase();
        if (ext === '.pdf' || type === 'pdf') {
            return <FaFilePdf className="text-danger" size={26} />;
        }
        if (['.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css', '.json', '.xml', '.sql', '.cpp', '.c', '.java'].includes(ext)) {
            return <FaFileCode className="text-info" size={26} />;
        }
        if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
            return <FaFileArchive className="text-warning" size={26} />;
        }
        if (['.txt', '.md', '.markdown', '.doc', '.docx', '.rtf', '.csv'].includes(ext)) {
            return <FaFileAlt className="text-primary" size={26} />;
        }
        return <FaFile className="text-secondary" size={26} />;
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes <= 0) return '';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`;
    };

    const handleDownloadFile = async (resourceUrl, targetFileName) => {
        try {
            setDownloadingUrl(resourceUrl);
            const rawFilename = resourceUrl.split('/').pop().split('?')[0];
            const cleanName = targetFileName || rawFilename || 'downloaded-file';
            const downloadApiUrl = `${API_URL}/api/upload/download/${rawFilename}?name=${encodeURIComponent(cleanName)}`;

            // 1. Try fetching as Blob for guaranteed local disk save
            try {
                const response = await fetch(downloadApiUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const tempLink = document.createElement('a');
                    tempLink.href = blobUrl;
                    tempLink.setAttribute('download', cleanName);
                    document.body.appendChild(tempLink);
                    tempLink.click();
                    document.body.removeChild(tempLink);
                    window.URL.revokeObjectURL(blobUrl);
                    return;
                }
            } catch (blobErr) {
                console.warn('Blob download fetch error, trying direct anchor:', blobErr);
            }

            // 2. Direct anchor download fallback
            const tempLink = document.createElement('a');
            tempLink.href = downloadApiUrl;
            tempLink.setAttribute('download', cleanName);
            tempLink.target = '_blank';
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
        } catch (err) {
            console.error('Download error:', err);
            window.open(resourceUrl, '_blank');
        } finally {
            setDownloadingUrl(null);
        }
    };

    const handleReadFile = async (resourceUrl, fileName, resourceType, isFromInstructor, fileSize = 0) => {
        const rawFilename = resourceUrl.split('/').pop().split('?')[0];
        const cleanName = fileName || rawFilename || 'Document';
        const ext = '.' + (cleanName.split('.').pop() || '').toLowerCase();
        const isPdf = ext === '.pdf' || resourceType === 'pdf';
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(cleanName) || resourceType === 'image';
        const isVideo = /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)$/i.test(cleanName) || resourceType === 'video';
        const isAudio = /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(cleanName) || resourceType === 'audio';
        const textExtensions = [
            '.txt', '.md', '.markdown', '.json', '.csv', '.tsv', 
            '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', 
            '.cpp', '.cs', '.html', '.css', '.scss', '.xml', 
            '.yaml', '.yml', '.sql', '.log', '.sh', '.bat', '.env'
        ];
        const isText = textExtensions.includes(ext);

        setActiveReader({
            url: resourceUrl,
            name: cleanName,
            type: isPdf ? 'pdf' : isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : isText ? 'text' : 'binary',
            isFromInstructor,
            size: fileSize,
            isText,
            textContent: '',
            loading: isText,
            error: ''
        });
        setReaderModalOpen(true);
        setCopiedText(false);

        if (isText) {
            try {
                const res = await axios.get(`${API_URL}/api/upload/read/${rawFilename}`);
                if (res.data && res.data.content !== undefined) {
                    setActiveReader(prev => ({
                        ...prev,
                        textContent: res.data.content,
                        loading: false
                    }));
                } else {
                    const textRes = await fetch(resourceUrl);
                    const text = await textRes.text();
                    setActiveReader(prev => ({
                        ...prev,
                        textContent: text,
                        loading: false
                    }));
                }
            } catch (err) {
                console.error('Error reading text file content:', err);
                try {
                    const fallbackRes = await fetch(resourceUrl);
                    const text = await fallbackRes.text();
                    setActiveReader(prev => ({
                        ...prev,
                        textContent: text,
                        loading: false
                    }));
                } catch (fallbackErr) {
                    setActiveReader(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Could not render file directly in the browser reader. Please use the Download button below to open and read it.'
                    }));
                }
            }
        }
    };

    const handleCopyContent = () => {
        if (activeReader.textContent) {
            navigator.clipboard.writeText(activeReader.textContent);
            setCopiedText(true);
            setTimeout(() => setCopiedText(false), 2500);
        }
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
                                    const displayName = msg.fileName || resourceUrl.split('/').pop().split('?')[0] || 'Attachment';
                                    const isDownloading = downloadingUrl === resourceUrl;

                                    return (
                                        <div className="message-resource my-2">
                                            {/* Prominent badge when file is sent by instructor */}
                                            {isInstructorMessage && (
                                                <div className="instructor-file-badge mb-2 d-inline-flex align-items-center px-2 py-1 bg-white text-primary border border-primary rounded-pill small shadow-xs">
                                                    <FaChalkboardTeacher className="me-1" />
                                                    <strong>Instructor Learning Material</strong>
                                                </div>
                                            )}

                                            {isImage ? (
                                                <div className="image-attachment-card p-2 bg-white rounded-3 border text-dark shadow-xs" style={{ maxWidth: '380px' }}>
                                                    <img
                                                        src={resourceUrl}
                                                        alt={displayName}
                                                        className="img-fluid rounded mb-2 w-100"
                                                        style={{ maxHeight: '280px', objectFit: 'cover', cursor: 'pointer' }}
                                                        onClick={() => handleReadFile(resourceUrl, displayName, 'image', isInstructorMessage, msg.fileSize)}
                                                        title="Click to view full size"
                                                    />
                                                    <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                                                        <small className="text-truncate text-muted me-2" style={{ maxWidth: '160px' }} title={displayName}>
                                                            {displayName}
                                                        </small>
                                                        <div className="d-flex gap-1">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary py-0 px-2 d-flex align-items-center"
                                                                onClick={() => handleReadFile(resourceUrl, displayName, 'image', isInstructorMessage, msg.fileSize)}
                                                            >
                                                                <FaEye className="me-1" /> View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary py-0 px-2 d-flex align-items-center"
                                                                onClick={() => handleDownloadFile(resourceUrl, displayName)}
                                                                disabled={isDownloading}
                                                            >
                                                                <FaDownload className="me-1" /> {isDownloading ? 'Saving...' : 'Download'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : isVideo ? (
                                                <div className="video-attachment-card p-2 bg-white rounded-3 border text-dark shadow-xs" style={{ maxWidth: '420px' }}>
                                                    <video
                                                        src={resourceUrl}
                                                        controls
                                                        preload="metadata"
                                                        className="rounded w-100 shadow-xs mb-2"
                                                        style={{ maxHeight: '300px', backgroundColor: '#000' }}
                                                    />
                                                    <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                                                        <small className="text-truncate text-muted me-2" style={{ maxWidth: '200px' }} title={displayName}>
                                                            {displayName} {msg.fileSize ? `(${formatFileSize(msg.fileSize)})` : ''}
                                                        </small>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary py-1 px-3 d-flex align-items-center"
                                                            onClick={() => handleDownloadFile(resourceUrl, displayName)}
                                                            disabled={isDownloading}
                                                        >
                                                            <FaDownload className="me-1" /> {isDownloading ? 'Saving...' : 'Download Video'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : isAudio ? (
                                                <div className="audio-attachment-card p-2 bg-white rounded-3 border text-dark shadow-xs" style={{ maxWidth: '360px' }}>
                                                    <audio src={resourceUrl} controls className="w-100 mb-2" />
                                                    <div className="d-flex justify-content-between align-items-center pt-1 border-top">
                                                        <small className="text-truncate text-muted me-2" style={{ maxWidth: '180px' }} title={displayName}>
                                                            {displayName}
                                                        </small>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary py-0 px-2 d-flex align-items-center"
                                                            onClick={() => handleDownloadFile(resourceUrl, displayName)}
                                                            disabled={isDownloading}
                                                        >
                                                            <FaDownload className="me-1" /> Download
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Documents & All file types (PDF, Code, Text, Archives, etc.) */
                                                <div className="file-attachment-card bg-white text-dark rounded-3 p-3 border shadow-sm" style={{ maxWidth: '380px' }}>
                                                    <div className="d-flex align-items-start mb-2">
                                                        <div className="me-3 mt-1 p-2 bg-light rounded-3 border">
                                                            {getDocumentIcon(displayName, msg.resourceType)}
                                                        </div>
                                                        <div className="flex-grow-1 overflow-hidden">
                                                            <h6 className="fw-bold mb-0 text-truncate text-dark" title={displayName}>
                                                                {displayName}
                                                            </h6>
                                                            <div className="d-flex align-items-center gap-2 mt-1">
                                                                {msg.fileSize ? (
                                                                    <span className="badge bg-light text-muted border">
                                                                        {formatFileSize(msg.fileSize)}
                                                                    </span>
                                                                ) : null}
                                                                <span className="badge bg-primary-subtle text-primary border">
                                                                    {(displayName.split('.').pop() || 'FILE').toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex gap-2 mt-2 pt-2 border-top">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center fw-semibold shadow-xs"
                                                            onClick={() => handleReadFile(resourceUrl, displayName, msg.resourceType, isInstructorMessage, msg.fileSize)}
                                                            title="Read or preview this document inside the browser"
                                                        >
                                                            <FaEye className="me-1" /> Read / View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-success btn-sm flex-grow-1 d-flex align-items-center justify-content-center fw-semibold shadow-xs"
                                                            onClick={() => handleDownloadFile(resourceUrl, displayName)}
                                                            disabled={isDownloading}
                                                            title="Download file to your computer"
                                                        >
                                                            <FaDownload className="me-1" /> {isDownloading ? 'Saving...' : 'Download'}
                                                        </button>
                                                        <a
                                                            href={resourceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-secondary btn-sm px-2 d-flex align-items-center"
                                                            title="Open in new window"
                                                        >
                                                            <FaExternalLinkAlt />
                                                        </a>
                                                    </div>
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

            {/* In-Browser Document & File Reader Modal */}
            <Modal
                show={readerModalOpen}
                onHide={() => setReaderModalOpen(false)}
                size="xl"
                centered
                dialogClassName="file-reader-modal"
            >
                <Modal.Header closeButton className="bg-light border-bottom">
                    <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden me-3">
                        <div className="p-2 bg-white rounded border">
                            {getDocumentIcon(activeReader.name, activeReader.type)}
                        </div>
                        <div className="overflow-hidden">
                            <Modal.Title className="fs-5 text-truncate mb-0" title={activeReader.name}>
                                {activeReader.name}
                            </Modal.Title>
                            <div className="d-flex align-items-center gap-2 small text-muted">
                                {activeReader.isFromInstructor && (
                                    <span className="badge bg-primary text-white">
                                        <FaChalkboardTeacher className="me-1" /> Shared by Instructor
                                    </span>
                                )}
                                {activeReader.size ? (
                                    <span>Size: {formatFileSize(activeReader.size)}</span>
                                ) : null}
                                <span className="text-uppercase">({activeReader.type})</span>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 me-2">
                        {activeReader.isText && activeReader.textContent && (
                            <Button
                                variant={copiedText ? "success" : "outline-secondary"}
                                size="sm"
                                onClick={handleCopyContent}
                                className="d-flex align-items-center"
                            >
                                {copiedText ? <><FaCheck className="me-1" /> Copied!</> : <><FaCopy className="me-1" /> Copy Text</>}
                            </Button>
                        )}
                        <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleDownloadFile(activeReader.url, activeReader.name)}
                            className="d-flex align-items-center"
                        >
                            <FaDownload className="me-1" /> Download
                        </Button>
                    </div>
                </Modal.Header>

                <Modal.Body className="p-3" style={{ minHeight: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                    {activeReader.type === 'pdf' ? (
                        <div className="pdf-viewer-container w-100 rounded overflow-hidden shadow-sm" style={{ height: '70vh' }}>
                            <iframe
                                src={activeReader.url}
                                title={activeReader.name}
                                width="100%"
                                height="100%"
                                className="border-0 w-100 h-100"
                                style={{ minHeight: '550px' }}
                            />
                        </div>
                    ) : activeReader.isText ? (
                        activeReader.loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary mb-3" role="status" />
                                <h5>Loading document text...</h5>
                            </div>
                        ) : activeReader.error ? (
                            <div className="alert alert-warning p-4 text-center">
                                <FaExclamationTriangle size={36} className="text-warning mb-2" />
                                <h5>Unable to preview file directly</h5>
                                <p className="mb-3">{activeReader.error}</p>
                                <Button
                                    variant="primary"
                                    onClick={() => handleDownloadFile(activeReader.url, activeReader.name)}
                                >
                                    <FaDownload className="me-2" /> Download File to Read
                                </Button>
                            </div>
                        ) : (
                            <div className="text-reader-container">
                                <div className="d-flex justify-content-between align-items-center mb-2 px-1 text-muted small">
                                    <span>
                                        {activeReader.textContent.split('\n').length} lines | {activeReader.textContent.length} characters
                                    </span>
                                    <span>Document Reader</span>
                                </div>
                                <pre
                                    className="bg-light p-3 rounded-3 border text-dark font-monospace"
                                    style={{
                                        maxHeight: '65vh',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontSize: '0.92rem',
                                        lineHeight: '1.5'
                                    }}
                                >
                                    {activeReader.textContent}
                                </pre>
                            </div>
                        )
                    ) : activeReader.type === 'image' ? (
                        <div className="text-center py-2">
                            <img
                                src={activeReader.url}
                                alt={activeReader.name}
                                className="img-fluid rounded shadow-sm"
                                style={{ maxHeight: '72vh', objectFit: 'contain' }}
                            />
                        </div>
                    ) : activeReader.type === 'video' ? (
                        <div className="text-center py-2">
                            <video
                                src={activeReader.url}
                                controls
                                autoPlay
                                className="rounded shadow-sm w-100"
                                style={{ maxHeight: '70vh', backgroundColor: '#000' }}
                            />
                        </div>
                    ) : (
                        <div className="binary-reader-placeholder text-center py-5">
                            <div className="mb-3">
                                {getDocumentIcon(activeReader.name, activeReader.type)}
                            </div>
                            <h4 className="fw-bold mb-2">{activeReader.name}</h4>
                            <p className="text-muted mb-4" style={{ maxWidth: '450px', margin: '0 auto' }}>
                                This file is ready to download. You can download and open it directly with your device's native application or open it in a new browser tab.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <Button
                                    variant="success"
                                    size="lg"
                                    onClick={() => handleDownloadFile(activeReader.url, activeReader.name)}
                                    className="px-4 shadow-sm"
                                >
                                    <FaDownload className="me-2" /> Download File
                                </Button>
                                <a
                                    href={activeReader.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline-primary btn-lg px-4"
                                >
                                    <FaExternalLinkAlt className="me-2" /> Open in New Tab
                                </a>
                            </div>
                        </div>
                    )}
                </Modal.Body>

                <Modal.Footer className="bg-light border-top d-flex justify-content-between">
                    <a
                        href={activeReader.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-secondary btn-sm"
                    >
                        <FaExternalLinkAlt className="me-1" /> Open in New Tab
                    </a>

                    <div className="d-flex gap-2">
                        <Button
                            variant="success"
                            onClick={() => handleDownloadFile(activeReader.url, activeReader.name)}
                        >
                            <FaDownload className="me-1" /> Download
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setReaderModalOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
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

                .file-attachment-card {
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }

                .file-attachment-card:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                }

                .instructor-file-badge {
                    font-size: 0.78rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                }

                .shadow-xs {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                }
            `}</style>
        </div>
    );
};

export default Chat;