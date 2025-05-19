import { db, ref, set, onValue, update } from './firebase-config.js';

const appId = "974f4c7b124940a1a6ee5e526175118d";
const channel = "testChannel";
let coins = 100;
let localTracks = [], remoteUsers = {};

const uid = Math.floor(Math.random() * 10000);
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

// Identify frontend
const isFrontend1 = window.location.pathname.includes("frontend1");

// Firebase signaling path
const callRef = ref(db, "calls/testChannel");

if (isFrontend1) {
  document.getElementById("callBtn").onclick = async () => {
    await set(callRef, { status: "incoming", caller: uid, coins });
  };
} else {
  // Listen for incoming call
  onValue(callRef, async (snapshot) => {
    const data = snapshot.val();
    if (data && data.status === "incoming") {
      notifyUser();
      document.getElementById("ringtone").play();
      setTimeout(() => acceptCall(data.caller), 5000); // Auto accept for test
    }
  });
}

async function acceptCall(callerId) {
  document.getElementById("ringtone").pause();
  await set(callRef, { status: "accepted", caller: callerId, receiver: uid, coins });

  joinCall();
}

async function joinCall() {
  await client.join(appId, channel, null, uid);
  localTracks[0] = await AgoraRTC.createMicrophoneAudioTrack();
  await client.publish([localTracks[0]]);

  client.on("user-published", async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === "audio") {
      user.audioTrack.play();
    }
  });

  if (isFrontend1) {
    // Deduct coins per second and update Firebase
    setInterval(() => {
      coins--;
      update(callRef, { coins });
    }, 1000);
  } else {
    // Display coins received from frontend1
    onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.coins !== undefined) {
        document.getElementById("coinDisplay").innerText = "Coins left: " + data.coins;
      }
    });
  }
}

function notifyUser() {
  if (Notification.permission === "granted") {
    new Notification("Incoming Call", { body: "You have a new call!", icon: "https://cdn-icons-png.flaticon.com/512/597/597177.png" });
  } else {
    Notification.requestPermission();
  }
}
