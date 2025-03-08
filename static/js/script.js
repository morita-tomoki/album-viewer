let currentImageIndex = 0;
let currentImages = [];

// モーダル開閉関数
function openModal(index) {
  currentImageIndex = index;
  document.getElementById('modal-image').src = currentImages[currentImageIndex].src;
  document.getElementById('modal-overlay').style.display = 'flex';
  updateArrowButtons(); // モーダル開くときに矢印状態を更新
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function changeImage(direction) {
  const newIndex = currentImageIndex + direction;
  if (newIndex < 0 || newIndex >= currentImages.length) return;
  currentImageIndex = newIndex;
  document.getElementById('modal-image').src = currentImages[currentImageIndex].src;
  updateArrowButtons(); // 画像切替時に矢印状態を更新
}

// 矢印ボタンの状態更新関数
function updateArrowButtons() {
  const prevArrow = document.getElementById('prev-arrow');
  const nextArrow = document.getElementById('next-arrow');

  // 先頭にいる場合、左ボタンを無効化
  if (currentImageIndex === 0) {
    prevArrow.classList.add('disabled');
  } else {
    prevArrow.classList.remove('disabled');
  }

  // 末尾にいる場合、右ボタンを無効化
  if (currentImageIndex === currentImages.length - 1) {
    nextArrow.classList.add('disabled');
  } else {
    nextArrow.classList.remove('disabled');
  }
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

// 現在選択中のアルバムIDを保持
let selectedAlbumId = null;

// 指定したアルバムの画像一覧を取得して表示
function loadAlbumImages(albumId, albumName) {
  selectedAlbumId = albumId;  // 選択中のアルバムを保持
  document.getElementById('album-title').textContent = albumName;

  // ★ コースフィルターの選択値を取得
  const courseId = document.getElementById('course-filter').value;

  fetch(`/api/albums/${albumId}/images?course_id=${courseId}`)
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

  // コースフィルターの要素取得
  const courseFilter = document.getElementById('course-filter');

  // フィルター変更時の処理
  courseFilter.addEventListener('change', () => {
    if (selectedAlbumId) {
      const albumName = document.getElementById('album-title').textContent;
      loadAlbumImages(selectedAlbumId, albumName);
  }
  });

  // モーダル操作イベントを追加
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('prev-arrow').onclick = () => changeImage(-1);
  document.getElementById('next-arrow').onclick = () => changeImage(1);

  document.getElementById('modal-overlay').onclick = (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  };
  
  // キーボードの左右キーで画像を切り替える処理
  document.addEventListener('keydown', (e) => {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay.style.display === 'flex') {  // モーダルが開いている時のみ動作
      if (e.key === 'ArrowLeft') {
        changeImage(-1);  // 左矢印キーで前の画像へ
      } else if (e.key === 'ArrowRight') {
        changeImage(1);   // 右矢印キーで次の画像へ
      } else if (e.key === 'Escape') {
        closeModal();     // ESCキーでモーダルを閉じる（便利な追加機能）
      }
    }
  }
  );
});

