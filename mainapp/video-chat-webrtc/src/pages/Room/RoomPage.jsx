import { useParams, useNavigate } from 'react-router-dom';
import useWebRTC, { LOCAL_VIDEO } from '../../hooks/useWebRTC';
import { useEffect, useState, useCallback } from 'react';
import socket from '../../socket';
import ACTIONS from '../../socket/actions';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhoneAlt, faVideo, faMicrophone, faMicrophoneSlash, faShareAlt, faStopCircle,faVideoSlash } from '@fortawesome/free-solid-svg-icons';
import { API_CONFIG } from '../../config';
export default function RoomPage() {
    const { id: roomID } = useParams();
    const navigate = useNavigate();
    const {
        clients,
        provideMediaRef,
        toggleCamera,
        toggleMicrophone,
        isCameraEnabled,
        isMicrophoneEnabled,
        shareScreen,
        isScreenShared,
        localMediaStream,
    } = useWebRTC(roomID);
    const [emojiMap, setEmojiMap] = useState({});
    const [ownerID, setOwnerID] = useState(null);
    const [screenStream, setScreenStream] = useState(null);
    const [enlargedContainerID, setEnlargedContainerID] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));
const username = user ? user.username : 'Anonymous';
const [isMicroOnClient, setisMicroOnClient] = useState(true);
const [isVideoOnClient, setisVideoOnClient] = useState(true);
const [isScreenOnClient, setisScreenOnClient] = useState(true);
const [messages, setMessages] = useState([]);
const [messageInput, setMessageInput] = useState("");

    useEffect(() => {
        return () => {
            if (localMediaStream) {
                localMediaStream.getTracks().forEach((track) => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [localMediaStream, screenStream]);
useEffect(() => {
    socket.on(ACTIONS.REMOVE_PEER, ({ peerID }) => {
      console.log(`User ${peerID} left the room`);
    });
  
    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, []);
    useEffect(() => {
        socket.on('room-owner', (ownerID) => {
            setOwnerID(ownerID);
        });
        socket.on('EMOJI', ({ clientID, emoji }) => {
            setEmojiMap((prev) => ({ ...prev, [clientID]: emoji }));
            setTimeout(() => {
                setEmojiMap((prev) => ({ ...prev, [clientID]: null }));
            }, 3000);
        });
        socket.on('KICKED', () => {
            console.log('You were kicked from the room');
            navigate('/');
        });

        socket.on('ROOM_ENDED', () => {
            console.log('Room was closed. Redirecting...');
            navigate('/');
        });

        socket.emit('join-room', roomID, socket.id);

        return () => {
            socket.off('room-owner');
            socket.off('KICKED');
            socket.off('ROOM_ENDED');
            socket.off('EMOJI');
        };
    }, [roomID, navigate]);

    const handleLeaveCall = useCallback(() => {
        console.log('Leaving the room');
        
        if (localMediaStream) {
          localMediaStream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped local media track');
          });
        }
        
        if (screenStream) {
          screenStream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped screen share track');
          });
        }
      
        socket.emit(ACTIONS.LEAVE);
        
        navigate('/');
      }, [localMediaStream, screenStream, navigate]);
      const sendMessage = () => {
        if (messageInput.trim()) {
          socket.emit("CHAT_MESSAGE", { 
            roomID, 
            userID: socket.id,
            username, 
            message: messageInput 
          });
          setMessageInput(""); // Только очищаем input
        }
      };
      
      // Все сообщения добавляем только здесь
      useEffect(() => {
        socket.on("CHAT_MESSAGE", ({ userID, username, message }) => {
          setMessages((prev) => [...prev, { 
            userID, 
            username, 
            message 
          }]);
        });
      
        return () => {
          socket.off("CHAT_MESSAGE");
        };
      }, []);
    const handleContainerClick = (containerID) => {
        setEnlargedContainerID((prevID) => (prevID === containerID ? null : containerID)); 
    };
    const isGridEnlarged = !!enlargedContainerID; 
    const getContainerClass = (containerID) => {
        if (containerID === LOCAL_VIDEO) {
            return `video-container ${containerID === enlargedContainerID ? 'enlarged' : ''} highlighted`;
        }
        return enlargedContainerID === containerID
            ? 'video-container enlarged'
            : 'video-container';
    };
    
    const sendEmoji = (emoji) => {
        socket.emit('EMOJI', { roomID, clientID: socket.id, emoji });
        setEmojiMap((prev) => ({ ...prev, [socket.id]: emoji }));
        setTimeout(() => {
            setEmojiMap((prev) => ({ ...prev, [socket.id]: null }));
        }, 3000); 
    };
    const handleShareScreen = async () => {
        try {
          await shareScreen(); 
          
          setisScreenOnClient(isScreenShared);
        } catch (error) {
          console.error('Error handling screen share:', error);
          setisScreenOnClient(false);
        }
      };
    
    
    const handleKickUser = (clientID) => {
        if (socket.id === ownerID) {
            socket.emit('KICK_USER', { roomID, clientID });
        } else {
            console.log('Only the owner can kick users');
        }
    };
    return (
        <div >
            <div className='profile-page-header'>
                <Link to="/" className='logo'>
                    <h1>VISIOTOK</h1>
                </Link>
            </div>
            <div className='profile-page-body'>
                <div className='video-page'>

                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <h2>Room ID: {roomID}</h2>
                </div>
                <div     className={`video-grid ${isGridEnlarged ? 'enlarged' : ''}`}
   >
                    {localMediaStream && (
    <div
        className={getContainerClass(LOCAL_VIDEO)}
        onClick={() => handleContainerClick(LOCAL_VIDEO)}
    >
        <video
            className="video-block"
            autoPlay
            playsInline
            muted
            ref={(video) => {
                if (video && localMediaStream) {
                    video.srcObject = localMediaStream;
                }
            }}
        />
        {emojiMap[socket.id] && (
                                <div className="emoji-overlay">{emojiMap[socket.id]}</div>
                            )}
    </div>
)}
                    {clients.filter(clientID => clientID !== socket.id).map((clientID) => (
  <div key={clientID}>
    <div
      className={getContainerClass(clientID)}
      onClick={() => handleContainerClick(clientID)}
    >
      <video
        className="video-block"
        ref={(instance) => provideMediaRef(clientID, instance)}
        autoPlay
        playsInline
      />
      {emojiMap[clientID] && (
        <div className="emoji-overlay">{emojiMap[clientID]}</div>
      )}
    </div>
    {ownerID === socket.id && (
      <button onClick={() => handleKickUser(clientID)} className="kick-button">
        Kick
      </button>
    )}
  </div>
))}
                    {screenStream && (
                        <div
                            className={getContainerClass('screen')}
                            onClick={() => handleContainerClick('screen')}
                        >
                            <video
                                className="video-block"
                                autoPlay
                                playsInline
                                muted
                                ref={(video) => {
                                    if (video && screenStream) {
                                        video.srcObject = screenStream;
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="controls">
                <button onClick={() => {
  handleLeaveCall();
}} className="control-button">
  <FontAwesomeIcon icon={faPhoneAlt} />
</button>
        <button onClick={toggleCamera} className="control-button">
            <FontAwesomeIcon icon={isCameraEnabled ? faVideo : faVideoSlash} />
        </button>
        <button onClick={toggleMicrophone} className="control-button">
            <FontAwesomeIcon icon={isMicrophoneEnabled ? faMicrophone : faMicrophoneSlash} />
        </button>
        <button onClick={handleShareScreen} className="control-button">
            <FontAwesomeIcon icon={isScreenShared ? faStopCircle : faShareAlt} />
        </button>
                </div>
                <div className="emoji-controls">
                    {['😀', '❤️', '🎉', '👍', '😂'].map((emoji) => (
                        <button key={emoji} onClick={() => sendEmoji(emoji)} className="emoji-button">
                            {emoji}
                        </button>
                    ))}
                </div>
           
           </div>
           <div className="message-page">
           <div className="chat-messages">
    {messages.map((msg, index) => (
        <div key={index} className="chat-message">
            <strong>{msg.username || msg.userID}:</strong> {msg.message}
        </div>
    ))}
</div>
        <div className="chat-input">
            <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Введите сообщение..."
            />
            <button onClick={sendMessage}>Отправить</button>
        </div>
    </div>
            </div>
        </div>
    );
}
