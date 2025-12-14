


// Import the functions you need from the SDKs you need
/************* FIREBASE v9 (CDN) *************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-eCvymozw-3l7JJYYmH1lIinQrkKiYzs",
  authDomain: "eco-companion-94ec5.firebaseapp.com",
  projectId: "eco-companion-94ec5",
  storageBucket: "eco-companion-94ec5.appspot.com",
  messagingSenderId: "542958979382",
  appId: "1:542958979382:web:1b7c441cb6b92adbbc0b97",
  measurementId: "G-ENB5D1JV79"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


class EcoCompanion {
   constructor() {
    this.video = document.getElementById('video');
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.model = null;

    // Default values
    this.carbonScore = 42;
    this.streak = 5;
    this.userId = localStorage.getItem("ecoUser") || null;
    this.leaderboardInterval = null;

    // ✅ LOAD SAVED PROGRESS
    const saved = JSON.parse(localStorage.getItem("ecoProgress"));
    if (saved) {
        this.carbonScore = saved.carbonScore;
        this.streak = saved.streak;
    }

    // Initialize app
    this.init();
}


   async init() {
    this.initUserName();
    await this.initFirebaseUser();  
     this.initDailyChallenge();
     this.initCertificate();
    await this.loadModel();
    this.bindEvents();
    this.updateUI();
    this.initProfile();
    this.startLeaderboardUpdates();
    console.log('🌿 Eco-Companion Ready!');
  }


    async loadModel() {
  try {
    console.log("⏳ Loading AI model...");
    this.model = await cocoSsd.load();
    console.log("🤖 AI Waste Detection Model Loaded!");
  } catch (error) {
    console.error("❌ Model load failed:", error);
    document.getElementById("scanStatus").textContent =
      "❌ AI model failed to load";
  }
}


    bindEvents() {
        document.getElementById('scanBtn').addEventListener('click', () => {
            const scanner = document.getElementById('scannerSection');
            scanner.classList.toggle('hidden');
            if (!scanner.classList.contains('hidden')) {
                this.setupCamera();
            }
        });
    }

  async setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" } // ✅ FIX
    });

    this.video.srcObject = stream;
    await this.video.play();

    this.video.onloadedmetadata = () => {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.detectLoop();
    };

  } catch (err) {
    console.error("Camera error:", err);
    document.getElementById("scanStatus").textContent =
      "❌ Camera blocked. Allow camera & reload.";
  }
}


    detectLoop() {
        if (this.video.readyState === 4 && this.model) {
            this.ctx.drawImage(this.video, 0, 0);
            this.model.detect(this.video).then(predictions => {
                const waste = this.classifyWaste(predictions);
                this.updateDetection(waste);
            });
        }
        requestAnimationFrame(() => this.detectLoop());
    }

    classifyWaste(predictions) {
        const wasteTypes = {
            plastic: ['bottle', 'cup', 'container', 'plastic', 'bag'],
            paper: ['paper', 'cardboard', 'book', 'box'],
            organic: ['food', 'apple', 'banana', 'vegetable', 'fruit'],
            metal: ['can', 'tin']
        };

        for (let [type, keywords] of Object.entries(wasteTypes)) {
            if (predictions.some(p => 
                keywords.some(k => p.class.toLowerCase().includes(k)) && p.score > 0.4
            )) {
                return { 
                    type, 
                    action: this.getAction(type), 
                    points: this.getPoints(type)
                };
            }
        }
        return { type: 'clean', action: 'Great! Keep it green 🌳', points: 0 };
    }

    getAction(type) {
        const actions = {
            plastic: '♻️ Blue recycling bin nearby!',
            paper: '📄 Paper bin - right ahead!',
            organic: '🍂 Compost drop-off point!',
            metal: '🔧 Metal recycling station!'
        };
        return actions[type] || 'Excellent scan!';
    }

    getPoints(type) {
        const points = { plastic: 15, paper: 12, organic: 10, metal: 18 };
        return points[type] || 0;
    }

    updateDetection(result) {
        const wasteTypeEl = document.getElementById('wasteType');
        const actionEl = document.getElementById('action');
        const pointsEl = document.getElementById('pointsEarned');
        const statusEl = document.getElementById('scanStatus');

        if (result.points > 0) {
            wasteTypeEl.textContent = `🗑️ ${result.type.toUpperCase()} DETECTED`;
            wasteTypeEl.classList.remove('hidden');
            actionEl.textContent = result.action;
            actionEl.classList.remove('hidden');
            pointsEl.textContent = `+${result.points} points!`;
            pointsEl.classList.remove('hidden');
            
            this.carbonScore = Math.max(0, this.carbonScore - result.points);
            this.streak++;
            this.updateUI();
            this.saveScore();
            this.saveProgress();
        } else {
            statusEl.textContent = '✅ Area clean - Keep walking!';
            wasteTypeEl.classList.add('hidden');
            actionEl.classList.add('hidden');
            pointsEl.classList.add('hidden');
        }
    }

    updateUI() {
        document.getElementById('carbonScore').textContent = `${this.carbonScore}g`;
        document.getElementById('streak').textContent = this.streak; 
           this.updateBadges();
            this.updateImpactSummary();
    }
    updateBadges() {
    const bronze = document.getElementById("badgeBronze");
    const silver = document.getElementById("badgeSilver");
    const gold = document.getElementById("badgeGold");
    const text = document.getElementById("badgeText");

    if (!bronze || !silver || !gold || !text) return;

    const points = 42 - this.carbonScore;

    if (points >= 50 && bronze.classList.contains("opacity-30")) {
        bronze.classList.remove("opacity-30");
        this.launchConfetti(20);
        text.textContent = "🥉 Bronze Eco Starter!";
    }

    if (points >= 100 && silver.classList.contains("opacity-30")) {
        silver.classList.remove("opacity-30");
        this.launchConfetti(35);
        text.textContent = "🥈 Silver Eco Hero!";
    }

    if (points >= 200 && gold.classList.contains("opacity-30")) {
        gold.classList.remove("opacity-30");
        this.launchConfetti(60);
        text.textContent = "🥇 Gold Eco Champion!";
    }
}
   initProfile() {
    const btn = document.getElementById("profileBtn");
    const modal = document.getElementById("profileModal");

    if (!btn || !modal) return;

    btn.addEventListener("click", () => {
        document.getElementById("profileName").textContent = this.userId;
        document.getElementById("profileStreak").textContent = this.streak;
        document.getElementById("profileCO2").textContent = (42 - this.carbonScore) * 10;

        let badge = "Bronze";
        if (42 - this.carbonScore >= 200) badge = "Gold";
        else if (42 - this.carbonScore >= 100) badge = "Silver";

        document.getElementById("profileBadge").textContent = `🏅 ${badge} Badge`;
        modal.classList.remove("hidden");
    });

    document.getElementById("closeProfile")
        .addEventListener("click", () => modal.classList.add("hidden"));
}   
 updateImpactSummary() {
    const saved = 42 - this.carbonScore; // total saved points

    document.getElementById("co2Saved").textContent = `${saved * 10} g`;
    document.getElementById("walkEquivalent").textContent = `${(saved * 0.08).toFixed(1)} km`;
    document.getElementById("treesSaved").textContent = Math.floor(saved / 30);
}

    
    getTodayChallenge() {
    const challenges = [
        "♻️ Recycle one plastic item today",
        "🚶 Walk instead of using a vehicle",
        "💡 Turn off unused lights",
        "🛍️ Avoid single-use plastic today",
        "🚰 Save water during usage"
    ];

    const today = new Date().toDateString();
    const index = today.length % challenges.length;
    return challenges[index];
}
 async initFirebaseUser() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  this.uid = auth.currentUser.uid;

  const ref = doc(db, "users", this.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();
    this.carbonScore = data.carbonScore;
    this.streak = data.streak;
  }
}


initDailyChallenge() {
    const textEl = document.getElementById("challengeText");
    const statusEl = document.getElementById("challengeStatus");

    if (!textEl || !statusEl) return;

    const today = new Date().toDateString();
    const saved = localStorage.getItem("ecoChallenge");

    if (saved === today) {
        statusEl.classList.remove("hidden");
        textEl.textContent = "🎉 You completed today’s eco challenge!";
    } else {
        textEl.textContent = this.getTodayChallenge();
    }
}

completeDailyChallenge() {
    localStorage.setItem("ecoChallenge", new Date().toDateString());
    document.getElementById("challengeStatus").classList.remove("hidden");
}


    async saveScore() {
  if (!this.uid) return;

  await setDoc(doc(db, "leaderboard", this.uid), {
    name: this.userId || "Eco User",
    score: this.carbonScore,
    streak: this.streak,
    updatedAt: serverTimestamp()
  });
}
async fetchLeaderboard() {
  const q = query(
    collection(db, "leaderboard"),
    orderBy("score", "asc"),   // lower CO₂ = better
    limit(10)
  );

  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => doc.data());

  this.updateLeaderboard(data);
  document.getElementById("lastUpdate").textContent =
    new Date().toLocaleTimeString();
}



    updateLeaderboard(data) {
        const lb = document.getElementById('leaderboard');
        lb.innerHTML = data.map((user, i) => `
            <div class="flex justify-between items-center p-4 bg-white/40 backdrop-blur-sm rounded-2xl hover:bg-white/60 transition-all">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mr-4 text-lg font-bold text-gray-900">
                        ${i + 1}
                    </div>
                    <span class="font-bold text-white text-lg">${user.name}</span>
                </div>
                <div class="text-right">
                    <div class="font-black text-2xl text-green-400">${user.score}g</div>
                    <div class="text-white/80">🔥${user.streak}</div>
                </div>
            </div>
        `).join('');
    }

    startLeaderboardUpdates() {
        this.fetchLeaderboard();
        setInterval(() => this.fetchLeaderboard(), 3000);
    }
    //InitUserName()
 initUserName() {
        const modal = document.getElementById("usernameModal");
        const input = document.getElementById("usernameInput");
        const btn = document.getElementById("saveUsernameBtn");

        if (!modal || !input || !btn) {
            console.error("Username modal elements not found");
            return;
        }

        if (this.userId) {
            modal.classList.add("hidden");
            return;
        }

        btn.addEventListener("click", () => {
            const name = input.value.trim();
            if (!name) return;

            this.userId = name;
            localStorage.setItem("ecoUser", name);
            modal.classList.add("hidden");
        });
    }
    initCertificate() {
    const btn = document.getElementById("certificateBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        const name = this.userId || "Eco User";
        const saved = (42 - this.carbonScore) * 10;

        let badge = "Bronze Eco Starter";
        if (42 - this.carbonScore >= 200) badge = "Gold Eco Champion";
        else if (42 - this.carbonScore >= 100) badge = "Silver Eco Hero";

        document.getElementById("certName").textContent = name;
        document.getElementById("certBadge").textContent = badge;
        document.getElementById("certCO2").textContent = saved;
        document.getElementById("certDate").textContent =
            new Date().toDateString();
      
        document.getElementById("certId").textContent =
  "ECO-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        document.getElementById("certQR").src =
  `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${location.href}`;

      
        this.downloadCertificate();
    
    });
}
downloadCertificate() {
    const wrapper = document.getElementById("certificate");
    const cert = document.getElementById("certificateContent");
    if (!wrapper || !cert) return;

    // 1️⃣ Temporarily show certificate
    wrapper.classList.remove("hidden");

    // 2️⃣ Give browser time to render
    setTimeout(() => {
        html2canvas(cert, { scale: 2 }).then(canvas => {
            const link = document.createElement("a");
            link.download = "eco_certificate.png";
            link.href = canvas.toDataURL("image/png");
            link.click();

            // 3️⃣ Hide certificate again
            wrapper.classList.add("hidden");
        });
    }, 200);
}

async saveProgress() {
  localStorage.setItem("ecoProgress", JSON.stringify({
    carbonScore: this.carbonScore,
    streak: this.streak
  }));

  if (!this.uid) return;

  await setDoc(doc(db, "users", this.uid), {
    carbonScore: this.carbonScore,
    streak: this.streak,
    updatedAt: serverTimestamp()
  });
}
launchConfetti(count = 30) {
  const container = document.getElementById("confettiContainer");
  if (!container) return;

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement("div");
    confetti.style.position = "absolute";
    confetti.style.width = "8px";
    confetti.style.height = "8px";
    confetti.style.background =
      ["#22c55e", "#4ade80", "#a7f3d0"][Math.floor(Math.random() * 3)];
    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.top = "-10px";
    confetti.style.opacity = Math.random();
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

    container.appendChild(confetti);

    confetti.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(100vh)" }
      ],
      {
        duration: 2000 + Math.random() * 1000,
        easing: "ease-out"
      }
    );

    setTimeout(() => confetti.remove(), 3000);
  }
}


}
   

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  new EcoCompanion();
});

