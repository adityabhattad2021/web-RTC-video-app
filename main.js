let localStream;
let remoteStream;
let peerConnection;

const appId = '7bdff49e6e934f0e8eaa10147e224b87';

let token = null;
let userId = String(Math.floor(Math.random() * 1000000001));

let client;
let channel; 

let urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');

if(!roomId){
  window.location = 'lobby.html';
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.1.google.com.19302', 'stun:stun2.1.google.com.19302'],
    },
  ],
};

let init = async () => {
  client = await AgoraRTM.createInstance(appId);
  await client.login({ uid: userId,token });
  channel = client.createChannel(roomId);
  await channel.join();

  channel.on('MemberJoined',handleUserJoined);

  channel.on('MemberLeft',handleUserLeft);

  client.on('MessageFromPeer',handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById('user-1').srcObject = localStream;
};

let handleUserLeft  = (MemberId) => {
  console.log('User Left: ',MemberId);
  document.getElementById('user-2').style.display = 'none';
}

let handleMessageFromPeer = async (message, peerId) => {
  message = JSON.parse(message.text);

  if(message.type==='offer'){
    createAnswer(peerId,message.offer);
  }

  if(message.type==='answer'){
    addAnswer(message.answer);
  }

  if(message.type==='candidate'){
    if(peerConnection){
      peerConnection.addIceCandidate(message.candidate);
    }
  }
}

let handleUserJoined = async (MemberId) => { 
  console.log('User Joined: ',MemberId);
  createOffer(MemberId)
};

let createPeerConnection = async (MemberId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();
  document.getElementById('user-2').srcObject = remoteStream
  document.getElementById('user-2').style.display = 'block'

  document.getElementById('user-1').classList.add('smallFrame')

  if(!localStream){
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById('user-1').srcObject = localStream;
  }

  localStream.getTracks().forEach((track)=>{
    peerConnection.addTrack(track,localStream);
  })

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track)=>{
        remoteStream.addTrack(track);
    })
  }

  peerConnection.onicecandidate = async (event)=>{
    if(event.candidate){
      client.sendMessageToPeer({
        text: JSON.stringify({
          type:'candidate',
          candidate:event.candidate
        }),
        },
        MemberId,
      )
    }
  }
}

let createOffer = async (MemberId) => {
  await createPeerConnection(MemberId);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer({
    text: JSON.stringify({
      type:'offer',
      offer:offer
    }),
    },
    MemberId,
  )
};

let createAnswer = async (MemberId, offer) => {
  await createPeerConnection(MemberId);

  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  } catch (error) {
    console.error('Error setting remote description:', error);
    return;
  }

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer({
    text: JSON.stringify({ type: 'answer', answer: answer }),
  }, MemberId);
}

let addAnswer = async (answer) => {
 if(!peerConnection.currentRemoteDescription){
   peerConnection.setRemoteDescription(answer);
 }
}

let leaveChannel = async ()=>{
  await channel.leave();
  await client.logout();
}

let toggleCamera = async ()=>{
  let videoTrack = localStream.getTracks().find((track)=>track.kind==='video');
  videoTrack.enabled = !videoTrack.enabled;
}

let toggleMic = async ()=>{
  let audioTrack = localStream.getTracks().find((track)=>track.kind==='audio');
  audioTrack.enabled = !audioTrack.enabled;
}

window.addEventListener('beforeunload',leaveChannel);

document.getElementById('camera-btn').addEventListener('click',toggleCamera);
document.getElementById('mic-btn').addEventListener('click',toggleMic);

init();
