const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const socketIo = require('socket.io');
const { version, validate } = require('uuid');
const axios = require('axios');
const ACTIONS = require('./socket/actions');
const PORT = process.env.PORT || 3002;
const SSL_KEY_PATH = './ssl/localhost-key.pem';
const SSL_CERT_PATH = './ssl/localhost.pem';
const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH),
};
const usersMap = new Map();
const app = express();
const server = https.createServer(sslOptions, app); 
const io = socketIo(server);
const roomOwners = new Map(); 
function getClientRooms() {
  const { rooms } = io.sockets.adapter;
  return Array.from(rooms.keys()).filter(
    (roomID) => validate(roomID) && version(roomID) === 4);}
function shareRoomsInfo() {
  io.emit(ACTIONS.SHARE_ROOMS, {
    rooms: getClientRooms(),
  });
}

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id} from ${socket.handshake.address}`);
  socket.on('SET_USER_ID', (userId) => {
    usersMap.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ${socket.id}`);
  });
  socket.emit(ACTIONS.ASSIGN_WEBRTC_ID, { webrtcID: socket.id });
  shareRoomsInfo();
  socket.on('disconnect', () => {
    for (let [userId, sockId] of usersMap.entries()) {
      if (sockId === socket.id) {
        usersMap.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  
    Array.from(socket.rooms)
      .filter(roomID => roomID !== socket.id) 
      .forEach(roomID => {
        socket.to(roomID).emit(ACTIONS.REMOVE_PEER, {
          peerID: socket.id
        });
        console.log(`Notifying room ${roomID} about disconnect of ${socket.id}`);
      });
  });
  const checkRoomStatus = async (roomID) => {
    console.log('connection')
    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
    
    if (clients.length === 0) {
      console.log(`No users left in room ${roomID}. Closing room.`);
      
      const startTime = new Date(); 
      const endTime = new Date();
      const duration = Math.floor((endTime - startTime) / 1000);
  
      const statsData = {
        roomId: roomID,
        startTime: startTime,
        endTime: endTime,
        duration: duration
      };
      

      try {
        const response = await axios.post('http://localhost:5000/stats/calls', statsData);
        console.log('Response from server:', response.data);  
      } catch (error) {
        console.error('Error sending call statistics:', error);
      }

      io.to(roomID).emit(ACTIONS.ROOM_ENDED, {
        message: 'Комната была завершена владельцем.',
      });

      roomOwners.delete(roomID);
      shareRoomsInfo();
    }
  };
  socket.on('CALL_START', ({ callerId, callerName, receiverId, roomId, webrtcID }) => {
    console.log(`Call from ${callerId} (${webrtcID}) to ${receiverId}, room: ${roomId}`);
    
    const receiverSocketId = usersMap.get(receiverId);
    
    if (!receiverSocketId) {
      console.log(`User ${receiverId} not found in usersMap`);
      socket.emit('CALL_ERROR', { 
        message: 'Пользователь не в сети' 
      });
      return;
    }
  
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (receiverSocket) {
      console.log(`Sending INCOMING_CALL to ${receiverId}`);
      receiverSocket.emit('INCOMING_CALL', {
        callerId,
        callerName,
        roomId,
        webrtcID 
      });
    } else {
      console.log(`Socket not found for ${receiverId}`);
      socket.emit('CALL_ERROR', { 
        message: 'Ошибка соединения' 
      });
    }
  });
  
  socket.on(ACTIONS.REQUEST_WEBRTC_ID, () => {
    const webrtcID = uuidv4(); 
    console.log(`Выдан новый WebRTC ID: ${webrtcID} для клиента ${socket.id}`);
    
    socket.emit(ACTIONS.ASSIGN_WEBRTC_ID, { webrtcID });
  });


  socket.on('EMOJI', ({ roomID, clientID, emoji }) => {
    console.log('EMOJI event received');
    if (!roomID) {
        console.error('RoomID is not defined');
        return;
    }
    io.to(roomID).emit('EMOJI', { clientID, emoji });
});
socket.on('CHAT_MESSAGE', ({ roomID, userID, username, message }) => {
  io.to(roomID).emit('CHAT_MESSAGE', {
      userID,
      username,
      message,
      timestamp: new Date().toISOString()
  });
});

  socket.on(ACTIONS.LEAVE, () => {
    const { rooms } = socket;
    console.log('leave')
    Array.from(rooms)
      .filter((roomID) => validate(roomID) && version(roomID) === 4)
      .forEach((roomID) => {
        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
  
        clients.forEach((clientID) => {
          io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
            peerID: socket.id,
          });
  
          socket.emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
          });
        });
  
        socket.leave(roomID);
  
        checkRoomStatus(roomID);
      });
  
    shareRoomsInfo();
  });
  socket.on('disconnecting', () => {
    console.log('disconnecting')
    Array.from(socket.rooms)
      .filter((roomID) => validate(roomID) && version(roomID) === 4)
      .forEach((roomID) => {
        checkRoomStatus(roomID);
      });
  });
  socket.on('disconnect', () => {
    for (let [userId, sockId] of usersMap.entries()) {
      if (sockId === socket.id) {
        usersMap.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
      Array.from(socket.rooms)
      .filter(roomID => roomID !== socket.id) 
      .forEach(roomID => {
        socket.to(roomID).emit(ACTIONS.REMOVE_PEER, {
          peerID: socket.id
        });
        console.log(`Notifying room ${roomID} about disconnect of ${socket.id}`);
      });
  });
  socket.on(ACTIONS.END_ROOM, async ({ roomID }) => {
  console.log(`Closing room ${roomID}`);
  const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
  const startTime = new Date();  

  clients.forEach((clientID) => {
    io.to(clientID).emit(ACTIONS.ROOM_ENDED, {
      message: 'Комната была завершена владельцем.',
    });
  });

  const endTime = new Date();
  const duration = Math.floor((endTime - startTime) / 1000); 

  const statsData = {
    roomId: roomID,
    startTime: startTime,
    endTime: endTime,
    duration: duration
  };

  try {
    const response = await axios.post('http://localhost:5000/stats/calls', statsData);
    console.log('Response from server:', response.data); 
  } catch (error) {
    console.error('Error sending call statistics:', error);
  }

  clients.forEach((clientID) => {
    io.sockets.sockets.get(clientID)?.leave(roomID);
  });

  roomOwners.delete(roomID);


  shareRoomsInfo();
});

socket.on('CALL_REJECT', ({ callerId, receiverId }) => {
  const callerSocket = Object.values(io.sockets.sockets).find(
    s => s.userId === callerId
  );
  
  if (callerSocket) {
    callerSocket.emit('CALL_REJECTED');
  }
});

socket.on('CALL_END', ({ roomId }) => {
  io.to(roomId).emit('CALL_ENDED');
}); 

  socket.on(ACTIONS.CHECK_ROOM, ({ roomID }, callback) => {
    const rooms = getClientRooms();
    const exists = rooms.includes(roomID);
    callback(exists); 
  });
  socket.on(ACTIONS.KICK_USER, ({ roomID, clientID }) => {
    console.log(`KICK_USER received for roomID: ${roomID}, clientID: ${clientID}`);
    const ownerID = roomOwners.get(roomID);
    console.log(`Owner of the room: ${ownerID}, Request from: ${socket.id}`);
  
    if (socket.id === ownerID) {
        io.to(clientID).emit(ACTIONS.KICKED);
        
        io.to(roomID).emit(ACTIONS.REMOVE_PEER, {
            peerID: clientID,
        });

        io.sockets.sockets.get(clientID)?.leave(roomID);
        console.log(`Client ${clientID} removed from room ${roomID}`);
    } else {
        console.warn(`Unauthorized kick attempt by ${socket.id}`);
    }
});

  
socket.on(ACTIONS.JOIN, (config) => {
  const { room: roomID } = config;
  const { rooms: joinedRooms } = socket;

  if (Array.from(joinedRooms).includes(roomID)) {
    return console.warn(`Already joined to ${roomID}`);
  }

  if (!roomOwners.has(roomID)) {
    roomOwners.set(roomID, socket.id); 
  }

  const ownerID = roomOwners.get(roomID);
  socket.join(roomID);

  console.log(`Client ${socket.id} joined room ${roomID}`);

  io.to(roomID).emit('room-owner', ownerID);

  const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
  console.log(`Current clients in room ${roomID}:`, clients);

  clients.forEach((clientID) => {
    io.to(clientID).emit(ACTIONS.ADD_PEER, {
      peerID: socket.id,
      createOffer: false,
      ownerID,
    });

    socket.emit(ACTIONS.ADD_PEER, {
      peerID: clientID,
      createOffer: true,
      ownerID,
    });
  });

  shareRoomsInfo();
});

  
  

  


socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
  console.log('Sending SDP to:', peerID, sessionDescription);
  io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
    peerID: socket.id,
    sessionDescription,
  });
});

socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
  console.log('Sending ICE candidate to:', peerID, iceCandidate);
  io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
    peerID: socket.id,
    iceCandidate,
  });
});

});

const publicPath = path.join(__dirname, 'build');

app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on https://localhost:' + PORT);
});
