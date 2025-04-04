import React, { useState, useEffect, useRef } from 'react'; 
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import socket from '../../socket';
import CallNotification from '../CallNotification/CallNotificationPage';
import { API_CONFIG } from '../../config';
const Profile = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    age: '',
    bio: '',
    avatar: ''
  });
  const activeConnectionRef = useRef(null);

 
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); 
const user = localStorage.getItem('user');
const [onlineFriends, setOnlineFriends] = useState({}); 
const parsedUser = JSON.parse(user); 
useEffect(() => {
  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/friends`);
      setFriends(response.data);
    } catch (err) {
      setError('Error fetching friends');
      console.error(err);
    }
  };

  const fetchBlacklist = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/blacklist`);
      setBlacklist(response.data);
    } catch (err) {
      setError('Error fetching blacklist');
      console.error(err);
    }
  };

  fetchFriends();
  fetchBlacklist();
}, []);


const handleCallFriend = async (friendId) => {
  const friend = friends.find(f => f.id === friendId);
  if (!friend) return;
  if (onlineFriends[friendId] !== 'В сети') {
    alert('Пользователь не в сети');
    return;
  }
  console.log(`Calling friend ${friend.username} (${friendId})`);
  
  setCallStatus('calling');
  
  socket.emit('CALL_START', {
    callerId: parsedUser.id,
    callerName: parsedUser.username,
    receiverId: friendId,
    roomId: parsedUser.username
  });

  console.log('CALL_START emitted with:', {
    callerId: parsedUser.id,
    receiverId: friendId,
    roomId: parsedUser.username
  });

  setTimeout(() => {
    console.log(`Navigating to room ${parsedUser.username}`);
    navigate(`/room/${parsedUser.username}`);
  }, 1000);
};

const handleAcceptCall = () => {
  if (!incomingCall) return;
  
  setCallStatus('in-call');
  navigate(`/room/${incomingCall.roomId}`);
};

const handleRejectCall = () => {
  if (!incomingCall) return;
  
  socket.emit('CALL_REJECT', {
    callerId: incomingCall.callerId,
    receiverId: parsedUser.id
  });
  
  setIncomingCall(null);
  setCallStatus(null);
};

useEffect(() => {
  const handleIncomingCall = ({ callerId, callerName, roomId }) => {
    setIncomingCall({
      callerId,
      callerName,
      roomId
    });
    setCallStatus('ringing');
  };

  const handleCallRejected = () => {
    setCallStatus('rejected');
    setTimeout(() => setCallStatus(null), 3000);
  };

  const handleCallEnded = () => {
    setCallStatus('ended');
    setTimeout(() => setCallStatus(null), 3000);
  };

  socket.on('INCOMING_CALL', handleIncomingCall);
  socket.on('CALL_REJECTED', handleCallRejected);
  socket.on('CALL_ENDED', handleCallEnded);

  return () => {
    socket.off('INCOMING_CALL', handleIncomingCall);
    socket.off('CALL_REJECTED', handleCallRejected);
    socket.off('CALL_ENDED', handleCallEnded);
  };
}, []);
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setUserData({
        username: parsedUser.username || '',
        email: parsedUser.email || '',
        age: parsedUser.age || '',
        bio: parsedUser.bio || '',
        avatar: parsedUser.avatar || ''
      });
    }
  }, []);
 

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm('Вы уверены, что хотите удалить учетную запись? Это действие необратимо.');
    
    if (!confirmDelete) return;
    console.log('Никнейм '+ parsedUser.username)

    const response = await fetch(`${API_CONFIG.API_HOST}:5001/register`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: parsedUser.username}),
    }); 
    if(response.ok){
      try {
        await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}`);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } catch (err) {
        setError('Ошибка при удалении учетной записи');
        console.error(err);
      }
    }
    else{
      setError('Ошибка удаления')
    }
    
  };
  
  const fetchOnlineStatus = async () => {
    try {
      const statuses = {};
      for (const friend of friends) {
        try {
          const response = await axios.get(`${API_CONFIG.API_HOST}:5001/register?nickname=${friend.username}`);
          statuses[friend.id] = response.data.webrtcID ? 'В сети' : 'Не в сети';
        } catch (err) {
          statuses[friend.id] = 'Не в сети';
        }
      }
      setOnlineFriends(statuses);
    } catch (err) {
      console.error('Ошибка получения статуса друзей:', err);
    }
  };
useEffect(() => {
  if (friends.length > 0) {
    fetchOnlineStatus();
    const interval = setInterval(fetchOnlineStatus, 10000);
    return () => clearInterval(interval);
  }
}, [friends]);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const user = localStorage.getItem('user');
    if (!user) {
      setError('Пользователь не найден в localStorage');
      return;
    }

    const parsedUser = JSON.parse(user);

    try {
      const response = await axios.put(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}`, {
        ...userData,
        role: parsedUser.role 
      });

      localStorage.setItem('user', JSON.stringify(response.data));

      alert('Данные профиля успешно обновлены');
    } catch (err) {
      setError('Ошибка при обновлении данных пользователя');
      console.error(err);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return; 
  
    try {
      const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users/search?search=${searchQuery}`);
      setUsers(response.data); 
      setError('');

    } catch (err) {
      setError('Пусто');
      console.error(err);
    }
  };
  

  const handleLogout = async () => {

console.log('Никнейм '+ parsedUser.username)
    const response = await fetch(`${API_CONFIG.API_HOST}:5001/register`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: parsedUser.username}),
    }); 
    if(response.ok){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
    }
    else{
      setError('Ошибка выхода')
    }
  };
  const handleAddFriend = async (userId) => {
    try {
      if (blacklist.some(blocked => blocked.id === userId)) {
        await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/blacklist/${userId}`);
        setBlacklist(blacklist.filter(blocked => blocked.id !== userId));
      }
  
      await axios.post(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/friends`, { friendId: userId });
      setFriends((prevFriends) => [...prevFriends, users.find(user => user.id === userId)]);
    } catch (err) {
      setError('Error adding friend');
      console.error(err);
    }
  };
  
  const handleAddToBlacklist = async (userId) => {
    try {
      if (friends.some(friend => friend.id === userId)) {
        await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/friends/${userId}`);
        setFriends(friends.filter(friend => friend.id !== userId));
      }
  
      await axios.post(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/blacklist`, { blockedId: userId });
      setBlacklist((prevBlacklist) => [...prevBlacklist, users.find(user => user.id === userId)]);
    } catch (err) {
      setError('Error adding to blacklist');
      console.error(err);
    }
  };
  

  const handleRemoveFriend = async (userId) => {
    try {
      await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/friends/${userId}`);
      setFriends(friends.filter(friend => friend.id !== userId));
    } catch (err) {
      setError('Error removing friend');
      console.error(err);
    }
  };


  const handleRemoveFromBlacklist = async (userId) => {
    try {
      await axios.delete(`${API_CONFIG.API_HOST}:5000/users/${parsedUser.id}/blacklist/${userId}`);
      setBlacklist(blacklist.filter(blocked => blocked.id !== userId));
    } catch (err) {
      setError('Error removing from blacklist');
      console.error(err);
    }
    
  };
 
  useEffect(() => {
    if (parsedUser?.id) {
      socket.emit('SET_USER_ID', parsedUser.id);
      console.log(`Sent SET_USER_ID with ${parsedUser.id}`);
    }
  
  }, [parsedUser?.id]);

 
  
  return (
    <div>
      <div className="profile-page-header">
        <Link to="/" className="logo">
          <h1>VISIOTOK</h1>
        </Link>
      </div>
      <div className="profile-page-body">
        <h1>Profile</h1>


      


        <form className="profile-form">
          <input
            className="profile-form-input"
            type="text"
            name="username"
            placeholder="Имя"
            value={userData.username}
            onChange={handleChange}
          />
          <input
            className="profile-form-input"
            type="email"
            name="email"
            placeholder="Email"
            value={userData.email}
            onChange={handleChange}
          />
          <input
            className="profile-form-input"
            type="number"
            name="age"
            placeholder="Возраст"
            value={userData.age}
            onChange={handleChange}
          />
          <input
            className="profile-form-input"
            type="text"
            name="bio"
            placeholder="Био"
            value={userData.bio}
            onChange={handleChange}
          />
        <button type="button" className="save-profile-button" onClick={handleDeleteAccount}>
  Удалить учетную запись
</button>

          <button type="button" className="save-profile-button" onClick={handleSave}>
            Сохранить
          </button>
          <button type="button" className="logout-profile-button" onClick={handleLogout}>
            Выйти
          </button>
          
        
        </form>

        <CallNotification
  callStatus={callStatus}
  incomingCall={incomingCall}
  onAcceptCall={handleAcceptCall}
  onRejectCall={handleRejectCall}
  onCancelCall={(roomId) => {
    socket.emit('CALL_END', { roomId });
    setCallStatus(null);
  }}
  onEndCall={(roomId) => {
    socket.emit('CALL_END', { roomId });
    setCallStatus(null);
    navigate('/profile');
  }}
  roomId={parsedUser?.username}
/>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div className='profile-page-body'>
           <h1>Пользователи</h1>

        <input
          type="text"
          placeholder="Поиск по имени..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
<button className="search-button" onClick={handleSearchUsers}>
          Найти
        </button>
<ul>
  {users.map(user => (
    <li key={user.id} className="user-item">
      {user.username} ({user.email})
      <button 
        className="add-button" 
        onClick={() => handleAddFriend(user.id)}
        disabled={friends.some(friend => friend.id === user.id)}
      >
        {friends.some(friend => friend.id === user.id) ? 'Уже в друзьях' : 'Добавить в друзья'}
      </button>

      <button 
        className="add-button" 
        onClick={() => handleAddToBlacklist(user.id)}
        disabled={blacklist.some(blocked => blocked.id === user.id)}
      >
        {blacklist.some(blocked => blocked.id === user.id) ? 'В черном списке' : 'Добавить в черный список'}
      </button>
    </li>
  ))}
</ul>

        </div>
        <div className='firends-list'>
        <h2 style={{marginBottom:'10px'}}>Друзья</h2>
        <ul>
          {friends.map(friend => (
            <li className='li-user' key={friend.id}>                {friend.username} ({friend.email}) — <strong>{onlineFriends[friend.id] || 'Не в сети'}</strong> 
             {onlineFriends[friend.id] && ( 
          <button 
            className='call-button' 
            onClick={() => handleCallFriend(friend.id)}>
            Позвонить
          </button>
        )} 
                   <button className='add-button' onClick={() => handleRemoveFriend(friend.id)}>Удалить из друзей</button></li>
            
          ))}
        </ul>
        </div>
        <div className='firends-list'>

        <h2 style={{marginBottom:'10px'}}>Черный список</h2>
        <ul>
          {blacklist.map(blocked => (
            <li className='li-user' key={blocked.id}>{blocked.username} ({blocked.email})    <button className='add-button' onClick={() => handleRemoveFromBlacklist(blocked.id)}>Удалить из черного спика</button></li>
          ))}
        </ul>
        </div>
      </div>
      </div>

  );
};

export default Profile;
