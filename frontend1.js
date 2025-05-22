import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  remove,
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
const callBtn = document.getElementById("callBtn");
const postForm = document.getElementById("postForm");
const postContainer = document.getElementById("postContainer");
const voiceInput = document.getElementById("voiceInput");
const imageInput = document.getElementById("imageInput");
const textInput = document.getElementById("textInput");

// Call
callBtn.onclick = () => {
  const callCode = Math.floor(100000 + Math.random() * 900000).toString();
  set(ref(db, "call"), {
    code: callCode,
    status: "ringing",
    from: "frontend1",
    timestamp: Date.now()
  });
};

// Post
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
    from: "frontend1"
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

// Display Posts
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

    const controls = post.from === "frontend1"
      ? `<button onclick="editPost('${id}')">Edit</button>
         <button onclick="deletePost('${id}')">Delete</button>`
      : "";

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
      ${likeBtn}${controls}
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

// Delete Post
window.deletePost = (id) => {
  remove(ref(db, `posts/${id}`));
};

// Edit Post (just text)
window.editPost = (id) => {
  const newText = prompt("Edit your post text:");
  if (newText) {
    update(ref(db, `posts/${id}`), { text: newText });
  }
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
