
const socket = io();
const roomId = window.location.pathname.split("/").pop();
const video = document.getElementById("videoPlayer");
const videoInput = document.getElementById("videoInput");
const modeSelect = document.getElementById("modeSelect");
const webcam = document.getElementById("webcam");
const webcamContainer = document.getElementById("webcamContainer");

let mode = "local";
let isHost = true;

socket.emit("join-room", roomId);

modeSelect.onchange = () => {
  mode = modeSelect.value;
};

document.getElementById("toggleCam").onclick = async () => {
  if (webcamContainer.style.display === "none") {
    webcamContainer.style.display = "block";
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcam.srcObject = stream;
  } else {
    webcamContainer.style.display = "none";
    let tracks = webcam.srcObject.getTracks();
    tracks.forEach(t => t.stop());
    webcam.srcObject = null;
  }
};

videoInput.onchange = async () => {
  const file = videoInput.files[0];
  if (!file) return;

  if (mode === "local") {
    video.src = URL.createObjectURL(file);
  } else {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch("/upload", { method: "POST", body: formData });
    const { url } = await res.json();
    video.src = url;
    socket.emit("sync", { room: roomId, type: "src", src: url });
  }
};

video.onplay = () => socket.emit("sync", { room: roomId, type: "play" });
video.onpause = () => socket.emit("sync", { room: roomId, type: "pause" });
video.ontimeupdate = () => socket.emit("sync", { room: roomId, type: "seek", time: video.currentTime });

socket.on("sync", data => {
  if (isHost) return;
  switch (data.type) {
    case "src":
      video.src = data.src;
      break;
    case "play":
      video.play();
      break;
    case "pause":
      video.pause();
      break;
    case "seek":
      video.currentTime = data.time;
      break;
  }
});
