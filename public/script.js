const socket = io();
const peers = {};
let localStream;

const video = document.getElementById("video");
const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const toggleMic = document.getElementById("toggleMic");
const fileInput = document.getElementById("fileInput");
const roomDisplay = document.getElementById("roomDisplay");

// Room join UI logic
const home = document.getElementById("home");
const app = document.getElementById("app");
const createBtn = document.getElementById("createRoom");
const joinBtn = document.getElementById("joinRoomBtn");
const joinInput = document.getElementById("joinInput");

createBtn.onclick = () => {
  const room = Math.random().toString(36).substr(2, 6);
  window.location.href = `/room/${room}`;
};

joinBtn.onclick = () => {
  const room = joinInput.value.trim();
  if (room) window.location.href = `/room/${room}`;
};

const match = window.location.pathname.match(/^\/room\/(\w+)$/);
if (match) {
  const roomId = match[1];
  home.style.display = "none";
  app.style.display = "block";
  roomDisplay.textContent = roomId;
  initRoom(roomId);
}

function initRoom(roomId) {
  socket.emit("join-room", roomId);

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    localStream = stream;

    socket.on("user-connected", userId => {
      const peer = createPeer(userId, true);
      peers[userId] = peer;
    });

    socket.on("signal", ({ from, signal }) => {
      if (!peers[from]) peers[from] = createPeer(from);
      peers[from].signal(signal);
    });

    socket.on("user-disconnected", userId => {
      if (peers[userId]) {
        peers[userId].destroy();
        delete peers[userId];
      }
    });
  });
}

function createPeer(userId, initiator = false) {
  const peer = new SimplePeer({ initiator, trickle: false, stream: localStream });

  peer.on("signal", signal => {
    socket.emit("signal", { to: userId, signal });
  });

  peer.on("stream", remoteStream => {
    const audio = document.createElement("audio");
    audio.srcObject = remoteStream;
    audio.autoplay = true;
    document.body.appendChild(audio);
  });

  return peer;
}

// Video playback sync (host only)
playBtn.onclick = () => {
  video.play();
  socket.emit("signal", { to: "all", signal: { type: "play" } });
};

pauseBtn.onclick = () => {
  video.pause();
  socket.emit("signal", { to: "all", signal: { type: "pause" } });
};

socket.on("signal", ({ signal }) => {
  if (signal.type === "play") video.play();
  if (signal.type === "pause") video.pause();
});

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    video.src = URL.createObjectURL(file);
  }
};

toggleMic.onclick = () => {
  if (localStream) {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
    toggleMic.textContent = localStream.getAudioTracks()[0].enabled ? "🎙️ Mic ON" : "🔇 Mic OFF";
  }
};
