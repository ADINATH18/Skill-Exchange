import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, ListGroup, Badge, Accordion, Button } from 'react-bootstrap';

const API_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:1337';

const InstructorChat = () => {
    const navigate = useNavigate();
    const [chats, setChats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        fetchInstructorChats();

        const interval = setInterval(
            fetchInstructorChats,
            30000
        );

        return () => clearInterval(interval);
    }, [navigate, token]);

    const fetchInstructorChats = async () => {
        try {
            const response = await axios.get(
                `${API_URL}/api/chats/instructor/all`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setChats(response.data);
            console.log(response.data);
            setLoading(false);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                'Error fetching chats'
            );
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'No messages';

        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="text-center mt-5">
                Loading...
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger m-3">
                {error}
            </div>
        );
    }

    return (
        <div className="container mt-4">

            <div className="d-flex justify-content-between align-items-center mb-4">

                <h2>
                    Instructor Chat Dashboard
                </h2>

                <Button
                    variant="secondary"
                    onClick={() => navigate('/dashboard')}
                >
                    Back to Dashboard
                </Button>

            </div>

            <Accordion>

                {Object.entries(chats).map(
                    ([courseName, courseChats], index) => (

                        <Accordion.Item
                            key={index}
                            eventKey={index.toString()}
                        >

                            <Accordion.Header>

                                <div className="d-flex justify-content-between align-items-center w-100 me-3">

                                    <span>
                                        {courseName}
                                    </span>

                                    <Badge
                                        bg="primary"
                                        pill
                                    >
                                        {courseChats.length} chats
                                    </Badge>

                                </div>

                            </Accordion.Header>

                            <Accordion.Body>

                                <ListGroup>

                                    {courseChats.map(
                                        (chat) => (

                                            <ListGroup.Item
                                                key={chat.chatId}
                                                className="d-flex justify-content-between align-items-center"
                                                action
                                                onClick={() =>
                                                    navigate(
                                                        `/chat/${chat.chatId}`,
                                                        {
                                                            state: {
                                                                isInstructor: true
                                                            }
                                                        }
                                                    )
                                                }
                                            >

                                                <div>

                                                    <h6 className="mb-1">
                                                        Student: {chat.student}
                                                    </h6>

                                                    <p className="mb-1 text-muted small">
                                                        Last message:{' '}
                                                        {chat.lastMessage}
                                                    </p>

                                                    <small className="text-muted">
                                                        {formatTime(
                                                            chat.lastMessageTime
                                                        )}
                                                    </small>

                                                </div>

                                                <div className="text-end">

                                                    <Badge
                                                        bg={
                                                            chat.isActive
                                                                ? 'success'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {chat.isActive
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>

                                                    <div className="mt-2">

                                                        <Badge bg="info">
                                                            {
                                                                chat.totalMessages
                                                            }{' '}
                                                            messages
                                                        </Badge>

                                                    </div>

                                                </div>

                                            </ListGroup.Item>

                                        )
                                    )}

                                </ListGroup>

                            </Accordion.Body>

                        </Accordion.Item>

                    )
                )}

            </Accordion>

            {Object.keys(chats).length === 0 && (

                <Card className="text-center p-4">

                    <Card.Body>

                        <h5>
                            No chats available
                        </h5>

                        <p>
                            You don't have any active chats
                            with students at the moment.
                        </p>

                    </Card.Body>

                </Card>

            )}

        </div>
    );
};

export default InstructorChat;