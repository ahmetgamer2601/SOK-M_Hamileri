/**
 * ==============================================================================
 * SOKÜM-HAMİ: KÜLTÜREL MİRAS DİJİTAL ENVANTERİ
 * Çekirdek JavaScript Kontrol Dosyası - [TAM SÜRÜM - V.FİNAL]
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

// --- 1. AYARLAR (FIREBASE & CLOUDINARY) ---
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
const CLOUDINARY_PRESET = "sokumcular"; // Cloudinary'de 'Unsigned' olduğundan emin ol!

// --- 2. ŞEHİR EŞLEŞTİRME (Plaka ID -> İsim) ---
const cityNames = {
    "1": "Adana", "2": "Adıyaman", "3": "Afyonkarahisar", "4": "Ağrı", "5": "Amasya", "6": "Ankara", "7": "Antalya", "8": "Artvin", "9": "Aydın", "10": "Balıkesir",
    "11": "Bilecik", "12": "Bingöl", "13": "Bitlis", "14": "Bolu", "15": "Burdur", "16": "Bursa", "17": "Çanakkale", "18": "Çankırı", "19": "Çorum", "20": "Denizli",
    "21": "Diyarbakır", "22": "Edirne", "23": "Elazığ", "24": "Erzincan", "25": "Erzurum", "26": "Eskişehir", "27": "Gaziantep", "28": "Giresun", "29": "Gümüşhane", "30": "Hakkari",
    "31": "Hatay", "32": "Isparta", "33": "Mersin", "34": "İstanbul", "35": "İzmir", "36": "Kars", "37": "Kastamonu", "38": "Kayseri", "39": "Kırklareli", "40": "Kırşehir",
    "41": "Kocaeli", "42": "Konya", "43": "Kütahya", "44": "Malatya", "45": "Manisa", "46": "Kahramanmaraş", "47": "Mardin", "48": "Muğla", "49": "Muş", "50": "Nevşehir",
    "51": "Niğde", "52": "Ordu", "53": "Rize", "54": "Sakarya", "55": "Samsun", "56": "Siirt", "57": "Sinop", "58": "Sivas", "59": "Tekirdağ", "60": "Tokat",
    "61": "Trabzon", "62": "Tunceli", "63": "Şanlıurfa", "64": "Uşak", "65": "Van", "66": "Yozgat", "67": "Zonguldak", "68": "Aksaray", "69": "Bayburt", "70": "Karaman",
    "71": "Kırıkkale", "72": "Batman", "73": "Şırnak", "74": "Bartın", "75": "Ardahan", "76": "Iğdır", "77": "Yalova", "78": "Karabük", "79": "Kilis", "80": "Osmaniye", "81": "Düzce",
    "cy": "KKTC"
};

// --- 3. GLOBAL DEĞİŞKENLER ---
let currentCityID = null;
let currentUserData = null;

// --- 4. UYGULAMA BAŞLATMA (DOM HAZIR OLUNCA) ---
document.addEventListener('DOMContentLoaded', () => {
    const mapWrapper = document.getElementById('turkey-map');
    if (mapWrapper) {
        mapWrapper.innerHTML = turkeyMapSVG;
        setupMapEvents();
    }
    setupAuthEvents();
    setupModalEvents();
});

// --- 5. OTURUM VE KİMLİK YÖNETİMİ ---
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

    // Giriş İşlemi
    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try { 
            await signInWithEmailAndPassword(auth, email, pass); 
        } catch (e) { 
            alert("Giriş yapılamadı: Bilgilerinizi kontrol edin."); 
        }
    };

    // Kayıt İşlemi
    document.getElementById('btn-register').onclick = async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                fullName: name, email: email, role: "user", createdAt: serverTimestamp()
            });
        } catch (e) { 
            alert("Kayıt sırasında hata oluştu: " + e.message); 
        }
    };

    // Çıkış İşlemi
    document.getElementById('btn-logout').onclick = () => signOut(auth);

    // FORM GEÇİŞLERİ (Fix: Kayıt ol tuşu çalışmıyor sorunu çözüldü)
    document.getElementById('to-register').onclick = (e) => {
        e.preventDefault();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'block';
    };

    document.getElementById('to-login').onclick = (e) => {
        e.preventDefault();
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
    };
}

// --- 6. HARİTA ETKİLEŞİMİ ---
function setupMapEvents() {
    document.getElementById('turkey-map').addEventListener('click', (e) => {
        const target = e.target.closest('path');
        if (target) {
            let fullID = target.getAttribute('id');
            // ID "tr-06" ise "06"yı al, "6" yap
            let rawID = fullID.includes('-') ? fullID.split('-')[1] : fullID;
            currentCityID = parseInt(rawID).toString(); 

            const cityName = cityNames[currentCityID] || "Bilinmeyen Şehir";
            document.getElementById('modal-city-name').innerText = cityName;
            document.getElementById('city-modal').style.display = 'block';
            loadCityContent('yemek');
        }
    });
}

// --- 7. PANEL (MODAL) YÖNETİMİ ---
function setupModalEvents() {
    document.getElementById('close-modal-btn').onclick = () => {
        document.getElementById('city-modal').style.display = 'none';
        document.getElementById('city-video').pause();
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCityContent(e.target.dataset.cat);
        };
    });

    document.getElementById('media-upload').onchange = handlePreview;
    document.getElementById('btn-submit-media').onclick = handleMediaUpload;
}

// --- 8. VERİ ÇEKME VE YETKİ KONTROLÜ ---
async function loadCityContent(category) {
    const textEl = document.getElementById('content-text');
    const videoEl = document.getElementById('city-video');
    const sliderEl = document.getElementById('image-slider');
    
    textEl.innerText = "Yükleniyor...";
    videoEl.style.display = "none";
    videoEl.src = "";
    sliderEl.innerHTML = "";

    try {
        const cityDoc = await getDoc(doc(db, "cities", currentCityID));
        if (cityDoc.exists() && cityDoc.data()[category]) {
            const data = cityDoc.data()[category];
            textEl.innerText = data.text || "Bu kategori için henüz açıklama eklenmemiş.";
            
            if (data.videoUrl) {
                videoEl.src = data.videoUrl;
                videoEl.style.display = "block";
            }
            if (data.images && data.images.length > 0) {
                data.images.forEach((img, idx) => {
                    sliderEl.innerHTML += `<img src="${img}" class="${idx === 0 ? 'active' : ''}">`;
                });
            }
        } else {
            textEl.innerText = "Bu ile ve kategoriye ait veri bulunamadı.";
        }
    } catch (e) {
        console.error("Veri çekme hatası:", e);
    }

    // ADMIN KONTROLÜ
    const adminPanel = document.getElementById('admin-controls');
    if (currentUserData && currentUserData.role === 'admin') {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

// --- 9. MEDYA ÖNİZLEME (1 Video / 10 Foto / 5 Dakika) ---
function handlePreview(e) {
    const files = Array.from(e.target.files);
    const previewArea = document.getElementById('upload-preview');
    previewArea.innerHTML = "";

    let vCount = 0; let iCount = 0;

    files.forEach(file => {
        if (file.type.startsWith('video/')) {
            vCount++;
            if (vCount > 1) { alert("Sadece 1 video yükleyebilirsiniz!"); e.target.value = ""; return; }
            
            const tempVideo = document.createElement('video');
            tempVideo.src = URL.createObjectURL(file);
            tempVideo.onloadedmetadata = () => {
                if (tempVideo.duration > 300) { 
                    alert("Video 5 dakikadan uzun olamaz!"); 
                    e.target.value = ""; previewArea.innerHTML = "";
                }
            };
            createThumb(file, 'video', previewArea);
        } else if (file.type.startsWith('image/')) {
            iCount++;
            if (iCount > 10) { alert("Maksimum 10 fotoğraf yükleyebilirsiniz!"); e.target.value = ""; return; }
            createThumb(file, 'image', previewArea);
        }
    });
}

function createThumb(file, type, container) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = `preview-item ${type}-type`;
        div.innerHTML = type === 'image' ? `<img src="${e.target.result}">` : `<video src="${e.target.result}"></video>`;
        container.appendChild(div);
    };
    reader.readAsDataURL(file);
}

// --- 10. CLOUDINARY YÜKLEME VE FIRESTORE KAYIT ---
async function handleMediaUpload() {
    const fileInput = document.getElementById('media-upload');
    const files = Array.from(fileInput.files);
    const category = document.querySelector('.tab-btn.active').dataset.cat;
    const btn = document.getElementById('btn-submit-media');

    if (files.length === 0) return alert("Lütfen yüklenecek dosya seçin!");
    
    btn.disabled = true;
    btn.innerText = "İşleniyor...";

    try {
        let videoUrl = "";
        let imageUrls = [];

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);

            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Cloudinary hatası!");
            const data = await res.json();

            if (file.type.startsWith('video/')) videoUrl = data.secure_url;
            else imageUrls.push(data.secure_url);
        }

        const cityRef = doc(db, "cities", currentCityID);
        await setDoc(cityRef, {
            [category]: {
                videoUrl: videoUrl,
                images: imageUrls,
                text: document.getElementById('content-text').innerText, // Mevcut metni koru
                updatedAt: serverTimestamp()
            }
        }, { merge: true });

        alert("Kültürel Miras başarıyla sisteme kaydedildi!");
        document.getElementById('upload-preview').innerHTML = "";
        fileInput.value = "";
        loadCityContent(category);
    } catch (e) {
        console.error("Yükleme Hatası:", e);
        alert("Yükleme sırasında hata oluştu. Lütfen Cloudinary Preset ayarlarını kontrol edin.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Verileri Sisteme Yükle";
    }
}
