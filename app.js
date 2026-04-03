import { turkeyMapSVG } from './map-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// --- 1. FIREBASE CONFIG ---
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

// --- 2. ID TEMİZLEME MOTORU (Kritik Düzeltme) ---
// Bu fonksiyon "tr-26", "26", "TRTR26" gibi her şeyi "TR26" yapar.
function formatID(rawID) {
    if (!rawID) return "";
    const digits = rawID.toString().replace(/\D/g, ""); // Sadece rakamları al (Örn: 26)
    return "TR" + digits.padStart(2, '0'); // Başına TR ekle ve 02 yap (Örn: TR26)
}

const cityNames = { "1": "Adana", "2": "Adıyaman", "3": "Afyonkarahisar", "4": "Ağrı", "5": "Amasya", "6": "Ankara", "7": "Antalya", "8": "Artvin", "9": "Aydın", "10": "Balıkesir", "11": "Bilecik", "12": "Bingöl", "13": "Bitlis", "14": "Bolu", "15": "Burdur", "16": "Bursa", "17": "Çanakkale", "18": "Çankırı", "19": "Çorum", "20": "Denizli", "21": "Diyarbakır", "22": "Edirne", "23": "Elazığ", "24": "Erzincan", "25": "Erzurum", "26": "Eskişehir", "27": "Gaziantep", "28": "Giresun", "29": "Gümüşhane", "30": "Hakkari", "31": "Hatay", "32": "Isparta", "33": "Mersin", "34": "İstanbul", "35": "İzmir", "36": "Kars", "37": "Kastamonu", "38": "Kayseri", "39": "Kırklareli", "40": "Kırşehir", "41": "Kocaeli", "42": "Konya", "43": "Kütahya", "44": "Malatya", "45": "Manisa", "46": "Kahramanmaraş", "47": "Mardin", "48": "Muğla", "49": "Muş", "50": "Nevşehir", "51": "Niğde", "52": "Ordu", "53": "Rize", "54": "Sakarya", "55": "Samsun", "56": "Siirt", "57": "Sinop", "58": "Sivas", "59": "Tekirdağ", "60": "Tokat", "61": "Trabzon", "62": "Tunceli", "63": "Şanlıurfa", "64": "Uşak", "65": "Van", "66": "Yozgat", "67": "Zonguldak", "68": "Aksaray", "69": "Bayburt", "70": "Karaman", "71": "Kırıkkale", "72": "Batman", "73": "Şırnak", "74": "Bartın", "75": "Ardahan", "76": "Iğdır", "77": "Yalova", "78": "Karabük", "79": "Kilis", "80": "Osmaniye", "81": "Düzce", "cy": "KKTC" };

let currentCityID = null;
let currentUserData = null;
let activeCategory = "el-sanatlari"; 

document.addEventListener('DOMContentLoaded', () => {
    const mapDiv = document.getElementById('turkey-map');
    if (mapDiv) mapDiv.innerHTML = turkeyMapSVG;
    fillCitySelect();
    setupAuth();
    setupEvents();
});

function fillCitySelect() {
    const s = document.getElementById('reg-city');
    Object.entries(cityNames).forEach(([id, name]) => {
        let opt = document.createElement('option');
        opt.value = formatID(id);
        opt.textContent = name;
        s.appendChild(opt);
    });
}

function setupAuth() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            currentUserData = docSnap.data();
            document.getElementById('display-username').textContent = currentUserData.fullName;
            // Şehir ismini bulurken ID'yi temizleyip bakıyoruz
            const pureID = currentUserData.assignedCity.replace(/\D/g, "").replace(/^0+/, '');
            document.getElementById('display-usercity').textContent = cityNames[pureID] || "Şehir";
            
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
        } else {
            document.getElementById('auth-section').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    });

    document.getElementById('btn-login').onclick = async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-password').value;
        try { await signInWithEmailAndPassword(auth, e, p); } catch { alert("Giriş başarısız!"); }
    };

    document.getElementById('btn-register').onclick = async () => {
        const n = document.getElementById('reg-name').value;
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-password').value;
        const c = document.getElementById('reg-city').value;
        if(!c) return alert("Lütfen bir şehir seçin!");
        try {
            const res = await createUserWithEmailAndPassword(auth, e, p);
            await setDoc(doc(db, "users", res.user.uid), {
                fullName: n, assignedCity: formatID(c), role: "user", // Başlangıçta yetkisiz
                createdAt: serverTimestamp()
            });
            alert("Kayıt başarılı! Admin yetkisi için panelden rolünüzü güncelleyin.");
        } catch (err) { alert(err.message); }
    };
    document.getElementById('btn-logout').onclick = () => signOut(auth);
}

function setupEvents() {
    document.getElementById('turkey-map').addEventListener('click', (e) => {
        const target = e.target.closest('path');
        if (target) {
            const raw = target.getAttribute('id');
            currentCityID = formatID(raw); // TR26 formatına zorla
            
            const pureID = currentCityID.replace(/\D/g, "").replace(/^0+/, '');
            document.getElementById('modal-city-name').textContent = cityNames[pureID];
            document.getElementById('modal-city-id').textContent = currentCityID;
            document.getElementById('city-modal').style.display = 'block';
            loadContent();
        }
    });

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            activeCategory = b.dataset.cat;
            document.getElementById('cat-title').textContent = b.textContent;
            loadContent();
        };
    });

    document.getElementById('close-modal-btn').onclick = () => {
        document.getElementById('city-modal').style.display = 'none';
        document.getElementById('video-container').innerHTML = '';
    };

    document.getElementById('to-register').onclick = () => { document.getElementById('login-container').style.display='none'; document.getElementById('register-container').style.display='block'; };
    document.getElementById('to-login').onclick = () => { document.getElementById('register-container').style.display='none'; document.getElementById('login-container').style.display='block'; };
    
    document.getElementById('btn-save-data').onclick = handleSave;
}

async function loadContent() {
    const textEl = document.getElementById('content-text');
    const vCont = document.getElementById('video-container');
    const sld = document.getElementById('image-slider');
    
    textEl.textContent = "Yükleniyor...";
    vCont.innerHTML = ""; sld.innerHTML = "";

    const d = await getDoc(doc(db, "cities", currentCityID));
    if (d.exists() && d.data()[activeCategory]) {
        const info = d.data()[activeCategory];
        textEl.textContent = info.text || "Açıklama bulunamadı.";
        
        if (info.youtubeUrl) {
            // Gelişmiş YouTube ID ayıklama (watch?v= veya /embed/ veya .be/)
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = info.youtubeUrl.match(regExp);
            const vidId = (match && match[2].length === 11) ? match[2] : null;
            if(vidId) vCont.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" allowfullscreen></iframe>`;
        }
        
        if (info.images) info.images.forEach((img, i) => {
            sld.innerHTML += `<img src="${img}" class="${i===0?'active':''}">`;
        });
    } else {
        textEl.textContent = "Bu il ve kategoriye henüz veri girilmemiş.";
    }

    // --- YETKİ KONTROLÜ (DÜZELTİLDİ) ---
    const pan = document.getElementById('admin-panel');
    const isUserAdmin = currentUserData && currentUserData.role === 'admin';
    const isCorrectCity = currentUserData && formatID(currentUserData.assignedCity) === currentCityID;

    if (isUserAdmin && isCorrectCity) {
        pan.style.display = 'block';
        // Mevcut verileri inputlara doldur ki admin neyi değiştirdiğini görsün
        const currentData = d.exists() ? d.data()[activeCategory] : {};
        document.getElementById('admin-text').value = currentData.text || "";
        document.getElementById('admin-youtube-url').value = currentData.youtubeUrl || "";
    } else {
        pan.style.display = 'none';
    }
}

async function handleSave() {
    const btn = document.getElementById('btn-save-data');
    const text = document.getElementById('admin-text').value;
    const yt = document.getElementById('admin-youtube-url').value;
    const files = document.getElementById('admin-photos').files;

    if (!text) return alert("Lütfen en azından bir açıklama yazın!");

    btn.disabled = true; btn.textContent = "Kaydediliyor...";

    try {
        let imgs = [];
        // Eğer yeni fotoğraf seçilmediyse mevcut fotoğrafları korumak için kontrol eklenebilir
        // Ama şimdilik sadece yenileri yüklüyoruz.
        for (let f of files) {
            const fd = new FormData(); fd.append('file', f); fd.append('upload_preset', CLOUDINARY_PRESET);
            const r = await fetch(CLOUDINARY_URL, { method: 'POST', body: fd });
            const data = await r.json();
            imgs.push(data.secure_url);
        }

        const cityRef = doc(db, "cities", currentCityID);
        await setDoc(cityRef, {
            [activeCategory]: { 
                text: text, 
                youtubeUrl: yt, 
                images: imgs.length > 0 ? imgs : [], // Eğer yeni yoksa boş gönderir (geliştirilebilir)
                updatedAt: serverTimestamp() 
            }
        }, { merge: true });

        alert("Kültürel Miras Başarıyla Güncellendi!");
        loadContent();
    } catch (e) { alert("Hata: " + e.message); }
    finally { btn.disabled = false; btn.textContent = "Değişiklikleri Kaydet"; }
}
