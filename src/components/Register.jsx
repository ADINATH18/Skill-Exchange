import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaSignInAlt } from 'react-icons/fa';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        
        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length < 3) {
            newErrors.name = 'Name must be at least 3 characters long';
        }

        // Email validation
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        setSubmitError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setLoading(true);

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:1337/api/auth/register',
                formData
            );
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userName', response.data.name);
            navigate('/dashboard');
        } catch (error) {
            setSubmitError(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join our learning platform today</p>
                </div>

                {submitError && (
                    <div className="alert alert-danger d-flex align-items-center">
                        <FaUserPlus className="me-2" /> {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <div className={`input-group ${errors.name ? 'is-invalid' : ''}`}>
                            <span className="input-group-text">
                                <FaUser />
                            </span>
                            <input
                                type="text"
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                name="name"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.name && (
                            <div className="invalid-feedback d-block">{errors.name}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <div className={`input-group ${errors.email ? 'is-invalid' : ''}`}>
                            <span className="input-group-text">
                                <FaEnvelope />
                            </span>
                            <input
                                type="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                name="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.email && (
                            <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                    </div>

                    <div className="form-group">
                        <div className={`input-group ${errors.password ? 'is-invalid' : ''}`}>
                            <span className="input-group-text">
                                <FaLock />
                            </span>
                            <input
                                type="password"
                                className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                name="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        {errors.password && (
                            <div className="invalid-feedback d-block">{errors.password}</div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <FaUserPlus className="me-2" /> Create Account
                            </>
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Already have an account?</p>
                    <Link to="/login" className="btn btn-outline-primary">
                        <FaSignInAlt className="me-2" /> Sign In
                    </Link>
                </div>
            </div>

            <style jsx>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    padding: 20px;
                }

                .auth-card {
                    background: white;
                    border-radius: 15px;
                    padding: 2rem;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .auth-header h2 {
                    color: #2d3748;
                    margin-bottom: 0.5rem;
                }

                .auth-header p {
                    color: #718096;
                    margin-bottom: 0;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .input-group {
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .input-group-text {
                    background-color: white;
                    border: 1px solid #e2e8f0;
                    border-right: none;
                    color: #718096;
                }

                .form-control {
                    border: 1px solid #e2e8f0;
                    border-left: none;
                    padding: 0.75rem 1rem;
                }

                .form-control:focus {
                    box-shadow: none;
                    border-color: #e2e8f0;
                }

                .input-group.is-invalid .input-group-text,
                .input-group.is-invalid .form-control {
                    border-color: #dc3545;
                }

                .invalid-feedback {
                    font-size: 0.875rem;
                    color: #dc3545;
                    margin-top: 0.25rem;
                }

                .btn-primary {
                    padding: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: linear-gradient(to right, #4776E6, #8E54E9);
                    border: none;
                    transition: all 0.3s ease;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .btn-primary:disabled {
                    background: linear-gradient(to right, #4776E6, #8E54E9);
                    opacity: 0.7;
                }

                .auth-footer {
                    text-align: center;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid #e2e8f0;
                }

                .auth-footer p {
                    color: #718096;
                    margin-bottom: 1rem;
                }

                .btn-outline-primary {
                    border: 2px solid #4776E6;
                    color: #4776E6;
                    font-weight: 600;
                    padding: 0.5rem 1.5rem;
                    transition: all 0.3s ease;
                }

                .btn-outline-primary:hover {
                    background: linear-gradient(to right, #4776E6, #8E54E9);
                    border-color: transparent;
                    color: white;
                    transform: translateY(-1px);
                }

                @media (max-width: 576px) {
                    .auth-card {
                        padding: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Register; 