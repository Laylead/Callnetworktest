import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, update, push, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const callRef = ref(db, 'calls/current');
onValue(callRef, snapshot => {
  const data = snapshot.val();
  if (data && Date.now() - data.timestamp < 30000) {
    showCallPopup(data.token);
  }
});

function showCallPopup(token) {
  const div = document.getElementById("callNotification");
  div.innerHTML = `<p>Incoming Call</p><button onclick="answerCall('${token}')">Answer</button>`;
}

window.answerCall = (token) => {
  alert('Call started with token: ' + token);
  // Initialize Agora voice call here
};

function renderPosts() {
  const postsRef = ref(db, 'posts');
  onValue(postsRef, snapshot => {
    const posts = snapshot.val() || {};
    const now = Date.now();
    const container = document.getElementById('postList');
    container.innerHTML = '';

    for (let id in posts) {
      const post = posts[id];
      if (now - post.timestamp > 86400000) continue;

      const div = document.createElement('div');
      div.innerHTML = `
        <p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" width="200">` : ''}
        ${post.audio ? `<audio controls src="${post.audio}"></audio>` : ''}
        <p>${post.likes || 0} Likes <button onclick="likePost('${id}')">Like</button></p>
        <input type="text" id="comment_${id}" placeholder="Comment...">
        <button onclick="addComment('${id}')">Comment</button>
        <ul>${post.comments ? Object.values(post.comments).map(c => `<li>${c.text}</li>`).join('') : ''}</ul>
      `;
      container.appendChild(div);
    }
  });
}

window.likePost = async (postId) => {
  const postRef = ref(db, `posts/${postId}`);
  onValue(postRef, snapshot => {
    const post = snapshot.val();
    const likedBy = post.likedBy || {};
    if (!likedBy['frontend2']) {
      update(postRef, {
        likes: (post.likes || 0) + 1,
        [`likedBy/frontend2`]: true
      });
    }
  }, { onlyOnce: true });
};

window.addComment = (postId) => {
  const comment = document.getElementById(`comment_${postId}`).value;
  const commentRef = push(ref(db, `posts/${postId}/comments`));
  set(commentRef, { text: comment });
};

renderPosts();
