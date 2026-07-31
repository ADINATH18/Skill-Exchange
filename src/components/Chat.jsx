import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Form, Button, Modal } from 'react-bootstrap';
import { FaArrowLeft, FaPaperPlane, FaPaperclip, FaFile, FaImage, FaVideo, FaTimes, FaDownload, FaExclamationTriangle } from 'react-icons/fa';

const Chat = () => {
    const { courseId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [chat, setChat] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resourceFile, setResourceFile] = useState(null);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const token = localStorage.getItem('token');
    const isInstructorView = location.state?.isInstructor;
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchChat();
        const interval = setInterval(fetchChat, 5000); // Poll for new messages
        return () => clearInterval(interval);
    }, [courseId, navigate, token]);

    const fetchChat = async () => {
        try {
            let response;
            if (isInstructorView) {
                // If it's instructor view, courseId is actually chatId
                response = await axios.get(
                    `http://localhost:1337/api/chats/id/${courseId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } else {
                // Student view - fetch by courseId
                response = await axios.get(
                    `http://localhost:1337/api/chats/${courseId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            setChat(response.data);
            setLoading(false);
            scrollToBottom();
        } catch (error) {
            setError(error.response?.data?.message || 'Error fetching chat');
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ((!message.trim() && !resourceFile) || sending) return;

        setSending(true);
        setError('');
        
        try {
            let resourceUrl = '';
            let resourceType = '';

            if (resourceFile) {
                if (resourceFile.size > 5 * 1024 * 1024) {
                    setErrorMessage('File size exceeds 5MB limit. Please choose a smaller file.');
                    setShowErrorModal(true);
                    setSending(false);
                    return;
                }

                const formData = new FormData();
                formData.append('file', resourceFile);

                try {
                    const uploadResponse = await axios.post(
                        'http://localhost:1337/api/upload',
                        formData,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        }
                    );
                    resourceUrl = `http://localhost:1337${uploadResponse.data.url}`;
                    resourceType = resourceFile.type.startsWith('image/') ? 'image' :
                                 resourceFile.type.startsWith('video/') ? 'video' : 'document';
                } catch (uploadError) {
                    setErrorMessage(uploadError.response?.data?.message || 'Error uploading file. Please try again.');
                    setShowErrorModal(true);
                    setSending(false);
                    return;
                }
            }

            const messageData = {
                content: message.trim() || ' ',
                resourceUrl: resourceUrl || undefined,
                resourceType: resourceType || undefined
            };

            await axios.post(
                `http://localhost:1337/api/chats/${chat._id}/message`,
                messageData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage('');
            setResourceFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            fetchChat();
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Error sending message');
            setShowErrorModal(true);
        } finally {
            setSending(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                setErrorMessage('File size exceeds 5MB limit. Please choose a smaller file.');
                setShowErrorModal(true);
                e.target.value = '';
                return;
            }
            setResourceFile(file);
            setError('');
        }
    };

    const removeFile = () => {
        setResourceFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <FaImage />;
        if (type.startsWith('video/')) return <FaVideo />;
        return <FaFile />;
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="alert alert-danger m-3 d-flex align-items-center">
            <FaTimes className="me-2" /> {error}
        </div>
    );
    
    if (!chat) return (
        <div className="alert alert-warning m-3 d-flex align-items-center">
            <FaTimes className="me-2" /> Chat not found
        </div>
    );

    return (
        <div className="chat-container vh-100 d-flex flex-column">
            {/* Chat Header */}
            <div className="chat-header bg-white shadow-sm py-3 px-4">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <button 
                            className="btn btn-link text-dark p-0 me-3"
                            onClick={() => navigate('/dashboard')}
                        >
                            <FaArrowLeft size={20} />
                        </button>
                        <div>
                            <h5 className="mb-0">{chat.course?.name}</h5>
                            <small className="text-muted">
                                {isInstructorView ? 'Student Chat' : 'Instructor Chat'}
                            </small>
                        </div>
                    </div>
                    <div className="chat-status">
                        <span className={`badge ${chat.isActive ? 'bg-success' : 'bg-danger'}`}>
                            {chat.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="chat-messages flex-grow-1 p-4" style={{ overflowY: 'auto' }}>
                {chat.messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`message-wrapper mb-3 ${msg.sender._id === chat.instructor ? 'instructor' : 'student'}`}
                    >
                        <div className={`message ${msg.sender._id === chat.instructor ? 'instructor-message' : 'student-message'}`}>
                            <div className="message-sender mb-1">{msg.sender.name}</div>
                            {msg.content.trim() && (
                                <div className="message-content mb-2">{msg.content}</div>
                            )}
                            {msg.resourceUrl && (
                                <div className="message-resource">
                                    {msg.resourceType === 'image' ? (
                                        <div className="image-preview">
                                            <img 
                                                src={msg.resourceUrl.startsWith('http') ? msg.resourceUrl : `http://localhost:1337${msg.resourceUrl}`}
                                                alt="Shared resource" 
                                                className="img-fluid rounded"
                                            />
                                        </div>
                                    ) : msg.resourceType === 'video' ? (
                                        <div className="video-preview">
                                            <video 
                                                src={msg.resourceUrl.startsWith('http') ? msg.resourceUrl : `http://localhost:1337${msg.resourceUrl}`}
                                                controls 
                                                className="rounded"
                                            />
                                        </div>
                                    ) : (
                                        <a 
                                            href={msg.resourceUrl.startsWith('http') ? msg.resourceUrl : `http://localhost:1337${msg.resourceUrl}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="file-download"
                                        >
                                            <FaDownload className="me-2" />
                                            Download Attachment
                                        </a>
                                    )}
                                </div>
                            )}
                            <div className="message-time">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
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
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your message..."
                                className="border-0 shadow-none"
                                style={{ resize: 'none' }}
                            />
                        </div>
                        
                        {resourceFile && (
                            <div className="selected-file mb-3 p-2 bg-light rounded d-flex align-items-center">
                                {getFileIcon(resourceFile.type)}
                                <span className="ms-2">{resourceFile.name}</span>
                                <button 
                                    type="button" 
                                    className="btn btn-link text-danger ms-auto p-0"
                                    onClick={removeFile}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/*,video/*,.pdf,.doc,.docx"
                                    className="d-none"
                                    id="file-input"
                                />
                                <button 
                                    type="button"
                                    className="btn btn-outline-secondary me-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FaPaperclip /> Attach File
                                </button>
                                <small className="text-muted">
                                    Max: 50MB
                                </small>
                            </div>
                            <Button 
                                type="submit" 
                                variant="primary" 
                                disabled={(!message.trim() && !resourceFile) || sending}
                                className="px-4"
                            >
                                {sending ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
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

            {/* Error Modal */}
            <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>
                        <FaExclamationTriangle className="me-2" />
                        Error
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="d-flex align-items-center">
                        <FaExclamationTriangle className="text-danger me-3" size={24} />
                        <p className="mb-0">{errorMessage}</p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowErrorModal(false)}>
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
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
                    background: rgba(255,255,255,0.1);
                    border-radius: 0.5rem;
                    color: inherit;
                    text-decoration: none;
                    transition: all 0.2s;
                }

                .file-download:hover {
                    background: rgba(255,255,255,0.2);
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
                    box-shadow: 0 0 0 0.25rem rgba(13,110,253,.25);
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
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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