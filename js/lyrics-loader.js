// lyrics-loader.js

let currentTrack = null;
let getTrackStatus = null;
let wasPlaying = false; // 新增：紀錄上一輪的播放狀態

setInterval(() => {
  if (!getTrackStatus) return;

  const latestTrack = getTrackStatus();
  if (!latestTrack) return;

  const isNowPlaying = latestTrack['@attr']?.nowplaying === 'true';

  if (isNowPlaying && !wasPlaying) {
    console.log('偵測到歌曲重新播放，重新載入歌詞');
    loadLyrics(latestTrack); // 重新載入
  }

  if (!isNowPlaying && wasPlaying) {
    console.log('偵測到歌曲已停止播放，關閉歌詞');
    hideLyrics();
  }

  wasPlaying = isNowPlaying;
}, 5000);

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

    let currentTime = 2;
    window.lyricsInterval = setInterval(() => {
      currentTime += 0.5;
      const allLines = [...document.querySelectorAll('.lyrics-line')];
      let currentLineIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (currentTime >= lines[i].time) currentLineIndex = i;
      }

      allLines.forEach((line, index) => {
        line.classList.toggle('active', index === currentLineIndex);
        if (index === currentLineIndex) {
          line.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    }, 500);
  } else if (data.plainLyrics) {
    lyricsDiv.textContent = data.plainLyrics;
  }
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

function hideLyrics() {
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
}


