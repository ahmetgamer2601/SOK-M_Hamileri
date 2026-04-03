/**
 * ==============================================================================
 * SOKÜM-HAMİLERİ | DİJİTAL KÜLTÜR ENVANTERİ
 * Ana Kontrol Ünitesi (V.4.0 - YouTube & Atanmış Şehir Entegrasyonu)
 * ==============================================================================
 */

import { turkeyMapSVG } from './map-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// --- 1. CONFIG & INIT ---
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

// --- 2. ŞEHİR SÖZLÜĞÜ (TR-Plaka Sistemi) ---
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

// --- 3. STATE ---
let currentCityID = null; // Örn: "TR26"
let currentUserData = null;
let activeCategory = "gastronomi";
let currentSliderIndex = 0;

// --- 4. BAŞLATMA ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    fillCitySelect();
});

function initApp() {
    const mapDiv = document.getElementById('turkey-map');
    if (mapDiv) {
        mapDiv.innerHTML = turkeyMapSVG;
        setupMapInteractions();
    }
    setupAuthListeners();
    setupUIEvents();
}

// 81 İli Kayıt Formuna Doldur
function fillCitySelect() {
    const select = document.getElementById('reg-city');
    Object.entries(cityNames).forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = `TR${id.padStart(2, '0')}`; // "TR26" formatı
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// --- 5. AUTH MANTIĞI ---
function setupAuthListeners() {
    onAuthStateChanged(auth, async (user) => {
        const authSec = document.getElementById('auth-section');
        const appCont = document.getElementById('app-content');

        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                document.getElementById('display-username').textContent = currentUserData.fullName;
                document.getElementById('display-usercity').textContent = cityNames[currentUserData.assignedCity.replace('TR', '').replace(/^0+/, '')];
                
                authSec.style.display = 'none';
                appCont.style.display = 'block';
                document.body.className = 'app-active';
            }
        } else {
            authSec.style.display = 'flex';
            appCont.style.display = 'none';
            document.body.className = 'auth-active';
        }
    });

    // Giriş
    document.getElementById('btn-login').onclick = async () => {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (e) { alert("Hata: Giriş bilgilerini kontrol edin."); }
    };

    // Kayıt
    document.getElementById('btn-register').onclick = async () => {
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const city = document.getElementById('reg-city').value;

        if(!city) return alert("Lütfen sorumlu olduğunuz şehri seçin!");

        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "users", res.user.uid), {
                fullName: name, email, assignedCity: city, role: "admin", createdAt: serverTimestamp()
            });
            alert("Kayıt başarılı! Şehrinizin temsilcisi oldunuz.");
        } catch (e) { alert("Hata: " + e.message); }
    };

    document.getElementById('btn-logout').onclick = () => signOut(auth);
}

// --- 6. HARİTA VE MODAL KONTROLÜ ---
function setupMapInteractions() {
    document.getElementById('turkey-map').addEventListener('click', (e) => {
        const target = e.target.closest('path');
        if (target) {
            const rawId = target.getAttribute('id').replace('tr-', '').replace(/^0+/, '');
            currentCityID = `TR${rawId.padStart(2, '0')}`; // Kesin eşleşme: TR26
            
            document.getElementById('modal-city-name').textContent = cityNames[rawId];
            document.getElementById('modal-city-id').textContent = currentCityID;
            document.getElementById('city-modal').style.display = 'block';
            
            loadCityContent();
        }
    });
}

function setupUIEvents() {
    // Form Geçişleri
    document.getElementById('to-register').onclick = () => {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'block';
    };
    document.getElementById('to-login').onclick = () => {
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
    };

    // Kategori Sekmeleri
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.cat;
            document.getElementById('cat-title').textContent = btn.textContent;
            loadCityContent();
        };
    });

    document.getElementById('close-modal-btn').onclick = () => {
        document.getElementById('city-modal').style.display = 'none';
        document.getElementById('video-container').innerHTML = ''; // Videoyu durdur
    };

    // Slider Kontrol
    document.querySelector('.s-next').onclick = () => moveSlider(1);
    document.querySelector('.s-prev').onclick = () => moveSlider(-1);

    // Kaydetme İşlemi
    document.getElementById('btn-save-data').onclick = handleSave;
}

// --- 7. VERİ YÜKLEME VE GÖRÜNTÜLEME ---
async function loadCityContent() {
    const textEl = document.getElementById('content-text');
    const videoCont = document.getElementById('video-container');
    const slider = document.getElementById('image-slider');
    
    textEl.textContent = "Veriler getiriliyor...";
    videoCont.innerHTML = '<div class="placeholder"><i class="fa-brands fa-youtube"></i><p>Video aranıyor...</p></div>';
    slider.innerHTML = '';

    try {
        const cityDoc = await getDoc(doc(db, "cities", currentCityID));
        
        if (cityDoc.exists() && cityDoc.data()[activeCategory]) {
            const data = cityDoc.data()[activeCategory];
            textEl.textContent = data.text || "Henüz açıklama girilmemiş.";
            
            // YouTube Render
            if (data.youtubeUrl) {
                const vidId = getYoutubeID(data.youtubeUrl);
                videoCont.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" allowfullscreen></iframe>`;
            } else {
                videoCont.innerHTML = '<div class="placeholder"><i class="fa-brands fa-youtube"></i><p>Video Eklenmemiş</p></div>';
            }

            // Image Slider Render
            if (data.images && data.images.length > 0) {
                data.images.forEach((img, i) => {
                    slider.innerHTML += `<img src="${img}" class="${i === 0 ? 'active' : ''}">`;
                });
                currentSliderIndex = 0;
            }
        } else {
            textEl.textContent = "Bu kategoriye henüz veri girilmemiş.";
        }
    } catch (e) { console.error(e); }

    // Admin Yetki Kontrolü (Atanmış Şehir Eşleşmesi)
    const adminPanel = document.getElementById('admin-panel');
    if (currentUserData && currentUserData.assignedCity === currentCityID) {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

// --- 8. YOUTUBE & CLOUDINARY YÖNETİMİ ---
function getYoutubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

async function handleSave() {
    const btn = document.getElementById('btn-save-data');
    const text = document.getElementById('admin-text').value;
    const ytUrl = document.getElementById('admin-youtube-url').value;
    const photoFiles = document.getElementById('admin-photos').files;

    if (!text && !ytUrl && photoFiles.length === 0) return alert("Lütfen en az bir alan doldurun!");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yayınlanıyor...';

    try {
        let imageUrls = [];
        // Mevcut resimleri korumak istiyorsak önce çekmeliyiz (opsiyonel)
        
        for (let file of photoFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const d = await res.json();
            imageUrls.push(d.secure_url);
        }

        const cityRef = doc(db, "cities", currentCityID);
        await setDoc(cityRef, {
            [activeCategory]: {
                text: text,
                youtubeUrl: ytUrl,
                images: imageUrls,
                updatedBy: auth.currentUser.uid,
                updatedAt: serverTimestamp()
            }
        }, { merge: true });

        alert("Veriler başarıyla güncellendi!");
        loadCityContent();
    } catch (e) { alert("Hata: " + e.message); }
    finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Değişiklikleri Yayınla';
    }
}

// Slider Yardımcısı
function moveSlider(dir) {
    const images = document.querySelectorAll('#image-slider img');
    if (images.length === 0) return;
    images[currentSliderIndex].classList.remove('active');
    currentSliderIndex = (currentSliderIndex + dir + images.length) % images.length;
    images[currentSliderIndex].classList.add('active');
}
