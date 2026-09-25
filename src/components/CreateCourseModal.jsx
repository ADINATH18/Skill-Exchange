import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Modal, Button, Form, ProgressBar, Alert } from 'react-bootstrap';
import { FaVideo, FaImage, FaUpload, FaTimes, FaCheckCircle } from 'react-icons/fa';

const CreateCourseModal = ({ show, onHide, onCourseCreated }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337';

    const [formData, setFormData] = useState({
        name: '',
        skills: '',
        duration: '',
        imageUrl: '',
        videoUrl: '',
        description: ''
    });

    const [loading, setLoading] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [error, setError] = useState('');

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleFileUpload = async (file, type) => {
        if (!file) return;

        if (file.size > 500 * 1024 * 1024) {
            setError('File size exceeds 500MB limit. Please choose a smaller file.');
            return;
        }

        const token = localStorage.getItem('token');
        const uploadData = new FormData();
        uploadData.append('file', file);

        setUploadingMedia(true);
        setUploadProgress(0);
        setUploadStatusText(`Uploading ${type === 'video' ? 'video' : 'cover image'}...`);
        setError('');

        try {
            const res = await axios.post(`${API_URL}/api/upload`, uploadData, {
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

            const fullUrl = res.data.url.startsWith('http') ? res.data.url : `${API_URL}${res.data.url}`;

            if (type === 'video') {
                setFormData((prev) => ({ ...prev, videoUrl: fullUrl }));
            } else {
                setFormData((prev) => ({ ...prev, imageUrl: fullUrl }));
            }
        } catch (err) {
            console.error('Upload error in CreateCourseModal:', err);
            setError(err.response?.data?.message || 'Failed to upload media file');
        } finally {
            setUploadingMedia(false);
            setUploadProgress(0);
            setUploadStatusText('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');

            const skills = formData.skills
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean);

            await axios.post(
                `${API_URL}/api/courses/create`,
                {
                    ...formData,
                    skills,
                    duration: parseInt(formData.duration)
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            onCourseCreated();
            onHide();

            setFormData({
                name: '',
                skills: '',
                duration: '',
                imageUrl: '',
                videoUrl: '',
                description: ''
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Error creating course'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold">Create New Skill Exchange Course</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && (
                    <Alert variant="danger" dismissible onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {uploadingMedia && (
                    <div className="mb-3 p-3 bg-light border rounded">
                        <div className="d-flex justify-content-between small text-muted mb-1">
                            <span>{uploadStatusText}</span>
                            <span>{uploadProgress}%</span>
                        </div>
                        <ProgressBar animated now={uploadProgress} label={`${uploadProgress}%`} variant="success" />
                    </div>
                )}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Course Name *</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Master React & Node Full-Stack"
                            required
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-7">
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Skills Taught * (comma-separated)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleChange}
                                    placeholder="e.g., React, Node.js, MongoDB, Express"
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-5">
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Duration (weeks) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    min="1"
                                    placeholder="e.g. 4"
                                    required
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Course Overview / Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Briefly describe what students will learn and exchange in this course..."
                        />
                    </Form.Group>

                    {/* Course Video Upload & URL */}
                    <div className="p-3 border rounded mb-3 bg-light">
                        <Form.Label className="fw-semibold d-flex align-items-center mb-2">
                            <FaVideo className="text-danger me-2" /> Course Introduction Video (Upload or URL)
                        </Form.Label>
                        <p className="text-muted small mb-2">
                            Upload a lecture or preview video (MP4, WebM, MOV, etc. up to 500MB) or paste an online video link.
                        </p>

                        <div className="d-flex gap-2 mb-2 flex-wrap">
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/*"
                                className="d-none"
                                onChange={(e) => handleFileUpload(e.target.files[0], 'video')}
                            />
                            <Button
                                variant="outline-danger"
                                size="sm"
                                type="button"
                                className="d-flex align-items-center"
                                onClick={() => videoInputRef.current?.click()}
                                disabled={uploadingMedia}
                            >
                                <FaUpload className="me-1" /> Upload Video File (up to 500MB)
                            </Button>
                        </div>

                        <Form.Control
                            type="url"
                            name="videoUrl"
                            value={formData.videoUrl}
                            onChange={handleChange}
                            placeholder="Or paste video URL (e.g. https://... or /uploads/video.mp4)"
                        />

                        {formData.videoUrl && (
                            <div className="mt-2 p-2 bg-white rounded border">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="text-success fw-bold d-flex align-items-center">
                                        <FaCheckCircle className="me-1" /> Video attached
                                    </small>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        className="text-danger p-0"
                                        onClick={() => setFormData({ ...formData, videoUrl: '' })}
                                    >
                                        <FaTimes /> Remove
                                    </Button>
                                </div>
                                <video
                                    src={formData.videoUrl}
                                    controls
                                    preload="metadata"
                                    className="w-100 rounded"
                                    style={{ maxHeight: '180px', backgroundColor: '#000' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Cover Image Upload & URL */}
                    <div className="p-3 border rounded mb-3 bg-light">
                        <Form.Label className="fw-semibold d-flex align-items-center mb-2">
                            <FaImage className="text-primary me-2" /> Course Cover Image
                        </Form.Label>

                        <div className="d-flex gap-2 mb-2 flex-wrap">
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={(e) => handleFileUpload(e.target.files[0], 'image')}
                            />
                            <Button
                                variant="outline-primary"
                                size="sm"
                                type="button"
                                className="d-flex align-items-center"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={uploadingMedia}
                            >
                                <FaUpload className="me-1" /> Upload Image File
                            </Button>
                        </div>

                        <Form.Control
                            type="url"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            placeholder="Or paste Image URL (optional, defaults to cover photo)"
                        />

                        {formData.imageUrl && (
                            <div className="mt-2 p-2 bg-white rounded border d-flex align-items-center justify-content-between">
                                <img
                                    src={formData.imageUrl}
                                    alt="Preview"
                                    style={{ height: '50px', width: '80px', objectFit: 'cover' }}
                                    className="rounded me-2"
                                />
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="text-danger p-0"
                                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                >
                                    <FaTimes /> Remove
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                        <Button variant="secondary" onClick={onHide}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading || uploadingMedia}>
                            {loading ? 'Creating...' : 'Create Course'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default CreateCourseModal;