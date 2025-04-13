document.addEventListener('DOMContentLoaded', function() {
  // 防止閃白處理
  setTimeout(() => {
    document.body.classList.add('loaded');
  }, 100);
  
  // 初始設置
  initializeTheme();
  setupThemeToggle();
  setupAvatarHandling();
  
  // 預先設置預設專輯封面
  setupDefaultCover();
  
  // 載入音樂資訊
  loadMusicInfo();
  setupContactButton();
  setupVideoModal();
  
  // 設置定期刷新音樂資訊 (每15秒刷新一次)
  setInterval(loadMusicInfo, 15000);
});

// 初始化主題設置
function initializeTheme() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  const htmlElement = document.documentElement;
  
  if (isDarkMode) {
    htmlElement.classList.add('dark-mode');
    htmlElement.style.backgroundColor = '#212121';
  } else {
    htmlElement.classList.remove('dark-mode');
    htmlElement.style.backgroundColor = '#f9f9f9';
  }
}

// 設置預設專輯封面
function setupDefaultCover() {
  const coverElement = document.getElementById('cover');
  if (coverElement) {
    coverElement.src = 'img/default-cover.jpg';
    coverElement.alt = '載入中...';
  }
}

// 設置深淺色模式切換按鈕
function setupThemeToggle() {
  const toggleButton = document.getElementById('themeToggle');
  
  if (!toggleButton) return;
  
  toggleButton.addEventListener('click', toggleDarkMode);
  
  // 更新按鈕圖示
  updateToggleButtonIcon();
}

// 切換深淺色模式
function toggleDarkMode() {
  const htmlElement = document.documentElement;
  const isDarkMode = htmlElement.classList.toggle('dark-mode');
  
  // 保存使用者偏好
  localStorage.setItem('darkMode', isDarkMode);
  
  // 更新背景色，避免閃白
  htmlElement.style.backgroundColor = isDarkMode ? '#212121' : '#f9f9f9';
  
  // 更新按鈕圖示
  updateToggleButtonIcon();
}

// 更新深淺色模式按鈕圖示
function updateToggleButtonIcon() {
  const toggleButton = document.getElementById('themeToggle');
  
  if (!toggleButton) return;
  
  const isDarkMode = document.documentElement.classList.contains('dark-mode');
  toggleButton.textContent = isDarkMode ? '🌙' : '☀️';
  toggleButton.setAttribute('aria-label', isDarkMode ? '切換至淺色模式' : '切換至深色模式');
}

// 設置頭像處理
function setupAvatarHandling() {
  const avatarContainer = document.getElementById('avatarContainer');
  if (!avatarContainer) return;
  
  // 可能已經使用 <a> 標籤包裹，所以這裡不需額外處理
}

// 載入音樂播放資訊
function loadMusicInfo() {
  // 獲取設置的所有元素
  const elements = {
    musicLink: document.getElementById('music-link'),
    trackName: document.getElementById('track-name'),
    artistName: document.getElementById('artist-name'),
    albumName: document.getElementById('album-name'),
    trackStatus: document.getElementById('track-status'),
    cover: document.getElementById('cover'),
    nowPlaying: document.getElementById('nowPlaying'),
    avatarRing: document.getElementById('avatarRing')
  };
  
  // 檢查是否在相關頁面上
  const isProfilePage = !!elements.nowPlaying;
  const isHomePage = !!(elements.musicLink && elements.trackName && elements.artistName && 
                       elements.albumName && elements.trackStatus && elements.cover);
  
  if (!isProfilePage && !isHomePage) return;
  
  // 顯示載入指示器
  if (isProfilePage && elements.nowPlaying) {
    elements.nowPlaying.textContent = '正在更新音樂資訊...';
  }
  
  // 使用提供的API URL
  const apiUrl = 'https://lastfm-last-played.biancarosa.com.br/potatomatoyota/latest-song';
  
  // 獲取音樂資訊
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API回應錯誤: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.track) {
        throw new Error('沒有找到音樂資訊');
      }
      
      // 處理API返回的數據，適應新的資料結構
      const track = data.track;
      const trackInfo = {
        name: track.name || '未知歌曲',
        artist: track.artist['#text'] || '未知藝人',
        album: track.album['#text'] || '未知專輯',
        url: track.url || '#',
        // 優先選擇最大尺寸的圖片，如果不存在則依次檢查小尺寸
        image: getAlbumCoverImage(track.image),
        nowPlaying: track['@attr'] && track['@attr'].nowplaying === 'true'
      };
      
      // 記錄最後更新時間
      trackInfo.lastUpdated = new Date().toLocaleTimeString();
      
      if (isProfilePage) {
        updateProfilePageMusic(elements, trackInfo);
      }
      
      if (isHomePage) {
        updateHomePageMusic(elements, trackInfo);
      }
      
      // 將數據存儲到本地，以便頁面刷新時可以顯示
      localStorage.setItem('lastMusicInfo', JSON.stringify(trackInfo));
    })
    .catch(error => {
      console.error('載入音樂資訊時發生錯誤:', error);
      
      // 嘗試使用本地存儲的音樂資訊
      const cachedInfo = localStorage.getItem('lastMusicInfo');
      if (cachedInfo) {
        try {
          const trackInfo = JSON.parse(cachedInfo);
          
          if (isProfilePage) {
            updateProfilePageMusic(elements, trackInfo);
            elements.nowPlaying.innerHTML += ' (來自緩存)';
          }
          
          if (isHomePage) {
            updateHomePageMusic(elements, trackInfo);
          }
        } catch (e) {
          console.error('解析緩存音樂資訊時發生錯誤:', e);
        }
      }
      
      // 更新錯誤訊息到頁面
      if (isProfilePage && elements.nowPlaying && !cachedInfo) {
        elements.nowPlaying.textContent = '載入音樂資訊時發生錯誤';
      }
    });
}

// 從回傳的圖片陣列中獲取最佳專輯封面
function getAlbumCoverImage(imageArray) {
  if (!imageArray || !Array.isArray(imageArray) || imageArray.length === 0) {
    return 'img/default-cover.jpg';
  }
  
  // 尺寸優先順序: extralarge > large > medium > small
  const sizes = ['extralarge', 'large', 'medium', 'small'];
  
  for (const size of sizes) {
    const img = imageArray.find(img => img.size === size);
    if (img && img['#text'] && img['#text'].trim() !== '') {
      return img['#text'];
    }
  }
  
  // 如果沒有找到有效的圖片URL，則使用預設圖片
  return 'img/default-cover.jpg';
}

// 更新個人頁面的音樂資訊
function updateProfilePageMusic(elements, trackInfo) {
  if (!elements.nowPlaying) return;
  
  // 更新頭像環狀指示器
  if (trackInfo.nowPlaying && elements.avatarRing) {
    elements.avatarRing.classList.add('playing');
  } else if (elements.avatarRing) {
    elements.avatarRing.classList.remove('playing');
  }
  
  // 更新現正播放資訊
  elements.nowPlaying.innerHTML = trackInfo.nowPlaying ? 
    `🎧 正在收聽: <a href="${trackInfo.url}" target="_blank" rel="noopener">${trackInfo.name}</a> - ${trackInfo.artist}` : 
    `🎵 最近收聽: <a href="${trackInfo.url}" target="_blank" rel="noopener">${trackInfo.name}</a> - ${trackInfo.artist}`;
    
  // 加入專輯名稱和更新時間
  elements.nowPlaying.innerHTML += `<br><small>專輯: ${trackInfo.album} | 更新於: ${trackInfo.lastUpdated || '未知'}</small>`;
}

// 更新首頁的音樂資訊
function updateHomePageMusic(elements, trackInfo) {
  // 更新音樂卡片資訊
  elements.trackName.textContent = trackInfo.name;
  elements.artistName.textContent = trackInfo.artist;
  elements.albumName.textContent = trackInfo.album;
  elements.trackStatus.textContent = trackInfo.nowPlaying ? '介紹的歸介紹，我聽這個' : '國文課阻止我聽這個了';
  
  // 預載圖片並處理載入和錯誤
  const newImage = new Image();
  
  newImage.onload = function() {
    // 圖片載入成功後，更新顯示
    elements.cover.src = trackInfo.image;
    elements.cover.alt = `${trackInfo.album} 專輯封面`;
  };
  
  newImage.onerror = function() {
    // 圖片載入失敗，使用預設圖片
    elements.cover.src = 'img/default-cover.jpg';
    elements.cover.alt = '默認專輯封面';
    console.log('專輯封面載入失敗，使用預設圖片');
  };
  
  // 開始載入圖片
  newImage.src = trackInfo.image;
  
  // 設置音樂連結
  elements.musicLink.href = trackInfo.url;
  
  // 顯示音樂卡片
  elements.musicLink.classList.remove('hidden');
  
  // 清除現有的事件監聽器
  const newArtistElement = elements.artistName.cloneNode(true);
  const newAlbumElement = elements.albumName.cloneNode(true);
  elements.artistName.parentNode.replaceChild(newArtistElement, elements.artistName);
  elements.albumName.parentNode.replaceChild(newAlbumElement, elements.albumName);
  
  // 為藝人和專輯名稱添加點擊事件
  newArtistElement.addEventListener('click', function(e) {
    e.stopPropagation();
    window.open(`https://www.last.fm/music/${encodeURIComponent(trackInfo.artist)}`, '_blank');
  });
  
  newAlbumElement.addEventListener('click', function(e) {
    e.stopPropagation();
    window.open(`https://www.last.fm/music/${encodeURIComponent(trackInfo.artist)}/${encodeURIComponent(trackInfo.album)}`, '_blank');
  });
}

// 設置聯絡按鈕
function setupContactButton() {
  const contactBtn = document.getElementById('contactBtn');
  
  if (!contactBtn) return;
  
  contactBtn.addEventListener('click', function() {
    const videoModal = document.getElementById('videoModal');
    if (videoModal) {
      videoModal.classList.add('show');
      videoModal.setAttribute('aria-hidden', 'false');
      
      const video = document.getElementById('localVideo');
      if (video) {
        video.play().catch(e => console.log('自動播放失敗:', e));
      }
    }
  });
}

// 設置影片模態視窗
function setupVideoModal() {
  const videoModal = document.getElementById('videoModal');
  const closeButton = document.querySelector('.close-button');
  const video = document.getElementById('localVideo');
  
  if (!videoModal || !closeButton || !video) return;
  
  // 點擊關閉按鈕
  closeButton.addEventListener('click', closeVideoModal);
  
  // 點擊模態視窗背景也關閉
  videoModal.addEventListener('click', function(e) {
    if (e.target === videoModal) {
      closeVideoModal();
    }
  });
  
  // ESC 鍵關閉模態視窗
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && videoModal.classList.contains('show')) {
      closeVideoModal();
    }
  });
}

// 關閉影片模態視窗
function closeVideoModal() {
  const videoModal = document.getElementById('videoModal');
  const video = document.getElementById('localVideo');
  
  if (videoModal) {
    videoModal.classList.remove('show');
    videoModal.setAttribute('aria-hidden', 'true');
  }
  
  if (video) {
    video.pause();
    video.currentTime = 0;
  }
}

// 前往個人頁面
function goToProfile() {
  window.location.href = 'profile.html';
}