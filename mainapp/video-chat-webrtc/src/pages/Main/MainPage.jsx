import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { v4 } from 'uuid';
import socket from '../../socket';
import ACTIONS from '../../socket/actions';
import axios from 'axios';
import CallNotification from '../CallNotification/CallNotificationPage';
import { API_CONFIG } from '../../config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhoneAlt } from '@fortawesome/free-solid-svg-icons';

export default function MainPage() {
  const navigate = useNavigate();
  const [rooms, updateRooms] = useState([]);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [error, setError] = useState('');
  const rootNode = useRef();
  
  const isAuthenticated = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));  
  
  const userRole = user ? user.role : null;
  const username = user ? user.username : null;
  const [webrtcID, setWebrtcID] = useState(null);

  const [friends, setFriends] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [onlineFriends, setOnlineFriends] = useState({});
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState(null);
  useEffect(() => {
    if (user?.id) {
      socket.emit('SET_USER_ID', user.id);
      console.log(`Sent SET_USER_ID with ${user.id}`);
    }
  }, [user?.id]);
  const registerWebRTCCall = async (webrtcID) => {
    try {
      const response = await fetch(`${API_CONFIG.API_HOST}:5001/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: username, webrtcID }),
      });
  
      if (!response.ok) {
        throw new Error('Ошибка при регистрации WebRTC ID');
      }
  
      console.log(`Пользователь ${username} зарегистрирован с WebRTC ID ${webrtcID}`);
    } catch (error) {
      console.error('Ошибка отправки ID:', error);
    }
  };
  useEffect(() => {
    console.log('Запрашиваю новый WebRTC ID');
    socket.emit(ACTIONS.REQUEST_WEBRTC_ID);
  
    const handleWebRTCId = ({ webrtcID }) => {
      console.log('Полученный id:', webrtcID);
      setWebrtcID(webrtcID);
      
      if (user) {
        const updatedUser = { ...user, webrtcID };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        if (user?.id) {
          socket.emit('SET_USER_ID', user.id);
          console.log(`Sent SET_USER_ID with ${user.id}`);
        }
  
        registerWebRTCCall(webrtcID);
      }
    };
  
    socket.on(ACTIONS.ASSIGN_WEBRTC_ID, handleWebRTCId);
  
    return () => {
      socket.off(ACTIONS.ASSIGN_WEBRTC_ID, handleWebRTCId);
    };
  }, [user?.id, username]);
  useEffect(() => {
    const handleCallError = (error) => {
      console.error('Call error:', error);
      setCallStatus('error');
      setTimeout(() => setCallStatus(null), 3000);
    };
  
    socket.on('CALL_ERROR', handleCallError);
  
    return () => {
      socket.off('CALL_ERROR', handleCallError);
    };
  }, []);
  const fetchFriends = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users/${user.id}/friends`);
      setFriends(response.data);
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const fetchBlacklist = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.API_HOST}:5000/users/${user.id}/blacklist`);
      setBlacklist(response.data);
    } catch (err) {
      console.error('Error fetching blacklist:', err);
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
    if (user?.id) {
      fetchFriends();
      fetchBlacklist();
    }
  }, [user?.id]);

  useEffect(() => {
    if (friends.length > 0) {
      fetchOnlineStatus();
      const interval = setInterval(fetchOnlineStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [friends]);

  const handleCallFriend = async (friendId) => {
    if (!webrtcID) {
      alert('Система звонков еще не готова. Пожалуйста, подождите...');
      return;
    }
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;
    
    if (onlineFriends[friendId] !== 'В сети') {
      alert('Пользователь не в сети');
      return;
    }
    
    setCallStatus('calling');
    
    console.log('CALL_START emitted with:', {
      callerId: user.id,
      callerName: username,
      receiverId: friendId,
      roomId: username,
      webrtcID: webrtcID 
    });
    
    socket.emit('CALL_START', {
      callerId: user.id,
      callerName: username,
      receiverId: friendId,
      roomId: username,
      webrtcID: webrtcID
    });
  
    setTimeout(() => {
      navigate(`/room/${username}`);
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
      receiverId: user.id
    });
    setIncomingCall(null);
    setCallStatus(null);
  };

  useEffect(() => {
    const handleIncomingCall = ({ callerId, callerName, roomId }) => {
      console.log('INCOMING_CALL received:', { callerId, callerName, roomId });
      setIncomingCall({ callerId, callerName, roomId });
      setCallStatus('ringing');
    };
  
    const handleCallRejected = () => {
      console.log('CALL_REJECTED received');
      setCallStatus('rejected');
      setTimeout(() => setCallStatus(null), 3000);
    };
  
    const handleCallEnded = () => {
      console.log('CALL_ENDED received');
      setCallStatus('ended');
      setTimeout(() => setCallStatus(null), 3000);
    };
  
    socket.on('INCOMING_CALL', handleIncomingCall);
    socket.on('CALL_REJECTED', handleCallRejected);
    socket.on('CALL_ENDED', handleCallEnded);
  
    console.log('Call event listeners registered');
  
    return () => {
      socket.off('INCOMING_CALL', handleIncomingCall);
      socket.off('CALL_REJECTED', handleCallRejected);
      socket.off('CALL_ENDED', handleCallEnded);
    };
  }, []);
  useEffect(() => {
    const handleRoomEnded = ({ message }) => {
      console.log('ROOM_ENDED event received:', message);
      alert(message);
      navigate('/'); 
    };
    
    socket.on(ACTIONS.ROOM_ENDED, handleRoomEnded);
    
    return () => {
      socket.off(ACTIONS.ROOM_ENDED, handleRoomEnded);
    };
  }, [navigate]);

  const handleInputJoinRoom = () => {
    navigate(`/room/${roomIdInput}`);
  };

  return (
    <div className='main-page' ref={rootNode}>
      <div className='main-page-header'>
        <Link to="/" className='logo'>
          <h1>VISIOTOK</h1>
        </Link>
     
        {isAuthenticated ? (
          <>
            <span className='welcome-span' onClick={() => navigate('/profile')}>
              {username}
            </span>
            {username === 'admin' && (
              <div>
                <button className='users-admin-button' onClick={() => navigate('/users')}>
                  Пользователи
                </button>
                <button className='statistic-admin-button' onClick={() => navigate('/stats')}>
                  Статистика
                </button>
              </div>
            )}
          </>
        ) : (
          <button className='login-button' onClick={() => navigate('/login')}>Войти</button>
        )}
      </div>

      <div className='main-page-body'>
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
            navigate('/');
          }}
          roomId={username}
        />

        {isAuthenticated && (
          <div className='friends-section'>
            <h2>Ваши друзья</h2>
            <ul className='friends-list'>
              {friends.map(friend => (
                <li key={friend.id} className='friend-item'>
                  <span>
                    {friend.username} ({friend.email}) — 
                    <strong>{onlineFriends[friend.id] || 'Не в сети'}</strong>
                  </span>
                  {onlineFriends[friend.id] === 'В сети' && (
                    <button 
                      className='call-button'
                      onClick={() => handleCallFriend(friend.id)}
                    >
                   <FontAwesomeIcon icon={faPhoneAlt} />
                 
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className='room-manage-div'>
          <div className="join-room-button-input">
            <input 
              type="text" 
              placeholder='Введите ID комнаты'
              className="join-room-input"  
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
            />
            <button type="button" className="join-room-button" onClick={handleInputJoinRoom}>
              Войти в комнату
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </div> 
          <button className="join-room-button" onClick={() => navigate(`/room/${v4()}`)}>
            Создать новую комнату
          </button>
        </div>

        {userRole === 'ADMIN' && (
          <div>
            <h3 style={{marginBottom:'20px'}}>Список комнат</h3>
            <ul className='ul-rooms'>
              {rooms.map(roomID => (
                <li key={roomID}>
                  {roomID}
                  <button className='join-room-button' onClick={() => navigate(`/room/${roomID}`)}>
                    JOIN ROOM
                  </button>
                  {userRole === 'ADMIN' && (
                    <button className='join-room-button' onClick={() => socket.emit(ACTIONS.END_ROOM, { roomID })}>
                      END
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}