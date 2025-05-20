// post.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const createPost = async (text, imageBase64) => {
  const postRef = push(ref(db, 'posts'));
  await set(postRef, {
    text,
    image: imageBase64 || "",
    timestamp: Date.now(),
    likes: 0,
    comments: {}
  });
};

export const loadPosts = (callback) => {
  const postsRef = ref(db, 'posts');
  onValue(postsRef, (snapshot) => {
    const posts = snapshot.val() || {};
    const now = Date.now();
    const validPosts = {};

    for (let id in posts) {
      if (now - posts[id].timestamp < 86400000) { // 24 hours
        validPosts[id] = posts[id];
      } else {
        remove(ref(db, 'posts/' + id)); // auto delete
      }
    }
    callback(validPosts);
  });
};

export const addComment = async (postId, comment) => {
  const commentRef = push(ref(db, `posts/${postId}/comments`));
  await set(commentRef, {
    text: comment,
    time: Date.now()
  });
};

export const likePost = async (postId) => {
  const postRef = ref(db, `posts/${postId}`);
  onValue(postRef, (snapshot) => {
    const post = snapshot.val();
    if (post) {
      update(postRef, { likes: (post.likes || 0) + 1 });
    }
  }, { onlyOnce: true });
};
