const ACTIONS = {
  JOIN: 'join',
  LEAVE: 'leave',
  SHARE_ROOMS: 'share-rooms',
  ADD_PEER: 'add-peer',
  REMOVE_PEER: 'remove-peer',
  RELAY_SDP: 'relay-sdp',
  RELAY_ICE: 'relay-ice',
  ICE_CANDIDATE: 'ice-candidate',
  SESSION_DESCRIPTION: 'session-description',
  CHECK_ROOM: 'check_room',
  KICK_USER:'KICK_USER',
  KICKED: 'KICKED',
  END_ROOM: 'END_ROOM',
  ROOM_ENDED: 'ROOM_ENDED',
  EMOJI:'EMOJI',
  CHAT_MESSAGE:'CHAT_MESSAGE',
  ASSIGN_WEBRTC_ID:'ASSIGN_WEBRTC_ID',
  REQUEST_WEBRTC_ID:'REQUEST_WEBRTC_ID',
  CALL_USER:'CALL_USER',
  ACCEPT_CALL:'ACCEPT_CALL',
  CALL_ACCEPTED:'CALL_ACCEPTED'
};

module.exports = ACTIONS;