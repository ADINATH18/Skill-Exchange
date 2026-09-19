import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    FaEnvelope,
    FaLock,
    FaSignInAlt,
    FaUserPlus
} from 'react-icons/fa';

const Login = () => {
    const API_URL =
        import.meta.env.VITE_API_URL ||
        'http://localhost:1337';

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError('');

        try {
            const response = await axios.post(
                `${API_URL}/api/auth/login`,
                formData
            );

            localStorage.setItem(
                'token',
                response.data.token
            );

            localStorage.setItem(
                'userName',
                response.data.name
            );

            navigate('/dashboard');

        } catch (error) {
            setError(
                error.response?.data?.message ||
                'Login failed'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">

            <div className="auth-card">

                <div className="auth-header">
                    <h2>Welcome Back!</h2>
                    <p>Please sign in to continue</p>
                </div>

                {error && (
                    <div className="alert alert-danger d-flex align-items-center">
                        <FaSignInAlt className="me-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="form-group">

                        <div className="input-group">

                            <span className="input-group-text">
                                <FaEnvelope />
                            </span>

                            <input
                                type="email"
                                className="form-control"
                                name="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />

                        </div>

                    </div>

                    <div className="form-group">

                        <div className="input-group">

                            <span className="input-group-text">
                                <FaLock />
                            </span>

                            <input
                                type="password"
                                className="form-control"
                                name="password"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />

                        </div>

                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >

                        {loading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                ></span>

                                Signing in...
                            </>
                        ) : (
                            <>
                                <FaSignInAlt className="me-2" />
                                Sign In
                            </>
                        )}

                    </button>

                </form>

                <div className="auth-footer">

                    <p>Don't have an account?</p>

                    <Link
                        to="/register"
                        className="btn btn-outline-primary"
                    >
                        <FaUserPlus className="me-2" />
                        Create Account
                    </Link>

                </div>

            </div>

            <style jsx>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(
                        135deg,
                        #f5f7fa 0%,
                        #c3cfe2 100%
                    );
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

                .btn-primary {
                    padding: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: linear-gradient(
                        to right,
                        #4776E6,
                        #8E54E9
                    );
                    border: none;
                    transition: all 0.3s ease;
                }

                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .btn-primary:disabled {
                    background: linear-gradient(
                        to right,
                        #4776E6,
                        #8E54E9
                    );
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
                    background: linear-gradient(
                        to right,
                        #4776E6,
                        #8E54E9
                    );
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

export default Login;