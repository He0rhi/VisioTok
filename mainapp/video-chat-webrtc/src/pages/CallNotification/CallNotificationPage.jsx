import React from 'react';

const CallNotification = ({
  callStatus,
  incomingCall,
  onAcceptCall,
  onRejectCall,
  onCancelCall,
  onEndCall,
  roomId
}) => {
  if (!callStatus) return null;

  return (
    <div className="call-notification">
      {callStatus === 'calling' && (
        <>
          <p>Звонок пользователю...</p>
          <button onClick={() => {
            onCancelCall(roomId);
          }}>Отменить</button>
        </>
      )}

      {callStatus === 'ringing' && incomingCall && (
        <>
          <p>Входящий звонок от {incomingCall.callerName}</p>
          <button onClick={onAcceptCall}>Принять</button>
          <button onClick={onRejectCall}>Отклонить</button>
        </>
      )}

      {callStatus === 'rejected' && (
        <p>Звонок отклонен</p>
      )}

      {callStatus === 'ended' && (
        <p>Звонок завершен</p>
      )}

      {callStatus === 'in-call' && (
        <>
          <p>Идет звонок...</p>
          <button onClick={() => {
            onEndCall(roomId);
          }}>Завершить</button>
        </>
      )}
    </div>
  );
};

export default CallNotification;