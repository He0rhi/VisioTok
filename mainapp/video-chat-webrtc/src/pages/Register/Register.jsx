import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/userSlice';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../config';
const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    age: '',
    avatar: '', 
    bio: '',   
  });
  const [message, setMessage] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_CONFIG.API_HOST}:5000/auth/register`, formData);
  
      const token = response.data.token;
      localStorage.setItem('token', token);
  
      const user = response.data.user;
      console.log('User saved in localStorage:', user); 

      if (user) {
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          age: user.age,
          bio: user.bio,
          avatar: user.avatar,
          role: user.role,
        }));        console.log('User saved in localStorage:', user); 
        dispatch(setUser({
          username: user.username,
          email: user.email,
        }));
      }
  
      setMessage('Registration successful');
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.response?.data?.error || 'Registration failed');
    }
  };
  
/*const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/auth/login', formData);

      console.log('Server response:', response.data);

      // Сохраняем токен в localStorage
      const token = response.data.token;
      localStorage.setItem('token', token);

      // Сохраняем данные пользователя в localStorage
      const user = response.data.user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));

        // Сохраняем данные пользователя в Redux (если нужно)
        dispatch(setUser({
          username: user.username,
          email: user.email,
        }));
      }

      setMessage('Login successful');

      // Переход на главную страницу
      navigate('/home');
    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.response?.data?.error || 'Login failed');
    }
  };*/
  return (
    <div>
       <div className='profile-page-header'>
      <Link to="/" className='logo' >
        <h1>VISIOTOK</h1>
      </Link>      </div>
      <div className='profile-page-body'>
      <h1>Регистрация</h1>
      <form onSubmit={handleSubmit} className='profile-form'>
      <div className='profile-form-container'>
      <input className='profile-form-input'
          type="text"
          name="username"
          placeholder='Имя'
          onChange={handleChange} required
        /></div>
         <div className='profile-form-container'>
    
        <input className='profile-form-input'
        placeholder='Еmail'
          type="email"
          name="email"
          onChange={handleChange} required
        /></div>
                 <div className='profile-form-container'>

                 <input className='profile-form-input'
          type="password" 
          name="password" 
          placeholder="Password" 
          onChange={handleChange} 
          required 
        /></div>
         <div className='profile-form-container'>
        <input className='profile-form-input'
         placeholder='Возраст'
          type="number"
          name="age"
          onChange={handleChange} required
        />
        </div>
        <div className='profile-form-container'>
        <input type='text' className='profile-form-input'
         placeholder='Пол'
          name="bio"
          onChange={handleChange} required
        />
        </div>
       
        <button className="save-profile-button" type="submit">Зарегистрироваться</button>
      </form>
      <div className='message-div'>
      {message && <p>{message}</p>}
      </div>
      </div>
    </div>
  );
};

export default Register;
