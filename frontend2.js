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
      div.style = "border:1px solid #ccc; padding:10px; margin-bottom:10px;";
      div.innerHTML = `
        <p>${post.text || "<i>(No text)</i>"}</p>
        ${post.image ? `<img src="${post.image}" width="200"><br>` : ''}
        ${post.audio ? `<audio controls src="${post.audio}"></audio><br>` : ''}
        <p>${post.likes || 0} Likes <button onclick="likePost('${id}')">Like</button></p>
        <div>
          <h4>Comments</h4>
          <div id="comments_${id}"></div>
          <input type="text" id="commentInput_${id}" placeholder="Add a comment...">
          <button onclick="addComment('${id}')">Comment</button>
        </div>
      `;

      container.appendChild(div);
      renderComments(id, post.comments || {});
    }
  });
}

// Like post - Frontend2 user ID = 'frontend2'
window.likePost = (postId) => {
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
  const comment = document.getElementById(`commentInput_${postId}`).value.trim();
  if (!comment) return alert("Comment cannot be empty.");
  const commentRef = push(ref(db, `posts/${postId}/comments`));
  set(commentRef, { text: comment, likes: 0, replies: {}, likedBy: {} });
  document.getElementById(`commentInput_${postId}`).value = "";
};

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

// Reply input toggle
window.showReplyInput = (postId, commentId) => {
  document.getElementById(`replyInput_${postId}_${commentId}`).style.display = 'block';
};

window.hideReplyInput = (postId, commentId) => {
  document.getElementById(`replyInput_${postId}_${commentId}`).style.display = 'none';
};

window.addReply = (postId, commentId) => {
  const input = document.getElementById(`replyText_${postId}_${commentId}`);
  const text = input.value.trim();
  if (!text) return alert("Reply cannot be empty.");
  const replyRef = push(ref(db, `posts/${postId}/comments/${commentId}/replies`));
  set(replyRef, { text, likes: 0, likedBy: {} });
  input.value = "";
  hideReplyInput(postId, commentId);
};

// Like comment or reply - user id = frontend2
window.likeComment = (postId, commentId, replyId = null) => {
  if (replyId) {
    const replyRef = ref(db, `posts/${postId}/comments/${commentId}/replies/${replyId}`);
    onValue(replyRef, snapshot => {
      const reply = snapshot.val();
      const likedBy = reply.likedBy || {};
      if (!likedBy['frontend2']) {
        update(replyRef, {
          likes: (reply.likes || 0) + 1,
          [`likedBy/frontend2`]: true
        });
      }
    }, { onlyOnce: true });
  } else {
    const commentRef = ref(db, `posts/${postId}/comments/${commentId}`);
    onValue(commentRef, snapshot => {
      const comment = snapshot.val();
      const likedBy = comment.likedBy || {};
      if (!likedBy['frontend2']) {
        update(commentRef, {
          likes: (comment.likes || 0) + 1,
          [`likedBy/frontend2`]: true
        });
      }
    }, { onlyOnce: true });
  }
};

renderPosts();
