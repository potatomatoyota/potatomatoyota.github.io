async function fetchTrackInfo() {
  const res = await fetch("https://lastfm-last-played.biancarosa.com.br/potatomatoyota/latest-song");
  const data = await res.json();
  const track = data.track;
  const img = track.image.find(img => img.size === "extralarge")?.['#text'];

  document.getElementById("track-name").textContent = track.name;
  document.getElementById("album-artist").textContent = `${track.album['#text']} – ${track.artist['#text']}`;
  document.getElementById("album-cover").src = img;

  extractAndSetBackgroundColor(img);
}

function extractAndSetBackgroundColor(imageUrl) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    document.body.style.backgroundColor = `rgb(${r},${g},${b})`;
  };
}

function setupScrollCarousel() {
  const carousel = document.getElementById("shortcuts-carousel");
  let scrollIndex = 0;
  const cards = carousel.children;
  const total = cards.length;

  carousel.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY > 0) scrollIndex++;
    else scrollIndex--;

    scrollIndex = (scrollIndex + total) % total;

    for (let i = 0; i < total; i++) {
      cards[i].style.display = i === scrollIndex ? "block" : "none";
    }
  });

  // 初始只顯示第一個
  for (let i = 0; i < total; i++) {
    cards[i].style.display = i === 0 ? "block" : "none";
  }
}

fetchTrackInfo();
setupScrollCarousel();
