import React, { useState } from 'react';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';

const CreateCourseModal = ({ show, onHide, onCourseCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        skills: '',
        duration: '',
        imageUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const skills = formData.skills.split(',').map(skill => skill.trim());

            await axios.post(
                'http://localhost:1337/api/courses/create',
                {
                    ...formData,
                    skills,
                    duration: parseInt(formData.duration)
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            onCourseCreated();
            onHide();
            setFormData({
                name: '',
                skills: '',
                duration: '',
                imageUrl: ''
            });
        } catch (error) {
            setError(error.response?.data?.message || 'Error creating course');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Create New Course</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <div className="alert alert-danger">{error}</div>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Course Name</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Skills (comma-separated)</Form.Label>
                        <Form.Control
                            type="text"
                            name="skills"
                            value={formData.skills}
                            onChange={handleChange}
                            placeholder="e.g., React, Node.js, MongoDB"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Duration (weeks)</Form.Label>
                        <Form.Control
                            type="number"
                            name="duration"
                            value={formData.duration}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Image URL</Form.Label>
                        <Form.Control
                            type="url"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            required
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end">
                        <Button variant="secondary" onClick={onHide} className="me-2">
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Course'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default CreateCourseModal; 