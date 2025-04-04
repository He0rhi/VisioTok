import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { setUser } from '../../store/userSlice';
import { API_CONFIG } from '../../config';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_CONFIG.API_HOST}:5000/auth/login`, formData);

      console.log('Server response:', response.data);

      const token = response.data.token;
      localStorage.setItem('token', token);

      const user = response.data.user;
      if (user) {
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          age: user.age,
          bio: user.bio,
          avatar: user.avatar,
          role: user.role,
        }));
        dispatch(setUser({
          username: user.username,
          email: user.email,
        }));
      }

      setMessage('Login successful');

      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div>
       <div className='profile-page-header'>
      <Link to="/" className='logo' >
        <h1>VISIOTOK</h1>
      </Link>      </div>
      <div className='profile-page-body'>
      <h1>Login</h1>
      <form className='profile-form' onSubmit={handleSubmit}>
      <div className='profile-form-container'>
        <input className='profile-form-input'
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
        /></div>
          <div className='profile-form-container'>
        <input className='profile-form-input'
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        /></div>
        <button className='save-profile-button' type="submit">Войти</button>
      </form>
      <div className='message-div'>
      {message && <p>{message}</p>}
      </div>
      <p>
        Нет аккаунта?{' '}
        <Link to="/register" style={{textDecoration:'none', color:'white'}}>Зарегистрируйтесь</Link>
      </p>
      </div>
    </div>
  );
};

export default Login;
