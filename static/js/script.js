let currentImageIndex = 0;
let currentImages = [];

// モーダル開閉関数
function openModal(index) {
  currentImageIndex = index;
  document.getElementById('modal-image').src = currentImages[currentImageIndex].src;
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function changeImage(direction) {
  const newIndex = currentImageIndex + direction;
  if (newIndex < 0 || newIndex >= currentImages.length) return;
  currentImageIndex = newIndex;
  document.getElementById('modal-image').src = currentImages[currentImageIndex].src;
}

// アルバム選択時にactiveクラスを付ける関数
function setActiveAlbum(albumId) {
  document.querySelectorAll('#album-list li').forEach(li => {
    li.classList.toggle('active', parseInt(li.dataset.albumId) === albumId);
  });
}

// アルバム一覧を取得して表示
function loadAlbums() {
  fetch('/api/albums')
    .then(response => response.json())
    .then(data => {
      const albumList = document.getElementById('album-list');
      albumList.innerHTML = '';
      data.albums.forEach(album => {
        const li = document.createElement('li');
        li.textContent = album.album_name;
        li.dataset.albumId = album.id;
        li.addEventListener('click', () => {
          loadAlbumImages(album.id, album.album_name);
          setActiveAlbum(album.id); // ←この関数を追加で呼び出す
        });
        albumList.appendChild(li);
      });
    })
    .catch(error => {
      console.error('アルバム取得エラー:', error);
    });
}

// 指定したアルバムの画像一覧を取得して表示
function loadAlbumImages(albumId, albumName) {
  document.getElementById('album-title').textContent = albumName;

  fetch(`/api/albums/${albumId}/images`)
    .then(response => response.json())
    .then(data => {
      const imageGrid = document.getElementById('image-grid');
      imageGrid.innerHTML = '';
      currentImages = []; // 初期化
      data.images.forEach((image, index) => {
        const img = document.createElement('img');
        img.src = `/images/${image.local_file_path}`;
        img.alt = `Image ID: ${image.id}`;
        img.addEventListener('click', () => openModal(index));
        imageGrid.appendChild(img);
        currentImages.push(img);
      });
    })
    .catch(error => {
      console.error('画像取得エラー:', error);
    });
}

window.addEventListener('DOMContentLoaded', () => {
  loadAlbums(); // アルバム一覧の初期ロード
  
  // モーダル操作イベントを追加
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('prev-arrow').onclick = () => changeImage(-1);
  document.getElementById('next-arrow').onclick = () => changeImage(1);
});

