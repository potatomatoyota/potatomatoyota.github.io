// lyrics-loader.js

let currentTrack = null;
let getTrackStatus = null;
let wasPlaying = false; // 記錄上一輪的播放狀態
let lyricsPaused = false; // 追蹤歌詞是否處於暫停狀態
let currentLyricsTime = 0; // 記錄當前歌詞時間位置
let lastLyricsLineIndex = -1;
let unsyncedLyricsTimer = null;
let pauseHideTimer = null; // 新增: 用於暫停後隱藏歌詞的計時器

setInterval(() => {
  if (!getTrackStatus) return;

  const latestTrack = getTrackStatus();
  if (!latestTrack) return;

  const isNowPlaying = latestTrack['@attr']?.nowplaying === 'true';

  if (isNowPlaying && !wasPlaying) {
    console.log('偵測到歌曲重新播放，重新載入歌詞');
    if (lyricsPaused) {
      resumeLyrics(); // 如果歌詞已暫停，恢復播放
    } else {
      loadLyrics(latestTrack); // 重新載入
    }
  }

  if (!isNowPlaying && wasPlaying) {
    console.log('偵測到歌曲已停止播放，暫停歌詞');
    pauseLyrics(); // 暫停歌詞
  }

  wasPlaying = isNowPlaying;
}, 300);


export function displayUnsyncedLyrics(lines) {
  const lyricsEl = document.getElementById('lyrics');
  if (!lyricsEl) return;

  console.log('顯示非同步歌詞，行數:', lines.length);
  
  lyricsEl.innerHTML = '';
  lyricsEl.style.visibility = 'visible'; // 確保可見
  lyricsEl.style.height = 'auto'; // 調整高度以容納所有歌詞
  lyricsEl.style.display = 'flex';
  
  if (!lyricsEl) return;

  lyricsEl.innerHTML = '';
  lyricsEl.style.visibility = 'visible'; // 確保可見
  lyricsEl.style.height = 'auto'; // 調整高度以容納所有歌詞

  let currentIndex = 0;

  // 建立每句歌詞元素
  const lineEls = lines.map(line => {
    const el = document.createElement('div');
    el.className = 'lyrics-line';
    el.textContent = line;
    lyricsEl.appendChild(el);
    return el;
  });

  function showNextLine() {
    console.log('切換到下一行歌詞', currentIndex); // 添加日誌
    lineEls.forEach(el => el.classList.remove('active'));
    if (lineEls[currentIndex]) {
      lineEls[currentIndex].classList.add('active');
    }
    currentIndex = (currentIndex + 1) % lineEls.length;
  }

  showNextLine(); // 初始顯示第一行

  // 清除舊的 timer，避免多重執行
  if (unsyncedLyricsTimer) clearInterval(unsyncedLyricsTimer);
  unsyncedLyricsTimer = setInterval(showNextLine, 3000);
  console.log('非同步歌詞計時器已設置', unsyncedLyricsTimer); // 添加日誌
}
export function setTrackFetcher(fn) {
  getTrackStatus = fn;
}

export async function loadLyrics(track) {
  currentTrack = track;
  const isNowPlaying = track['@attr']?.nowplaying === 'true';

  if (!isNowPlaying) {
    console.log('非 now playing，取消載入歌詞');
    hideLyrics();
    return;
  }

  const lyricsDiv = document.getElementById('lyrics');
  if (!lyricsDiv) return;

  clearExistingLyrics();
  currentLyricsTime = 0; // 重置歌詞時間
  lyricsPaused = false; // 重置暫停狀態
  
  // 確保歌詞區域顯示
  showLyricsContainer();

  const urls = [
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(track.artist['#text'])}&track_name=${encodeURIComponent(track.name)}&album_name=${encodeURIComponent(track.album['#text'])}`,
    `https://lrclib.net/api/get?artist_name=${encodeURIComponent(track.artist['#text'])}&track_name=${encodeURIComponent(track.name)}`
  ];

  for (let url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data?.syncedLyrics || data?.plainLyrics) {
        displayLyrics(data, lyricsDiv);
        return;
      }
    } catch (err) {
      console.error('歌詞載入失敗:', err);
    }
  }

  lyricsDiv.textContent = '找不到歌詞。';
}

function displayLyrics(data, lyricsDiv) {
  console.log('顯示歌詞，類型:', data.syncedLyrics ? 'synced' : 'plain');
  
  showLyricsContainer(); // 確保歌詞容器可見
  
  if (data.syncedLyrics) {
    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      lyricsDiv.innerHTML = '';
      const lineEls = lines.map(({ time, text }) => {
        const el = document.createElement('div');
        el.className = 'lyrics-line';
        el.textContent = text;
        el.setAttribute('data-time', time.toFixed(2));
        lyricsDiv.appendChild(el);
        return el;
      });
      startLyricsInterval(lines);
    }
  } else if (data.plainLyrics) {
    console.log('處理非同步歌詞，長度:', data.plainLyrics.length);
    const lines = data.plainLyrics.split(/\r?\n/).filter(line => line.trim());
    console.log('處理後的行數:', lines.length);
    displayUnsyncedLyrics(lines);
  }
}

// 啟動歌詞滾動的間隔函數
function startLyricsInterval(lines) {
  if (window.lyricsInterval) {
    clearInterval(window.lyricsInterval);
  }
  
  window.lyricsInterval = setInterval(() => {
    if (lyricsPaused) return; // 如果歌詞已暫停，不更新時間和顯示
    
    currentLyricsTime += 0.3;
    updateLyricsDisplay(lines, currentLyricsTime);
  }, 300);
}

// 更新歌詞顯示
function updateLyricsDisplay(lines, currentTime) {
  const allLines = [...document.querySelectorAll('.lyrics-line')];
  let currentLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (currentTime >= lines[i].time) currentLineIndex = i;
  }

  if (currentLineIndex === lastLyricsLineIndex) return; // 行數沒變就不更新

  allLines.forEach((line, index) => {
    line.classList.toggle('active', index === currentLineIndex);
    if (index === currentLineIndex) {
      line.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });

  lastLyricsLineIndex = currentLineIndex;
}

function parseLRC(lrc) {
  const lines = lrc.split('\n');
  const pattern = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/;
  return lines.map(line => {
    const match = line.match(pattern);
    if (!match) return null;
    let time = parseInt(match[1]) * 60 + parseFloat(match[2]);
    time = Math.max(0, time - 0); // 提前2秒
    return { time, text: match[3].trim() };
  }).filter(Boolean);
}

function clearExistingLyrics() {
  if (window.lyricsInterval) {
    clearInterval(window.lyricsInterval);
    window.lyricsInterval = null;
  }
  if (unsyncedLyricsTimer) {
    clearInterval(unsyncedLyricsTimer);
    unsyncedLyricsTimer = null;
  }
  // 清除暫停隱藏計時器
  if (pauseHideTimer) {
    clearTimeout(pauseHideTimer);
    pauseHideTimer = null;
  }
}


function hideLyricsContainer() {
  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv) {
    // 只修改透明度，保持空間佔位
    lyricsDiv.style.opacity = '0';
    
    // 延遲設置 visibility:hidden，等待淡出完成
    setTimeout(() => {
      // 只有在仍然是暫停狀態時才設置隱藏
      if (lyricsPaused) {
        lyricsDiv.style.visibility = 'hidden';
      }
    }, 500);
  }
}


function showLyricsContainer() {
  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv) {
    // 確保元素可見
    lyricsDiv.style.visibility = 'visible';
    
    // 使用 setTimeout 確保瀏覽器有時間處理 visibility 變更
    setTimeout(() => {
      lyricsDiv.style.opacity = '0.9';
    }, 10);
  }
}


export function hideLyrics() {
  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv) {
    lyricsDiv.innerHTML = '';
    lyricsDiv.style.visibility = 'hidden';
    lyricsDiv.style.opacity = '0';
    
  }
  if (window.lyricsInterval) {
    clearInterval(window.lyricsInterval);
    window.lyricsInterval = null;
  }
  if (pauseHideTimer) {
    clearTimeout(pauseHideTimer);
    pauseHideTimer = null;
  }
  lyricsPaused = false;
  currentLyricsTime = 0;
}
// 暫停歌詞
function pauseLyrics() {
  lyricsPaused = true;
  
  // 清除任何現有的暫停隱藏計時器
  if (pauseHideTimer) {
    clearTimeout(pauseHideTimer);
  }
  
  // 設置 2 秒後隱藏歌詞的計時器
  pauseHideTimer = setTimeout(() => {
    console.log('歌詞暫停 2 秒後隱藏');
    hideLyricsContainer();
  }, 2000);
}

// 恢復歌詞函數
function resumeLyrics() {
  if (!lyricsPaused) return;
  lyricsPaused = false;
  
  // 清除暫停隱藏計時器
  if (pauseHideTimer) {
    clearTimeout(pauseHideTimer);
    pauseHideTimer = null;
  }
  
  // 重新顯示歌詞容器
  showLyricsContainer();

  // 防止多個 interval 同時執行
  if (window.lyricsInterval) return;

  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv && lyricsDiv.querySelectorAll('.lyrics-line').length > 0) {
    const lines = [...lyricsDiv.querySelectorAll('.lyrics-line')].map(line => {
      return {
        time: parseFloat(line.getAttribute('data-time')),
        text: line.textContent
      };
    });
    startLyricsInterval(lines);
  }
}
