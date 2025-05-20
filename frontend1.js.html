import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { firebaseConfig, agoraAppId } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let audioData = "";

window.submitPost = async () => {
  const text = document.getElementById("postText").value;
  const image = document.getElementById("postImage").files[0];
  const audio = audioData || await getBase64(document.getElementById("postAudio").files[0]);

  const postId = push(ref(db, 'posts')).key;
  const postRef = ref(db, 'posts/' + postId);
  const timestamp = Date.now();

  let imgBase64 = "";
  if (image) imgBase64 = await getBase64(image);

  await set(postRef, {
    text, image: imgBase64, audio, timestamp,
    likes: 0, likedBy: {}, comments: {}
  });
};

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

let recorder, audioChunks = [];

window.startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  audioChunks = [];

  recorder.ondataavailable = e => audioChunks.push(e.data);
  recorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    const reader = new FileReader();
    reader.onloadend = () => audioData = reader.result;
    reader.readAsDataURL(audioBlob);
  };
  recorder.start();
};

window.stopRecording = () => recorder?.stop();

window.makeCall = () => {
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const callRef = ref(db, 'calls/current');
  set(callRef, { token, from: 'frontend1', timestamp: Date.now() });
  alert('Call sent, token: ' + token);
};

function renderPosts() {
  const postRef = ref(db, 'posts');
  onValue(postRef, snapshot => {
    const posts = snapshot.val() || {};
    const now = Date.now();
    document.getElementById('postList').innerHTML = '';

    for (let key in posts) {
      const post = posts[key];
      if (now - post.timestamp > 86400000) {
        remove(ref(db, 'posts/' + key));
        continue;
      }
      const div = document.createElement('div');
      div.innerHTML = `<p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" width="200">` : ''}
        ${post.audio ? `<audio controls src="${post.audio}"></audio>` : ''}
        <p>${post.likes} likes</p>`;
      document.getElementById('postList').appendChild(div);
    }
  });
}

renderPosts();
