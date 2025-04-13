// main.js
let currentArtist = '';
let currentAlbum = '';
// 黑黑
(function() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.style.backgroundColor = '#212121';
    }
  })();
  
  window.onload = () => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    document.querySelector('.toggle-button').textContent = isDark ? '☀️' : '🌙';
    document.body.style.opacity = '1';
  
    if (document.getElementById('avatarContainer')) {
      fetchLatestTrack();
      setInterval(fetchLatestTrack, 6000);
    }
  
    if (document.getElementById('nowPlaying')) {
      fetchNowPlaying();
      setInterval(fetchNowPlaying, 6000);
    }
  };
  
  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    document.querySelector('.toggle-button').textContent = isDark ? '☀️' : '🌙';
    document.documentElement.style.backgroundColor = isDark ? '#212121' : '';
  }
  
  function goToProfile() {
    const pathSegments = location.pathname.split('/');
    const projectRoot = pathSegments.includes('potatomatoyota.github.io') 
      ? '/potatomatoyota.github.io' 
      : '';
    
   
    if (location.protocol === 'file:') {
      // 本機 file:// 
      window.location.href = location.pathname.includes('/article/')
        ? '../profile.html'
        : 'profile.html';
    } else {
      // 在 http(s)://
      window.location.href = projectRoot + '/profile.html';
    }
  }
  
  
  
  
  
  function fetchLatestTrack() {
    fetch("https://lastfm-last-played.biancarosa.com.br/potatomatoyota/latest-song")
      .then(res => res.json())
      .then(data => {
        const track = data.track;
        if (!track) return;
  
        const nowPlaying = track['@attr']?.nowplaying === "true";
        const avatar = document.getElementById('avatarContainer');
        avatar.classList.toggle('playing', nowPlaying);
  
        // 更新lastfm
        document.getElementById('track-name').textContent = track.name;
        // 儲存當前藝人和專輯資訊為全局變量
        currentArtist = track.artist['#text'];
        currentAlbum = track.album['#text'];
        
        document.getElementById('artist-name').textContent = currentArtist;
        document.getElementById('album-name').textContent = currentAlbum;
        document.getElementById('cover').src = track.image?.[3]?.['#text'] || '';
        document.getElementById('music-link').href = track.url;
        document.getElementById('track-status').textContent = nowPlaying
          ? "介紹的歸介紹的，我其實在聽這個"
          : "國文課阻止我聽這歌了";
        document.getElementById('music-link').style.display = 'block';
      })
      .catch(err => console.error("載入歌曲失敗：", err));
  }
  
  function fetchNowPlaying() {
    fetch("https://lastfm-last-played.biancarosa.com.br/potatomatoyota/latest-song")
      .then(res => res.json())
      .then(data => {
        const track = data.track;
        if (!track) return;
  
        const isPlaying = track['@attr']?.nowplaying === 'true';
        const title = track.name;
        const artist = track.artist['#text'];
        const link = track.url;
  
        const display = isPlaying
          ? `🎵 正在聽：<a href="${link}" target="_blank">${artist} - ${title}</a>`
          : `🎵 剛聽：<a href="${link}" target="_blank">${artist} - ${title}</a>`;
        document.getElementById('nowPlaying').innerHTML = display;
  
        const avatarRing = document.getElementById('avatarRing');
        if (avatarRing) {
          avatarRing.classList.toggle('playing', isPlaying);
        }
      })
      .catch(() => {
        document.getElementById('nowPlaying').textContent = '無法載入音樂資訊';
      });
  }
  
  // profile
  function openModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('localVideo');
    modal.style.display = 'flex';
    video.play();
  }
  function closeModal() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('localVideo');
    modal.style.display = 'none';
    video.pause();
    video.currentTime = 0;
  }
  function goToAlbum(event) {
    event.preventDefault();
    const artist = currentArtist.replace(/ /g, '+');
    const album = currentAlbum.replace(/ /g, '+');
    window.open(`https://www.last.fm/zh/music/${artist}/${album}`, '_blank');
  }
  function goToArtist(event) {
    event.preventDefault();
    const artist = currentArtist.replace(/ /g, '+');
    window.open(`https://www.last.fm/zh/music/${artist}`, '_blank');
  }
  // 自動目錄 + 平滑捲動 + 進度條
window.addEventListener('DOMContentLoaded', () => {
  generateTOC();
  initProgressBar();
});

function generateTOC() {
  const toc = document.getElementById('toc');
  const headers = document.querySelectorAll('article h2');
  if (!toc || headers.length === 0) return;

  let list = '<h2>文章目錄</h2><ul style="padding-left: 1.2em;">';
  headers.forEach((h, i) => {
    const id = `section-${i}`;
    h.setAttribute('id', id);
    list += `<li><a href="#${id}">${h.textContent}</a></li>`;
  });
  list += '</ul>';
  toc.innerHTML = list;
}

// 平滑滾動效果（點 TOC）
document.addEventListener('click', e => {
  if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    const target = document.getElementById(targetId);
    if (target) {
      window.scrollTo({
        top: target.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  }
});


