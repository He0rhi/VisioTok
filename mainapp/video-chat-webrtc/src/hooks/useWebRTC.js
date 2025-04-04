import { useState, useCallback, useRef, useEffect } from 'react';
import freeice from 'freeice';
import useStateWithCallback from './useStateWithCallback';
import socket from '../socket';
import ACTIONS from '../socket/actions';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export default function useWebRTC(roomID) {
  const [clients, updateClients] = useStateWithCallback([]);
  const [isScreenShared, setScreenShared] = useState(false);
  const [isCameraEnabled, setCameraEnabled] = useState(true); 
  const [isMicrophoneEnabled, setMicrophoneEnabled] = useState(true); 
  let localStream = null;
  const [localMediaStreams, setLocalMediaStreams] = useState(null);
  const originalVideoTrack = useRef(null); 
  async function startLocalStream() {
      localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
      });

  }

  const addNewClient = useCallback((newClient, cb) => {
    updateClients(list => {
      if (!list.includes(newClient)) {
        return [...list, newClient];
      }
      return list;
    }, cb);
  }, [updateClients]);

  const peerConnections = useRef({});
  const localMediaStream = useRef(null);
  const peerMediaElements = useRef({
    [LOCAL_VIDEO]: null,
  });

  const toggleTrack = useCallback((kind, enabled) => {
    const track = localMediaStream.current?.getTracks().find(t => t.kind === kind);
    if (track) {
      track.enabled = enabled;
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localMediaStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      const newState = !videoTrack.enabled;
      videoTrack.enabled = newState;
      setCameraEnabled(newState); 
    }
  }, []);

  const toggleMicrophone = useCallback(() => {
    const audioTrack = localMediaStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      const newState = !audioTrack.enabled;
      audioTrack.enabled = newState;
      setMicrophoneEnabled(newState); 
    }
  }, []);
  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      console.log(`Removing peer ${peerID}`);
      
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }
  
      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];
  
      updateClients(list => {
        const newList = list.filter(c => c !== peerID);
        console.log(`Updated clients list:`, newList);
        return newList;
      });
    };
  
    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
  
    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, [updateClients]);
  useEffect(() => {
    async function handleNewPeer({ peerID, createOffer }) {
      if (peerID in peerConnections.current) {
        return console.warn(`Already connected to peer ${peerID}`);
      }

      peerConnections.current[peerID] = new RTCPeerConnection({
        iceServers: freeice(),
      });

      peerConnections.current[peerID].onicecandidate = event => {
        if (event.candidate) {
          socket.emit(ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate,
          });
        }
      };

      let tracksNumber = 0;
      peerConnections.current[peerID].ontrack = ({ streams: [remoteStream] }) => {
        tracksNumber++;

        if (tracksNumber === 2) {
          tracksNumber = 0;
          addNewClient(peerID, () => {
            if (peerMediaElements.current[peerID]) {
              peerMediaElements.current[peerID].srcObject = remoteStream;
            } else {
              let settled = false;
              const interval = setInterval(() => {
                if (peerMediaElements.current[peerID]) {
                  peerMediaElements.current[peerID].srcObject = remoteStream;
                  settled = true;
                }

                if (settled) {
                  clearInterval(interval);
                }
              }, 1000);
            }
          });
        }
      };

      localMediaStream.current.getTracks().forEach(track => {
        peerConnections.current[peerID].addTrack(track, localMediaStream.current);
      });

      if (createOffer) {
        const offer = await peerConnections.current[peerID].createOffer();
        await peerConnections.current[peerID].setLocalDescription(offer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: offer,
        });
      }
    }

    socket.on(ACTIONS.ADD_PEER, handleNewPeer);

    return () => {
      socket.off(ACTIONS.ADD_PEER);
    };
  }, [addNewClient]);

  useEffect(() => {
    async function setRemoteMedia({ peerID, sessionDescription: remoteDescription }) {
      await peerConnections.current[peerID]?.setRemoteDescription(
        new RTCSessionDescription(remoteDescription)
      );

      if (remoteDescription.type === 'offer') {
        const answer = await peerConnections.current[peerID].createAnswer();
        await peerConnections.current[peerID].setLocalDescription(answer);

        socket.emit(ACTIONS.RELAY_SDP, {
          peerID,
          sessionDescription: answer,
        });
      }
    }

    socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);

    return () => {
      socket.off(ACTIONS.SESSION_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
      peerConnections.current[peerID]?.addIceCandidate(
        new RTCIceCandidate(iceCandidate)
      );
    });

    return () => {
      socket.off(ACTIONS.ICE_CANDIDATE);
    };
  }, []);

  useEffect(() => {
    const handleRemovePeer = ({ peerID }) => {
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
      }

      delete peerConnections.current[peerID];
      delete peerMediaElements.current[peerID];

      updateClients(list => list.filter(c => c !== peerID));
    };

    socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(ACTIONS.REMOVE_PEER);
    };
  }, [updateClients]);

  useEffect(() => {
    async function startCapture() {
      try {
        localMediaStream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720 },
        });
        addNewClient(LOCAL_VIDEO, () => {
          const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
          if (localVideoElement) {
            localVideoElement.volume = 0;
            localVideoElement.srcObject = localMediaStream.current;
          }
        });
      } catch (error) {
        console.error('Error starting capture:', error.message);
      }
    }
    

    startCapture()
      .then(() => socket.emit(ACTIONS.JOIN, { room: roomID }))
      .catch(e => console.error('Error getting userMedia:', e));

    return () => {
      localMediaStream.current.getTracks().forEach(track => track.stop());
      socket.emit(ACTIONS.LEAVE);
    };
  }, [roomID, addNewClient]);

  const provideMediaRef = useCallback((id, node) => {
    peerMediaElements.current[id] = node;
  }, []);

  return {
    clients,
    provideMediaRef,
    toggleCamera,
    toggleMicrophone,
    shareScreen,
    isScreenShared,
    isCameraEnabled, 
    isMicrophoneEnabled, 
    localMediaStreams,
  };

  async function shareScreen() {
    try {
      if (isScreenShared) {
        const originalStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        const newVideoTrack = originalStream.getVideoTracks()[0];

        clients.forEach((clientID) => {
          const sender = peerConnections.current[clientID]?.getSenders()?.find(
            (s) => s.track.kind === 'video'
          );
          if (sender && originalVideoTrack.current) {
            sender.replaceTrack(originalVideoTrack.current);
          }
        });

        if (localMediaStreams) {
          localMediaStreams.getTracks().forEach(track => track.stop());
        }

        setLocalMediaStreams(null);
        setScreenShared(false);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      originalVideoTrack.current = localMediaStream.current?.getVideoTracks()[0];

      const screenVideoTrack = screenStream.getVideoTracks()[0];

      clients.forEach((clientID) => {
        const sender = peerConnections.current[clientID]?.getSenders()?.find(
          (s) => s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(screenVideoTrack);
        }
      });

      setLocalMediaStreams(screenStream);
      setScreenShared(true);

      screenVideoTrack.onended = () => {
        shareScreen(); 
      };

    } catch (error) {
      console.error('Error sharing screen:', error);
      setScreenShared(false);
    }
  }
}
