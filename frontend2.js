import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  update
} from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { firebaseConfig, AGORA_APP_ID } from "./configuration.js";

// Firebase init
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// DOM references
const callNotification = document.getElementById("callNotification");
const answerCallBtn = document.getElementById("answerCallBtn");
const postContainer = document.getElementById("postContainer");
const voiceInput = document.getElementById("voiceInput");
const imageInput = document.getElementById("imageInput");
const textInput = document.getElementById("textInput");
const postForm = document.getElementById("postForm");

let currentCallCode = null;

// Listen for incoming call
onValue(ref(db, "call"), (snapshot) => {
  const call = snapshot.val();
  if (call && call.status === "ringing" && call.from === "frontend1") {
    currentCallCode = call.code;
    showCallNotification(call.code);
    playRingtone();
  } else {
    hideCallNotification();
    stopRingtone();
  }
});

// Show call notification UI
function showCallNotification(code) {
  callNotification.style.display = "block";
  callNotification.textContent = `Incoming call: ${code}`;
}

// Hide call notification UI
function hideCallNotification() {
  callNotification.style.display = "none";
  callNotification.textContent = "";
}

// Simulate ringtone
let ringtoneAudio = null;
function playRingtone() {
  if (!ringtoneAudio) {
    ringtoneAudio = new Audio("ringtone.mp3"); // You must have this sound file
    ringtoneAudio.loop = true;
  }
  ringtoneAudio.play();
}
function stopRingtone() {
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }
}

// When answer button clicked
answerCallBtn.onclick = () => {
  if (!currentCallCode) return;
  stopRingtone();
  hideCallNotification();

  update(ref(db, "call"), { status: "in_call" });

  startTwoWayCall(currentCallCode);
};

// Dummy function placeholder for starting Agora call
function startTwoWayCall(code) {
  alert(`Starting two-way call with code: ${code}`);
  // Implement Agora SDK voice call logic here

  // Show call interface popup after answering
  showCallInterface();
}

// Call interface popup (basic example)
function showCallInterface() {
  const callPopup = document.createElement("div");
  callPopup.id = "callPopup";
  callPopup.style.position = "fixed";
  callPopup.style.bottom = "10px";
  callPopup.style.right = "10px";
  callPopup.style.padding = "20px";
  callPopup.style.background = "#222";
  callPopup.style.color = "white";
  callPopup.style.borderRadius = "10px";
  callPopup.style.zIndex = 1000;
  callPopup.innerHTML = `
    <h4>Call in progress</h4>
    <button id="endCallBtn">End Call</button>
  `;
  document.body.appendChild(callPopup);

  document.getElementById("endCallBtn").onclick = () => {
    document.body.removeChild(callPopup);
    update(ref(db, "call"), { status: "ended", code: null });
  };
}

// POSTS section (same as frontend1 but without delete/edit)

postForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  const imageFile = imageInput.files[0];
  const voiceFile = voiceInput.files[0];

  const postData = {
    text,
    timestamp: Date.now(),
    likes: 0,
    comments: [],
    from: "frontend2"
  };

  if (imageFile) {
    const imgRef = storageRef(storage, `images/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imgRef, imageFile);
    postData.imageURL = await getDownloadURL(imgRef);
  }

  if (voiceFile) {
    const voiceRef = storageRef(storage, `voices/${Date.now()}_${voiceFile.name}`);
    await uploadBytes(voiceRef, voiceFile);
    postData.voiceURL = await getDownloadURL(voiceRef);
  }

  const postRef = push(ref(db, "posts"));
  await set(postRef, postData);
  postForm.reset();
};

onValue(ref(db, "posts"), (snapshot) => {
  postContainer.innerHTML = "";
  snapshot.forEach((child) => {
    const post = child.val();
    const id = child.key;
    const postEl = document.createElement("div");
    postEl.className = "post";

    const text = post.text ? `<p>${post.text}</p>` : "";
    const img = post.imageURL ? `<img src="${post.imageURL}" width="200" />` : "";
    const voice = post.voiceURL
      ? `<audio controls src="${post.voiceURL}"></audio>` : "";

    const likeBtn = `<button onclick="likePost('${id}')">Like (${post.likes || 0})</button>`;
    const commentForm = `
      <form onsubmit="commentPost(event, '${id}')">
        <input type="text" placeholder="Comment..." required />
        <button type="submit">Comment</button>
      </form>
    `;

    let commentsHTML = "";
    if (post.comments) {
      post.comments.forEach((cmt, idx) => {
        commentsHTML += `<p>${cmt.text} 
        <button onclick="likeComment('${id}', ${idx})">Like (${cmt.likes || 0})</button> 
        <button onclick="replyComment('${id}', ${idx})">Reply</button></p>`;
        if (cmt.replies) {
          cmt.replies.forEach((rep) => {
            commentsHTML += `<p style="margin-left:20px;">↳ ${rep.text}</p>`;
          });
        }
      });
    }

    postEl.innerHTML = `
      ${text}${img}${voice}
      ${likeBtn}
      ${commentForm}
      <div class="comments">${commentsHTML}</div>
    `;

    postContainer.appendChild(postEl);
  });
});

// Like Post
window.likePost = (id) => {
  const postRef = ref(db, `posts/${id}`);
  onValue(postRef, (snap) => {
    const post = snap.val();
    if (post) {
      update(postRef, { likes: (post.likes || 0) + 1 });
    }
  }, { onlyOnce: true });
};

// Comment
window.commentPost = (e, id) => {
  e.preventDefault();
  const input = e.target.querySelector("input");
  const text = input.value;
  onValue(ref(db, `posts/${id}`), (snap) => {
    const post = snap.val();
    if (post) {
      const comments = post.comments || [];
      comments.push({ text, likes: 0, replies: [] });
      update(ref(db, `posts/${id}`), { comments });
      input.value = "";
    }
  }, { onlyOnce: true });
};

// Like comment
window.likeComment = (postId, index) => {
  onValue(ref(db, `posts/${postId}`), (snap) => {
    const post = snap.val();
    if (post && post.comments) {
      post.comments[index].likes = (post.comments[index].likes || 0) + 1;
      update(ref(db, `posts/${postId}`), { comments: post.comments });
    }
  }, { onlyOnce: true });
};

// Reply comment
window.replyComment = (postId, index) => {
  const reply = prompt("Reply:");
  if (reply) {
    onValue(ref(db, `posts/${postId}`), (snap) => {
      const post = snap.val();
      if (post && post.comments) {
        const replies = post.comments[index].replies || [];
        replies.push({ text: reply });
        post.comments[index].replies = replies;
        update(ref(db, `posts/${postId}`), { comments: post.comments });
      }
    }, { onlyOnce: true });
  }
};
