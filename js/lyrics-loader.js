// lyrics-loader.js

let currentTrack = null;
let getTrackStatus = null;
let wasPlaying = false; // 記錄上一輪的播放狀態
let lyricsPaused = false; // 追蹤歌詞是否處於暫停狀態
let currentLyricsTime = 0; // 記錄當前歌詞時間位置
let lastLyricsLineIndex = -1;

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
  lyricsDiv.style.visibility = 'visible';

  if (data.syncedLyrics) {
    const lines = parseLRC(data.syncedLyrics);
    lyricsDiv.innerHTML = lines.map(l => `<div class="lyrics-line" data-time="${l.time}">${l.text}</div>`).join('');

    startLyricsInterval(lines);
  } else if (data.plainLyrics) {
    lyricsDiv.textContent = data.plainLyrics;
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
    const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
    return { time, text: match[3].trim() };
  }).filter(Boolean);
}

function clearExistingLyrics() {
  if (window.lyricsInterval) {
    clearInterval(window.lyricsInterval);
    window.lyricsInterval = null;
  }
}

// 暫停歌詞
function pauseLyrics() {
  lyricsPaused = true;
  // 不清除歌詞內容，只暫停更新
}

//恢復歌詞函數
function resumeLyrics() {
  if (!lyricsPaused) return;
  lyricsPaused = false;

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


export function hideLyrics() {
  const lyricsDiv = document.getElementById('lyrics');
  if (lyricsDiv) {
    lyricsDiv.innerHTML = '';
    lyricsDiv.style.visibility = 'hidden';
    lyricsDiv.style.height = '3rem';
  }
  if (window.lyricsInterval) {
    clearInterval(window.lyricsInterval);
    window.lyricsInterval = null;
  }
  lyricsPaused = false;
  currentLyricsTime = 0;
}