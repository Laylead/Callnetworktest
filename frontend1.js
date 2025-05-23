import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { firebaseConfig, agoraAppId } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let audioData = "";
let recorder, audioChunks = [];
let editingPostId = null; // track if editing

// Submit new post or update existing post
window.submitPost = async () => {
  const text = document.getElementById("postText").value.trim();
  if (!text && !audioData && !document.getElementById("postImage").files[0]) {
    alert("Please add text, image, or audio.");
    return;
  }

  const imageFile = document.getElementById("postImage").files[0];
  let imgBase64 = "";
  if (imageFile) imgBase64 = await getBase64(imageFile);

  const audioBase64 = audioData || (document.getElementById("postAudio").files[0] ? await getBase64(document.getElementById("postAudio").files[0]) : "");

  if (editingPostId) {
    // Update post text only (no image/audio change on edit)
    const postRef = ref(db, 'posts/' + editingPostId);
    await update(postRef, { text });
    editingPostId = null;
  } else {
    // Create new post
    const postId = push(ref(db, 'posts')).key;
    const postRef = ref(db, 'posts/' + postId);
    const timestamp = Date.now();
    await set(postRef, {
      text, image: imgBase64, audio: audioBase64, timestamp,
      likes: 0, likedBy: {}, comments: {}
    });
  }

  resetPostForm();
};

// Helper: reset post form inputs and voice note UI
function resetPostForm() {
  document.getElementById("postText").value = "";
  document.getElementById("postImage").value = "";
  document.getElementById("postAudio").value = "";
  audioData = "";
  editingPostId = null;

  document.getElementById("voiceNotePreview").style.display = "none";
  document.getElementById("audioPreview").src = "";

  // Reset buttons for voice recording
  document.getElementById("recordBtn").disabled = false;
  document.getElementById("stopBtn").disabled = true;
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

// Voice recording handlers
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
      showVoiceNotePreview(audioData);
    };
    reader.readAsDataURL(audioBlob);
  };

  recorder.start();
  document.getElementById("recordBtn").disabled = true;
  document.getElementById("stopBtn").disabled = false;
};

// Show voice note preview UI
function showVoiceNotePreview(dataUrl) {
  const previewDiv = document.getElementById("voiceNotePreview");
  const audioPreview = document.getElementById("audioPreview");
  audioPreview.src = dataUrl;
  previewDiv.style.display = "block";

  // Disable post audio input because we're using recorded audio
  document.getElementById("postAudio").value = "";
}

// Stop recording
window.stopRecording = () => {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    document.getElementById("recordBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;
  }
};

// Send recorded voice note as a post
window.sendVoiceNote = () => {
  if (!audioData) return alert("No voice note recorded.");

  const postId = push(ref(db, 'posts')).key;
  const postRef = ref(db, 'posts/' + postId);
  const timestamp = Date.now();

  set(postRef, {
    text: "",
    image: "",
    audio: audioData,
    timestamp,
    likes: 0,
    likedBy: {},
    comments: {}
  }).then(() => {
    resetPostForm();
  });
};

// Delete voice note (before sending)
window.deleteVoiceNote = () => {
  audioData = "";
  resetPostForm();
};

// Render posts with edit, delete, likes, comments, and replies
function renderPosts() {
  const postRef = ref(db, 'posts');
  onValue(postRef, snapshot => {
    const posts = snapshot.val() || {};
    const now = Date.now();
    const container = document.getElementById('postList');
    container.innerHTML = '';

    for (let key in posts) {
      const post = posts[key];
      if (now - post.timestamp > 86400000) {
        remove(ref(db, 'posts/' + key));
        continue;
      }

      const div = document.createElement('div');
      div.style = "border:1px solid #ccc; padding:10px; margin-bottom:10px;";

      // Editable text or static text
      const textContent = editingPostId === key
        ? `<textarea id="editText_${key}" style="width:100%;">${post.text}</textarea>
           <button onclick="saveEdit('${key}')">Save</button>
           <button onclick="cancelEdit()">Cancel</button>`
        : `<p>${post.text || "<i>(No text)</i>"}</p>`;

      div.innerHTML = `
        ${textContent}
        ${post.image ? `<img src="${post.image}" width="200"><br>` : ''}
        ${post.audio ? `<audio controls src="${post.audio}"></audio><br>` : ''}
        <p>
          ${post.likes} likes 
          <button onclick="likePost('${key}')">Like</button>
          <button onclick="startEdit('${key}')">Edit</button>
          <button onclick="deletePost('${key}')">Delete</button>
        </p>
        <div>
          <h4>Comments</h4>
          <div id="comments_${key}"></div>
          <input type="text" id="commentInput_${key}" placeholder="Add a comment...">
          <button onclick="addComment('${key}')">Comment</button>
        </div>
      `;

      container.appendChild(div);

      renderComments(key, post.comments || {});
    }
  });
}

// Edit post handlers
window.startEdit = (postId) => {
  editingPostId = postId;
  renderPosts();
};

window.cancelEdit = () => {
  editingPostId = null;
  renderPosts();
};

window.saveEdit = (postId) => {
  const newText = document.getElementById(`editText_${postId}`).value.trim();
  if (!newText) {
    alert("Text cannot be empty.");
    return;
  }
  update(ref(db, 'posts/' + postId), { text: newText });
  editingPostId = null;
};

// Delete post
window.deletePost = (postId) => {
  if (confirm("Are you sure you want to delete this post?")) {
    remove(ref(db, 'posts/' + postId));
  }
};

// Like post - Frontend1 user ID = 'frontend1'
window.likePost = (postId) => {
  const postRef = ref(db, `posts/${postId}`);
  onValue(postRef, snapshot => {
    const post = snapshot.val();
    const likedBy = post.likedBy || {};
    if (!likedBy['frontend1']) {
      update(postRef, {
        likes: (post.likes || 0) + 1,
        [`likedBy/frontend1`]: true
      });
    }
  }, { onlyOnce: true });
};

// Comments rendering with replies and likes (both frontends can like/reply)
function renderComments(postId, comments) {
  const container = document.getElementById(`comments_${postId}`);
  container.innerHTML = '';

  for (const commentId in comments) {
    const c = comments[commentId];
    const repliesHtml = (c.replies ? Object.entries(c.replies).map(([rid, r]) => `
      <div style="margin-left:20px; border-left:1px solid #ccc; padding-left:10px;">
        <p>${r.text}</p>
        <p>
          Likes: ${r.likes || 0} 
          <button onclick="likeComment('${postId}','${commentId}','${rid}')">Like</button>
        </p>
      </div>`).join('') : '');

    container.innerHTML += `
      <div style="border-bottom:1px solid #ddd; margin-bottom:5px;">
        <p>${c.text}</p>
        <p>
          Likes: ${c.likes || 0} 
          <button onclick="likeComment('${postId}','${commentId}')">Like</button>
          <button onclick="showReplyInput('${postId}','${commentId}')">Reply</button>
        </p>
        <div id="replyInput_${postId}_${commentId}" style="display:none; margin-left:20px;">
          <input type="text" id="replyText_${postId}_${commentId}" placeholder="Write a reply...">
          <button onclick="addReply('${postId}','${commentId}')">Send Reply</button>
          <button onclick="hideReplyInput('${postId}','${commentId}')">Cancel</button>
        </div>
        ${repliesHtml}
      </div>
    `;
  }
}

// Comment operations
window.addComment = (postId) => {
  const input = document.getElementById(`commentInput_${postId}`);
  const text = input.value.trim();
  if (!text) return alert("Comment cannot be empty.");
  const commentRef = push(ref(db, `posts/${postId}/comments`));
  set(commentRef, { text, likes: 0, replies: {} });
  input.value = "";
};

window.likeComment = (postId, commentId, replyId = null) => {
  if (replyId) {
    // Like a reply
    const replyRef = ref(db, `posts/${postId}/comments/${commentId}/replies/${replyId}`);
    onValue(replyRef, snapshot => {
      const reply = snapshot.val();
      const likedBy = reply.likedBy || {};
      if (!likedBy['frontend1']) {
        update(replyRef, {
          likes: (reply.likes || 0) + 1,
          [`likedBy/frontend1`]: true
        });
      }
    }, { onlyOnce: true });
  } else {
    // Like a comment
    const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
    onValue(commentRef, snapshot => {
      const comment = snapshot.val();
      const likedBy = comment.likedBy || {};
      if (!likedBy['frontend1']) {
        update(commentRef, {
          likes: (comment.likes || 0) + 1,
          [`likedBy/frontend1`]: true
        });
      }
    }, { onlyOnce: true });
  }
};

// Reply input toggling
window.showReplyInput = (postId, commentId) => {
  document.getElementById(`replyInput_${postId}_${commentId}`).style.display = 'block';
};

window.hideReplyInput = (postId, commentId) => {
  document.getElementById(`replyInput_${postId}_${commentId}`).style.display = 'none';
};

// Add reply to comment
window.addReply = (postId, commentId) => {
  const input = document.getElementById(`replyText_${postId}_${commentId}`);
  const text = input.value.trim();
  if (!text) return alert("Reply cannot be empty.");
  const replyRef = push(ref(db, `posts/${postId}/comments/${commentId}/replies`));
  set(replyRef, { text, likes: 0, likedBy: {} });
  input.value = "";
  hideReplyInput(postId, commentId);
};

renderPosts();
