import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { firebaseConfig, agoraAppId } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let audioData = "";
let recorder;
let audioChunks = [];

window.submitPost = async () => {
  const text = document.getElementById("postText").value;
  const imageFile = document.getElementById("postImage").files[0];
  const audioFile = document.getElementById("postAudio").files[0];

  const postId = push(ref(db, 'posts')).key;
  const postRef = ref(db, 'posts/' + postId);
  const timestamp = Date.now();

  let imgBase64 = "";
  if (imageFile) imgBase64 = await getBase64(imageFile);

  let audioBase64 = audioData;
  if (!audioBase64 && audioFile) {
    audioBase64 = await getBase64(audioFile);
  }

  await set(postRef, {
    text,
    image: imgBase64,
    audio: audioBase64,
    timestamp,
    likes: 0,
    likedBy: {},
    comments: {}
  });

  // Reset form
  document.getElementById("postText").value = "";
  document.getElementById("postImage").value = "";
  document.getElementById("postAudio").value = "";
  audioData = "";
  document.getElementById("audioPreview").style.display = "none";
  document.getElementById("deleteRecordingBtn").style.display = "none";
};

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

window.startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recorder = new MediaRecorder(stream);
  audioChunks = [];

  recorder.ondataavailable = e => audioChunks.push(e.data);
  recorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
    const reader = new FileReader();
    reader.onloadend = () => {
      audioData = reader.result;
      const audioPreview = document.getElementById("audioPreview");
      audioPreview.src = audioData;
      audioPreview.style.display = "block";
      document.getElementById("deleteRecordingBtn").style.display = "inline";
    };
    reader.readAsDataURL(audioBlob);
  };
  recorder.start();
  document.getElementById("recordingStatus").innerText = "Recording...";
};

window.stopRecording = () => {
  recorder?.stop();
  document.getElementById("recordingStatus").innerText = "";
};

window.deleteRecording = () => {
  audioData = "";
  document.getElementById("audioPreview").style.display = "none";
  document.getElementById("deleteRecordingBtn").style.display = "none";
};

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
    const postList = document.getElementById('postList');
    postList.innerHTML = '';

    for (let key in posts) {
      const post = posts[key];
      if (now - post.timestamp > 86400000) {
        remove(ref(db, 'posts/' + key));
        continue;
      }

      const div = document.createElement('div');
      div.innerHTML = `
        <p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" width="200">` : ''}
        ${post.audio ? `<audio controls src="${post.audio}"></audio>` : ''}
        <p>${post.likes} likes</p>
        <button onclick="editPost('${key}')">Edit</button>
        <button onclick="deletePost('${key}')">Delete</button>
        <div id="comments_${key}"></div>
        <input type="text" id="comment_${key}" placeholder="Add a comment">
        <button onclick="addComment('${key}')">Comment</button>
      `;
      postList.appendChild(div);

      // Render comments
      if (post.comments) {
        const commentsDiv = document.getElementById(`comments_${key}`);
        for (let commentId in post.comments) {
          const comment = post.comments[commentId];
          const commentDiv = document.createElement('div');
          commentDiv.innerHTML = `
            <p>${comment.text}</p>
            <button onclick="likeComment('${key}', '${commentId}')">Like (${comment.likes || 0})</button>
            <input type="text" id="reply_${commentId}" placeholder="Reply">
            <button onclick="addReply('${key}', '${commentId}')">Reply</button>
            <div id="replies_${commentId}"></div>
          `;
          commentsDiv.appendChild(commentDiv);

          // Render replies
          if (comment.replies) {
            const repliesDiv = document.getElementById(`replies_${commentId}`);
            for (let replyId in comment.replies) {
              const reply = comment.replies[replyId];
              const replyDiv = document.createElement('div');
              replyDiv.innerHTML = `<p>${reply.text}</p>`;
              repliesDiv.appendChild(replyDiv);
            }
          }
        }
      }
    }
  });
}

window.editPost = (postId) => {
  const postRef = ref(db, 'posts/' + postId);
  onValue(postRef, snapshot => {
    const post = snapshot.val();
    const newText = prompt("Edit your post:", post.text);
    if (newText !== null) {
      update(postRef, { text: newText });
    }
  }, { onlyOnce: true });
};

window.deletePost = (postId) => {
  if (confirm("Are you sure you want to delete this post?")) {
    remove(ref(db, 'posts/' + postId));
  }
};

window.addComment = (postId) => {
  const commentText = document.getElementById(`comment_${postId}`).value;
  const commentRef = push(ref(db, `posts/${postId}/comments`));
  set(commentRef, { text: commentText, likes: 0, replies: {} });
  document.getElementById(`comment_${postId}`).value = "";
};

window.likeComment = (postId, commentId) => {
  const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
  onValue(commentRef, snapshot => {
    const comment = snapshot.val();
    update(commentRef, { likes: (comment.likes || 0) + 1 });
  }, { onlyOnce: true });
};

window.addReply = (postId, commentId) => {
  const replyText = document.getElementById(`reply_${commentId}`).value;
  const replyRef = push(ref(db, `posts/${postId}/comments/${commentId}/replies`));
  set(replyRef, { text: replyText });
  document.getElementById(`reply_${commentId}`).value = "";
};

renderPosts();
