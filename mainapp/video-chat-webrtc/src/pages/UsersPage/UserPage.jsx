import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../config';
export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users`);
        setUsers(response.data);
      } catch (err) {
        setError('Error fetching users');
        console.error(err);
      }
    };

    fetchUsers();
  }, []);

  const handleBlockUser = async (userId) => {
    try {
      await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId)); 
    } catch (err) {
      setError('Error blocking user');
      console.error(err);
    }
  };

  return (
    <div>
       <div className='profile-page-header'>
      <Link to="/" className='logo' >
        <h1>VISIOTOK</h1>
      </Link>      </div>
      <div className='profile-page-body'>
      <h1>Пользователи</h1>
      <div className='users-list'>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul >
        {users.map(user => (
          <li className='li-user' key={user.id}>
            {user.username} ({user.email})
            <button className='block-button' onClick={() => handleBlockUser(user.id)}>Заблокировать</button>
          </li>
        ))}
      </ul>
      </div>
      </div>
    </div>
  );
}