/**
 * ==============================================================================
 * SOKÜM-HAMİ: KÜLTÜREL MİRAS DİJİTAL ENVANTERİ
 * Çekirdek JavaScript Kontrol Dosyası (Final & Yetkili Sürüm)
 * ==============================================================================
 */

import { turkeyMapSVG } from './map-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// --- 1. FIREBASE & CLOUDINARY AYARLARI ---
const firebaseConfig = {
    apiKey: "AIzaSyBbZtKpCPbgU1WKXGVxVpUv_bIrZPpcJI4",
    authDomain: "sokum-a3f39.firebaseapp.com",
    projectId: "sokum-a3f39",
    storageBucket: "sokum-a3f39.firebasestorage.app",
    messagingSenderId: "826857261150",
    appId: "1:826857261150:web:e98a382c4a7e6f93470ccf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqeywbqe1/upload";
const CLOUDINARY_PRESET = "sokumcular";

// --- 2. PLAKA KODU - ŞEHİR İSMİ EŞLEŞTİRME (NULL HATASI ÇÖZÜMÜ) ---
const cityNames = {
    "1": "Adana", "2": "Adıyaman", "3": "Afyonkarahisar", "4": "Ağrı", "5": "Amasya", "6": "Ankara", "7": "Antalya", "8": "Artvin", "9": "Aydın", "10": "Balıkesir",
    "11": "Bilecik", "12": "Bingöl", "13": "Bitlis", "14": "Bolu", "15": "Burdur", "16": "Bursa", "17": "Çanakkale", "18": "Çankırı", "19": "Çorum", "20": "Denizli",
    "21": "Diyarbakır", "22": "Edirne", "23": "Elazığ", "24": "Erzincan", "25": "Erzurum", "26": "Eskişehir", "27": "Gaziantep", "28": "Giresun", "29": "Gümüşhane", "30": "Hakkari",
    "31": "Hatay", "32": "Isparta", "33": "Mersin", "34": "İstanbul", "35": "İzmir", "36": "Kars", "37": "Kastamonu", "38": "Kayseri", "39": "Kırklareli", "40": "Kırşehir",
    "41": "Kocaeli", "42": "Konya", "43": "Kütahya", "44": "Malatya", "45": "Manisa", "46": "Kahramanmaraş", "47": "Mardin", "48": "Muğla", "49": "Muş", "50": "Nevşehir",
    "51": "Niğde", "52": "Ordu", "53": "Rize", "54": "Sakarya", "55": "Samsun", "56": "Siirt", "57": "Sinop", "58": "Sivas", "59": "Tekirdağ", "60": "Tokat",
    "61": "Trabzon", "62": "Tunceli", "63": "Şanlıurfa", "64": "Uşak", "65": "Van", "66": "Yozgat", "67": "Zonguldak", "68": "Aksaray", "69": "Bayburt", "70": "Karaman",
    "71": "Kırıkkale", "72": "Batman", "73": "Şırnak", "74": "Bartın", "75": "Ardahan", "76": "Iğdır", "77": "Yalova", "78": "Karabük", "79": "Kilis", "80": "Osmaniye", "81": "Düzce",
    "cy": "Kuzey Kıbrıs Türk Cumhuriyeti"
};

// --- 3. GLOBAL DURUM ---
let currentCityID = null;
let currentUserData = null;

// --- 4. UYGULAMA BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    const mapWrapper = document.getElementById('turkey-map');
    if (mapWrapper) {
        mapWrapper.innerHTML = turkeyMapSVG;
        setupMapEvents();
    }
    setupAuthEvents();
    setupModalEvents();
});

// --- 5. OTURUM YÖNETİMİ ---
function setupAuthEvents() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            document.body.className = 'app-active';
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                document.getElementById('display-username').innerText = currentUserData.fullName;
            }
        } else {
            document.body.className = 'auth-active';
            document.getElementById('auth-section').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    });

    // Giriş/Kayıt butonlarını bağla
    document.getElementById('btn-login').onclick = async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-password').value;
        try { await signInWithEmailAndPassword(auth, e, p); } catch { alert("Giriş Hatalı!"); }
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);
}

// --- 6. HARİTA & PANEL ETKİLEŞİMİ ---
function setupMapEvents() {
    document.getElementById('turkey-map').addEventListener('click', (e) => {
        const target = e.target.closest('path');
        if (target) {
            let id = target.getAttribute('id');
            // ID "tr-34" gibi geliyorsa sadece sayıyı al
            currentCityID = id.includes('-') ? id.split('-')[1] : id; 
            
            const cityName = cityNames[currentCityID] || "Bilinmeyen Şehir";
            document.getElementById('modal-city-name').innerText = cityName;
            document.getElementById('city-modal').style.display = 'block';
            loadCityContent('yemek');
        }
    });
}

function setupModalEvents() {
    document.getElementById('close-modal-btn').onclick = () => {
        document.getElementById('city-modal').style.display = 'none';
        document.getElementById('city-video').pause();
    };

    // Sekme geçişleri
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCityContent(e.target.dataset.cat);
        };
    });

    // Dosya Seçme & Önizleme
    document.getElementById('media-upload').onchange = handlePreview;
    document.getElementById('btn-submit-media').onclick = handleMediaUpload;
}

// --- 7. VERİ ÇEKME & ADMİN KONTROLÜ ---
async function loadCityContent(category) {
    const textEl = document.getElementById('content-text');
    const videoEl = document.getElementById('city-video');
    const sliderEl = document.getElementById('image-slider');
    
    textEl.innerText = "Yükleniyor...";
    videoEl.style.display = "none";
    sliderEl.innerHTML = "";

    try {
        const cityDoc = await getDoc(doc(db, "cities", currentCityID));
        if (cityDoc.exists() && cityDoc.data()[category]) {
            const data = cityDoc.data()[category];
            textEl.innerText = data.text || "Açıklama yok.";
            
            if (data.videoUrl) {
                videoEl.src = data.videoUrl;
                videoEl.style.display = "block";
            }
            if (data.images && data.images.length > 0) {
                data.images.forEach((img, idx) => {
                    const imgTag = `<img src="${img}" class="${idx === 0 ? 'active' : ''}">`;
                    sliderEl.innerHTML += imgTag;
                });
            }
        } else {
            textEl.innerText = "Bu kategoriye henüz veri girilmemiş.";
        }
    } catch (e) { console.error(e); }

    // ADMİN PANELİ GÖSTERİMİ (Kritik Bölge)
    const adminPanel = document.getElementById('admin-controls');
    if (currentUserData?.role === 'admin') {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

// --- 8. MEDYA YÜKLEME (1 VİDEO / 10 FOTO / 5 DK) ---
function handlePreview(e) {
    const files = Array.from(e.target.files);
    const previewArea = document.getElementById('upload-preview');
    previewArea.innerHTML = "";

    let vCount = 0, iCount = 0;

    files.forEach(file => {
        if (file.type.startsWith('video/')) {
            vCount++;
            if (vCount > 1) return alert("Sadece 1 video!");
            
            const v = document.createElement('video');
            v.src = URL.createObjectURL(file);
            v.onloadedmetadata = () => {
                if (v.duration > 300) alert("Video 5 dakikadan uzun!");
            };
            addThumbnail(file, 'video', previewArea);
        } else {
            iCount++;
            if (iCount > 10) return alert("Maksimum 10 fotoğraf!");
            addThumbnail(file, 'image', previewArea);
        }
    });
}

function addThumbnail(file, type, container) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = `preview-item ${type}-type`;
        div.innerHTML = type === 'image' ? `<img src="${e.target.result}">` : `<video src="${e.target.result}"></video>`;
        container.appendChild(div);
    };
    reader.readAsDataURL(file);
}

async function handleMediaUpload() {
    const files = Array.from(document.getElementById('media-upload').files);
    const category = document.querySelector('.tab-btn.active').dataset.cat;
    const btn = document.getElementById('btn-submit-media');

    if (files.length === 0) return alert("Dosya seçin!");
    
    btn.disabled = true;
    btn.innerText = "Yükleniyor...";

    try {
        let videoUrl = "";
        let imageUrls = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);

            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const data = await res.json();

            if (file.type.startsWith('video/')) videoUrl = data.secure_url;
            else imageUrls.push(data.secure_url);
        }

        await setDoc(doc(db, "cities", currentCityID), {
            [category]: {
                videoUrl,
                images: imageUrls,
                text: document.getElementById('content-text').innerText,
                updatedAt: serverTimestamp()
            }
        }, { merge: true });

        alert("Başarıyla yüklendi!");
        loadCityContent(category);
    } catch (e) { alert("Hata oluştu!"); }
    finally { btn.disabled = false; btn.innerText = "Verileri Sisteme Yükle"; }
}
