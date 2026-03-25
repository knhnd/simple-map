// ===========================
// ダークモード管理
// ===========================
const themeToggleBtn = document.getElementById('theme-toggle');
const darkIcon = document.getElementById('theme-icon-dark');
const lightIcon = document.getElementById('theme-icon-light');

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    darkIcon.classList.remove('hidden');
    lightIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    darkIcon.classList.add('hidden');
    lightIcon.classList.remove('hidden');
  }
}

// 初期テーマの適用
const savedTheme = localStorage.getItem('color-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  applyTheme(!isDark);
  localStorage.setItem('color-theme', isDark ? 'light' : 'dark');
});

// ===========================
// 地図の初期化
// ===========================
const map = L.map('map', {
  zoomControl: false,
  scrollWheelZoom: true,
}).setView([35.6812, 139.7671], 13);

// ズームコントロールを右下に配置
L.control.zoom({ position: 'bottomright' }).addTo(map);

// OSM タイルレイヤー
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

let mainMarker = null;
let accuracyCircle = null;

// ===========================
// トースト通知
// ===========================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ===========================
// 情報パネル
// ===========================
function showPanel(title, content) {
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel-content').textContent = content;
  document.getElementById('info-panel').classList.remove('hidden');
}

function hidePanel() {
  document.getElementById('info-panel').classList.add('hidden');
}

document.getElementById('panel-close').addEventListener('click', hidePanel);

// ===========================
// 地図クリック → 住所取得
// ===========================
map.on('click', async (e) => {
  const { lat, lng } = e.latlng;

  if (mainMarker) {
    mainMarker.setLatLng(e.latlng);
  } else {
    mainMarker = L.marker(e.latlng).addTo(map);
  }

  showPanel('選択した地点', '住所を取得中...');

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ja`,
    );
    const data = await res.json();
    showPanel('選択した地点', data.display_name || '住所不明');
  } catch {
    showPanel('選択した地点', `緯度: ${lat.toFixed(5)}, 経度: ${lng.toFixed(5)}`);
  }
});

// ===========================
// 場所検索
// ===========================
async function searchLocation() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ja`,
    );
    const results = await res.json();

    if (results.length > 0) {
      const { lat, lon, display_name } = results[0];
      const pos = [parseFloat(lat), parseFloat(lon)];
      map.flyTo(pos, 16);
      if (mainMarker) {
        mainMarker.setLatLng(pos);
      } else {
        mainMarker = L.marker(pos).addTo(map);
      }
      showPanel('検索結果', display_name);
    } else {
      showToast('場所が見つかりませんでした');
    }
  } catch {
    showToast('検索中にエラーが発生しました');
  }
}

document.getElementById('search-button').addEventListener('click', searchLocation);
document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchLocation();
});

// ===========================
// 現在地取得
// ===========================
function locateUser() {
  map.locate({ setView: true, maxZoom: 16 });
}

document.getElementById('locate-button').addEventListener('click', locateUser);

map.on('locationfound', (e) => {
  if (mainMarker) {
    mainMarker.setLatLng(e.latlng);
  } else {
    mainMarker = L.marker(e.latlng).addTo(map);
  }

  if (accuracyCircle) map.removeLayer(accuracyCircle);
  accuracyCircle = L.circle(e.latlng, {
    color: '#15803d',
    fillColor: '#15803d',
    fillOpacity: 0.12,
    radius: e.accuracy,
  }).addTo(map);

  showToast('現在地に移動しました');
});

map.on('locationerror', () => {
  showToast('位置情報の取得に失敗しました');
});

// ===========================
// 起動時
// ===========================
window.addEventListener('load', () => {
  showToast('Field Map へようこそ！');
});
