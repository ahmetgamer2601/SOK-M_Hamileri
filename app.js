/**
 * ==============================================================================
 * SOKUM-AHİ: KÜLTÜREL MİRAS DİJİTAL ENVANTERİ
 * Çekirdek JavaScript Kontrol Dosyası (Eksiksiz Sürüm)
 * ==============================================================================
 */

import { turkeyMapSVG } from './map-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ---------------------------------------------------------
// 1. FIREBASE KONFİGÜRASYONU
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyBbZtKpCPbgU1WKXGVxVpUv_bIrZPpcJI4",
    authDomain: "sokum-a3f39.firebaseapp.com",
    projectId: "sokum-a3f39",
    storageBucket: "sokum-a3f39.firebasestorage.app",
    messagingSenderId: "826857261150",
    appId: "1:826857261150:web:e98a382c4a7e6f93470ccf",
    measurementId: "G-RV0M7D2MZN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------------------------------------------------
// 2. GLOBAL DURUM YÖNETİMİ VE ELEMENTLER
// ---------------------------------------------------------
let currentCityID = null;
let currentCityName = "";
let currentUserData = null;

// UI Katmanları
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');

// Modal ve İçerik Elementleri
const cityModal = document.getElementById('city-modal');
const modalTitle = document.getElementById('modal-city-name');
const closeModalBtn = document.getElementById('close-modal-btn');
const contentTitle = document.getElementById('content-title');
const contentText = document.getElementById('content-text');
const videoElement = document.getElementById('city-video');
const adminPanel = document.getElementById('admin-controls');
const uploadBtn = document.getElementById('btn-upload');

// Cloudinary Ayarları
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqeywbqe1/upload";
const CLOUDINARY_UPLOAD_PRESET = "BURAYA_PRESENT_ISMINI_YAZ"; // Cloudinary'den aldığın Preset adını buraya yaz

// ---------------------------------------------------------
// 3. UYGULAMA BAŞLATMA (INIT)
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Haritayı SVG olarak enjekte et
    const mapWrapper = document.getElementById('turkey-map');
    if (mapWrapper) {
        mapWrapper.innerHTML = turkeyMapSVG;
        setupMapEvents();
    }
    setupAuthEvents();
    setupModalEvents();
});

// ---------------------------------------------------------
// 4. OTURUM VE KULLANICI KONTROLÜ
// ---------------------------------------------------------
function setupAuthEvents() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Giriş Yapılmış
            document.body.className = 'app-active';
            authSection.style.display = 'none';
            appContent.style.display = 'block';

            // Kullanıcı profilini getir
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                document.getElementById('display-username').innerText = currentUserData.fullName;
            }
        } else {
            // Giriş Yapılmamış
            document.body.className = 'auth-active';
            authSection.style.display = 'flex';
            appContent.style.display = 'none';
            currentUserData = null;
        }
    });

    // Giriş Butonu
    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (err) { alert("Hata: Bilgiler hatalı."); }
    };

    // Kayıt Butonu
    document.getElementById('btn-register').onclick = async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                fullName: name, email: email, role: "user", assignedCity: null
            });
        } catch (err) { alert("Kayıt başarısız."); }
    };

    // Çıkış Butonu
    document.getElementById('btn-logout').onclick = () => signOut(auth);

    // Form Değiştirme
    document.getElementById('to-register').onclick = () => {
        loginContainer.style.display = 'none'; registerContainer.style.display = 'block';
    };
    document.getElementById('to-login').onclick = () => {
        registerContainer.style.display = 'none'; loginContainer.style.display = 'block';
    };
}

// ---------------------------------------------------------
// 5. HARİTA ETKİLEŞİMİ
// ---------------------------------------------------------
function setupMapEvents() {
    const map = document.getElementById('turkey-map');
    map.addEventListener('click', (e) => {
        const path = e.target.closest('path') || e.target.closest('circle');
        if (path) {
            currentCityID = path.getAttribute('id');
            currentCityName = path.getAttribute('title') || path.getAttribute('class');
            openCityPanel();
        }
    });
}

// ---------------------------------------------------------
// 6. ŞEHİR PANELİ (MODAL) YÖNETİMİ
// ---------------------------------------------------------
function openCityPanel() {
    // 1. Panel Başlığını Güncelle
    modalTitle.innerText = `${currentCityName} Kültürel Envanteri`;
    cityModal.style.display = 'block';

    // 2. Varsayılan Kategori: Yemek
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const defaultTab = document.querySelector('[data-cat="yemek"]');
    if (defaultTab) defaultTab.classList.add('active');

    loadContent('yemek');
}

function setupModalEvents() {
    // Kapatma Tuşu
    closeModalBtn.addEventListener('click', closeCityPanel);

    // Dışarıya Tıklayınca Kapatma
    window.addEventListener('click', (e) => {
        if (e.target === cityModal) closeCityPanel();
    });

    // Sekme (Kategori) Geçişleri
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadContent(e.target.dataset.cat);
        });
    });

    // Yükleme İşlemi
    uploadBtn.addEventListener('click', handleMediaUpload);
}

function closeCityPanel() {
    cityModal.style.display = 'none';
    videoElement.pause();
    videoElement.src = "";
    currentCityID = null;
}

// ---------------------------------------------------------
// 7. VERİ YÜKLEME VE ÇEKME (FIRESTORE & CLOUDINARY)
// ---------------------------------------------------------
async function loadContent(category) {
    const categoryNames = {
        'yemek': 'Gastronomi',
        'sanat': 'Zanaat ve Sanat',
        'kiyafet': 'Geleneksel Giyim',
        'sozlu': 'Efsaneler & Sözlü Kültür'
    };
    
    contentTitle.innerText = categoryNames[category];
    contentText.innerText = "Yükleniyor...";
    videoElement.style.display = "none";

    try {
        const cityDoc = await getDoc(doc(db, "cities", currentCityID));
        if (cityDoc.exists() && cityDoc.data()[category]) {
            const data = cityDoc.data()[category];
            contentText.innerText = data.text || "Açıklama henüz eklenmemiş.";
            if (data.videoUrl) {
                videoElement.src = data.videoUrl;
                videoElement.style.display = "block";
            }
        } else {
            contentText.innerText = "Bu kategoriye henüz veri girilmemiş.";
        }
    } catch (error) {
        console.error("Veri çekme hatası:", error);
    }

    // Admin Yetki Kontrolü
    if (currentUserData?.role === 'admin' && currentUserData?.assignedCity === currentCityID) {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

async function handleMediaUpload() {
    const file = document.getElementById('video-input').files[0];
    const category = document.querySelector('.tab-btn.active').dataset.cat;

    if (!file) return alert("Lütfen bir dosya seçin.");
    
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Buluta Gönderiliyor...";

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        // 1. Cloudinary Yükleme
        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const cloudData = await res.json();

        // 2. Firestore Kayıt
        const cityRef = doc(db, "cities", currentCityID);
        await setDoc(cityRef, {
            [category]: {
                videoUrl: cloudData.secure_url,
                text: contentText.innerText, // Mevcut metni korur
                updatedAt: serverTimestamp()
            }
        }, { merge: true });

        alert("Başarıyla yüklendi!");
        loadContent(category);
    } catch (err) {
        alert("Yükleme hatası!");
        console.error(err);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Dosyayı Yükle";
    }
}

// ---------------------------------------------------------
// 8. VİDEO ÖZELLİKLERİ
// ---------------------------------------------------------
window.toggleFullScreenVideo = () => {
    if (videoElement.src) {
        if (videoElement.requestFullscreen) videoElement.requestFullscreen();
        else if (videoElement.webkitRequestFullscreen) videoElement.webkitRequestFullscreen();
        videoElement.play();
    }
};