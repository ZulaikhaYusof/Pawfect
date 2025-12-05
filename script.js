// ===================================================
// === SELECT ELEMENTS ===
// ===================================================
const catImg = document.getElementById("cat-image");
const nextCatImg = document.getElementById("next-cat"); // peek-behind cat
const likeCount = document.getElementById("like-count");
const likedGrid = document.getElementById("liked-cats-grid");

const popup = document.getElementById("no-more-cats-popup");
const closeBtn = document.getElementById("close-popup");
const refreshBtn = document.getElementById("refresh-cats");

const likedAlbum = document.getElementById("liked-album");
const likedAlbumGrid = document.getElementById("liked-album-grid");
const closeLikedAlbum = document.getElementById("close-liked-album");

const albumViewer = document.getElementById("album-viewer");
const albumViewerImg = document.getElementById("viewer-album-img");
const closeAlbumViewer = document.getElementById("close-album-viewer");

// ===================================================
// === SETTINGS & STATE ===
// ===================================================
const maxCats = 10;
let deck = [];      // cats available to swipe
let history = [];   // cats already swiped (liked/disliked)

// ===================================================
// === FETCH RANDOM CAT ===
// ===================================================
async function fetchCat() {
    try {
        const res = await fetch("https://cataas.com/cat?json=true", {
            cache: "no-store" // avoid cache metadata
        });
        const data = await res.json();
        return "https://cataas.com/cat/" + data.id;
    } catch (e) {
        console.error("Cat API error:", e);
        return null;
    }
}

// ===================================================
// === INITIALIZE DECK (PARALLEL FETCH) ===
// ===================================================
async function initDeck() {
    deck = [];

    // fetch multiple cats in parallel
    const promises = Array.from({ length: maxCats }, () => fetchCat());
    const urls = await Promise.all(promises);

    // filter out failed fetches
    deck = urls.filter(Boolean).map(url => ({ url, liked: false }));

    showCats();
}

// ===================================================
// === SHOW CURRENT + NEXT CAT ===
// ===================================================
function showCats() {
    if (deck.length > 0) {
        catImg.src = deck[0].url;
        nextCatImg.src = deck[1] ? deck[1].url : "";

        // preload next-next image for smooth swipe
        if (deck[2]) {
            const preload = new Image();
            preload.src = deck[2].url;
        }
    } else {
        catImg.src = "";
        nextCatImg.src = "";
        if (history.length >= maxCats) popup.style.display = "flex";
    }
}

// ===================================================
// === UPDATE SUMMARY GRID ===
// ===================================================
function updateSummary() {
    likedGrid.innerHTML = "";
    const likedCats = history.filter(c => c.liked);
    const maxVisible = 6;

    likedCats.slice(0, maxVisible).forEach(c => {
        const div = document.createElement("div");
        div.className = "cat-thumb";
        const img = new Image();
        img.src = c.url;
        img.alt = "Liked cat";
        div.appendChild(img);
        likedGrid.appendChild(div);
    });

    // Show "+N" overlay if more than maxVisible
    const extra = likedCats.length - maxVisible;
    if (extra > 0) {
        const lastThumb = likedGrid.children[maxVisible - 1];
        if (lastThumb) {
            const overlay = document.createElement("div");
            overlay.className = "more-overlay";
            overlay.textContent = `+${extra}`;
            lastThumb.appendChild(overlay);
        }
    }

    likeCount.textContent = likedCats.length;
}

// ===================================================
// === HANDLE LIKE / DISLIKE ===
// ===================================================
function handleLike() {
    if (!deck.length) return;
    const cat = deck.shift();
    cat.liked = true;
    history.push(cat);
    updateSummary();
    animateLike();
    showCats();
    if (!deck.length && history.length >= maxCats) popup.style.display = "flex";
}

function handleDislike() {
    if (!deck.length) return;
    const cat = deck.shift();
    cat.liked = false;
    history.push(cat);
    updateSummary();
    showCats();
    if (!deck.length && history.length >= maxCats) popup.style.display = "flex";
}

// ===================================================
// === BACK BUTTON ===
// ===================================================
document.getElementById("back").addEventListener("click", () => {
    if (!history.length) return;
    const last = history.pop();
    deck.unshift(last);
    updateSummary();
    showCats();
});

// ===================================================
// === BUTTON LISTENERS ===
// ===================================================
document.getElementById("like").addEventListener("click", handleLike);
document.getElementById("dislike").addEventListener("click", handleDislike);

// ===================================================
// === POPUP BUTTONS ===
// ===================================================
closeBtn.addEventListener("click", () => popup.style.display = "none");
refreshBtn.addEventListener("click", async () => {
    popup.style.display = "none";
    await initDeck();
});

// ===================================================
// === LIKE COUNT ANIMATION ===
// ===================================================
function animateLike() {
    likeCount.classList.add("animate");
    setTimeout(() => likeCount.classList.remove("animate"), 500);
}

// ===================================================
// === SWIPE HANDLER ===
// ===================================================
let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;
const ROTATE_MAX = 15, SWIPE_THRESHOLD = 100;

catImg.addEventListener("pointerdown", e => {
    startX = e.clientX; startY = e.clientY; isDragging = true;
    catImg.setPointerCapture(e.pointerId);
    catImg.classList.add("dragging");
});

catImg.addEventListener("pointermove", e => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;
    let rotate = Math.max(Math.min(currentX / 10, ROTATE_MAX), -ROTATE_MAX);
    catImg.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
});

catImg.addEventListener("pointerup", e => {
    if (!isDragging) return;
    isDragging = false;
    catImg.classList.remove("dragging");
    let rotate = Math.max(Math.min(currentX / 10, ROTATE_MAX), -ROTATE_MAX);

    if (currentX > SWIPE_THRESHOLD) {
        catImg.style.transition = "transform 0.5s ease-out";
        catImg.style.transform = `translateX(1000px) rotate(${rotate}deg)`;
        setTimeout(() => { handleLike(); resetCard(); }, 500);
    } else if (currentX < -SWIPE_THRESHOLD) {
        catImg.style.transition = "transform 0.5s ease-out";
        catImg.style.transform = `translateX(-1000px) rotate(${rotate}deg)`;
        setTimeout(() => { handleDislike(); resetCard(); }, 500);
    } else {
        catImg.style.transition = "transform 0.3s ease";
        catImg.style.transform = "translateX(0px) rotate(0deg)";
    }

    currentX = 0; currentY = 0;
});

function resetCard() {
    catImg.style.transition = "none";
    catImg.style.transform = "translateX(0px) rotate(0deg)";
}

// ===================================================
// === LIKED ALBUM / ENLARGED VIEW ===
// ===================================================
likedGrid.addEventListener("click", e => {
    if (e.target.tagName === "IMG") {
        // open clicked liked cat in album viewer
        albumViewerImg.src = e.target.src;
        albumViewer.style.display = "flex";
    } else if (e.target.classList.contains("more-overlay")) {
        // open liked album popup
        likedAlbumGrid.innerHTML = "";
        const likedCats = history.filter(c => c.liked);
        likedCats.forEach(c => {
            const thumb = document.createElement("img");
            thumb.src = c.url;
            likedAlbumGrid.appendChild(thumb);

            // click thumbnail → open album viewer
            thumb.addEventListener("click", event => {
                event.stopPropagation();
                albumViewerImg.src = c.url;
                albumViewer.style.display = "flex";
            });
        });
        likedAlbum.style.display = "flex";
    }
});

// Close liked album
closeLikedAlbum.addEventListener("click", e => {
    e.stopPropagation();
    likedAlbum.style.display = "none";
});

// Click outside liked album → close
likedAlbum.addEventListener("click", e => {
    if (e.target === likedAlbum) likedAlbum.style.display = "none";
});

// Close album viewer
closeAlbumViewer.addEventListener("click", e => {
    e.stopPropagation();
    albumViewer.style.display = "none";
});
albumViewer.addEventListener("click", e => {
    if (e.target === albumViewer) albumViewer.style.display = "none";
});

// ===================================================
// === START APP ===
// ===================================================
initDeck();
