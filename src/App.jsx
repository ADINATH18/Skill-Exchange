import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import InstructorChat from './components/InstructorChat';
import CourseView from './components/CourseView';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Navigate to="/login" />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/course/:courseId" element={<CourseView />} />
                    <Route path="/chat/:courseId" element={<Chat />} />
                    <Route path="/messages" element={<InstructorChat />} />
                    <Route path="/instructor-chats" element={<InstructorChat />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
