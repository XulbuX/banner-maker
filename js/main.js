const initTxt = `Sample
Banner Text`;
const initTxtColor = '#FFFFFF';
const initCardTint = '#FFFFFF';
const initImg = 'assets/img/banner_img_sample.jpg';
const initFixWidth = null;
const initFixHeight = 360;

const inputTxt = document.getElementById('input-txt');
const inputTxtColor = document.getElementById('input-txt-color');
const inputCardTint = document.getElementById('input-card-tint');
const inputImg = document.getElementById('input-img');
const inputFixWidth = document.getElementById('input-fix-width');
const inputFixHeight = document.getElementById('input-fix-height');
const bannerPreview = document.getElementById('banner-preview');
const previewTxt = document.getElementById('preview-txt');
const previewCard = document.getElementById('preview-card');
const previewImg = document.getElementById('preview-img');
const previewDragHint = document.getElementById('preview-drag-hint');

let currentImg = null;
let imgPosX = 50, imgPosY = 50; // PERCENTAGE (0-100)
let imgOffsetX = 0, imgOffsetY = 0; // PIXEL OFFSET FROM CENTER
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragStartOffsetX = 0, dragStartOffsetY = 0;

function setInitValues() {
  inputTxt.value = initTxt;
  inputTxtColor.value = initTxtColor;
  inputCardTint.value = initCardTint;
  inputFixWidth.value = initFixWidth;
  inputFixHeight.value = initFixHeight;
  previewTxt.innerHTML = initTxt.replace(/\n/g, '<br>');
  previewTxt.style.color = initTxtColor;
  previewTxt.style.setProperty('--txt-shadow-color', initTxtColor);
  updateCardTint(initCardTint);

  setFixWidth(initFixWidth);
  setFixHeight(initFixHeight);

  fetch(initImg)
    .then(response => response.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentImg = e.target.result;
        previewImg.src = currentImg;
        previewImg.classList.add('loaded');
      };
      reader.readAsDataURL(blob);
    })
    .catch(err => {
      bannerPreview.style.height = '300px';
      console.warn('Couldn\'t load sample image:', err);
    });
}

setInitValues();

function setFixWidth(width = null) {
  if (width == null || isNaN(width)) {
    bannerPreview.style.width = 'auto';
  }
  else {
    if (width < 500) {
      width = 500;
    } else if (width > 10_000) {
      width = 10_000;
      inputFixWidth.value = width;
    }
    bannerPreview.style.width = `${width}px`;
  }
  updateImageDraggability();
}

function setFixHeight(height = null) {
  if (height == null || isNaN(height)) {
    bannerPreview.style.height = 'auto';
  }
  else {
    if (height < 140) {
      height = 140;
    } else if (height > 1000) {
      height = 1000;
      inputFixHeight.value = height;
    }
    bannerPreview.style.height = `${height}px`;
  }
  updateImageDraggability();
}

function updateImagePosition() {
  const bannerRect = bannerPreview.getBoundingClientRect();
  const imgAspect = previewImg.naturalWidth / previewImg.naturalHeight;
  const bannerAspect = bannerRect.width / bannerRect.height;

  // CALCULATE THE DISPLAYABLE IMAGE DIMENSIONS AND OVERFLOW
  let displayWidth, displayHeight, overflowX = 0, overflowY = 0;

  if (imgAspect > bannerAspect) {
    // IMAGE IS WIDER - WILL OVERFLOW HORIZONTALLY
    displayHeight = bannerRect.height;
    displayWidth = displayHeight * imgAspect;
    overflowX = displayWidth - bannerRect.width;
  } else {
    // IMAGE IS TALLER - WILL OVERFLOW VERTICALLY
    displayWidth = bannerRect.width;
    displayHeight = displayWidth / imgAspect;
    overflowY = displayHeight - bannerRect.height;
  }

  // CONVERT PIXEL OFFSET TO PERCENTAGE, CLAMPING TO VALID RANGE
  if (overflowX > 0) {
    const maxOffset = overflowX / 2;
    const clampedOffsetX = Math.max(-maxOffset, Math.min(maxOffset, imgOffsetX));
    imgPosX = 50 + (clampedOffsetX / overflowX) * 100;
    imgOffsetX = clampedOffsetX; // UPDATE TO CLAMPED VALUE
  } else {
    imgPosX = 50;
    imgOffsetX = 0;
  }

  if (overflowY > 0) {
    const maxOffset = overflowY / 2;
    const clampedOffsetY = Math.max(-maxOffset, Math.min(maxOffset, imgOffsetY));
    imgPosY = 50 + (clampedOffsetY / overflowY) * 100;
    imgOffsetY = clampedOffsetY; // UPDATE TO CLAMPED VALUE
  } else {
    imgPosY = 50;
    imgOffsetY = 0;
  }

  previewImg.style.objectPosition = `${imgPosX}% ${imgPosY}%`;
}

function updateImageDraggability() {
  if (!previewImg.naturalWidth || !previewImg.naturalHeight) return;

  const fixWidth = parseInt(inputFixWidth.value, 10);
  const fixHeight = parseInt(inputFixHeight.value, 10);
  const bannerRect = bannerPreview.getBoundingClientRect();

  const imgAspect = previewImg.naturalWidth / previewImg.naturalHeight;
  const bannerAspect = bannerRect.width / bannerRect.height;

  // DETERMINE IF IMAGE IS CROPPED ON X OR Y AXIS
  const canDragX = (fixWidth || fixHeight) && imgAspect > bannerAspect;
  const canDragY = (fixWidth || fixHeight) && imgAspect < bannerAspect;

  if (canDragX || canDragY) {
    // SET CURSOR BASED ON DRAG DIRECTION
    if (canDragX && canDragY)
      previewImg.style.cursor = 'move';
    else if (canDragX)
      previewImg.style.cursor = 'ew-resize';
    else if (canDragY)
      previewImg.style.cursor = 'ns-resize';
    previewImg.dataset.draggable = 'true';
    previewImg.dataset.dragX = canDragX;
    previewImg.dataset.dragY = canDragY;
    previewDragHint.classList.add('visible');
  } else {
    previewImg.style.cursor = 'default';
    previewImg.dataset.draggable = 'false';
    previewDragHint.classList.remove('visible');
    // RESET POSITION WHEN NOT CROPPED
    imgPosX = 50, imgPosY = 50;
    imgOffsetX = 0, imgOffsetY = 0;
    updateImagePosition();
  }
}

// UPDATE TEXT CONTENT
inputTxt.addEventListener('input', (e) => {
  const text = e.target.value || '';
  previewTxt.innerHTML = text.replace(/\n/g, '<br>');
});

// UPDATE TEXT COLOR
inputTxtColor.addEventListener('input', (e) => {
  previewTxt.style.color = e.target.value;
  previewTxt.style.setProperty('--txt-shadow-color', e.target.value);
});

// UPDATE CARD TINT COLOR
inputCardTint.addEventListener('input', (e) => {
  updateCardTint(e.target.value);
});

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

function updateCardTint(color) {
  const rgb = hexToRgb(color);
  const bgGradient = `linear-gradient(135deg, 
    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25) 0%, 
    rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15) 100%)`;
  previewCard.style.background = bgGradient;
}

// HANDLE IMAGE UPLOAD
inputImg.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (event) => {
      currentImg = event.target.result;
      previewImg.src = currentImg;
      previewImg.classList.add('loaded');
      imgPosX = 50;
      imgPosY = 50;
      imgOffsetX = 0;
      imgOffsetY = 0;
      updateImagePosition();
      setFixWidth(parseInt(inputFixWidth.value, 10));
      setFixHeight(parseInt(inputFixHeight.value, 10));
    };
    reader.readAsDataURL(file);
  }
  else {
    setFixHeight(320);
  }
});

// IMAGE LOADED EVENT - UPDATE DRAGGABILITY
previewImg.addEventListener('load', () => {
  updateImageDraggability();
});

// HANDLE FIX WIDTH INPUT
inputFixWidth.addEventListener('input', (e) => {
  setFixWidth(parseInt(e.target.value, 10));
});

// HANDLE FIX HEIGHT INPUT
inputFixHeight.addEventListener('input', (e) => {
  setFixHeight(parseInt(e.target.value, 10));
});

// IMAGE DRAG FUNCTIONALITY (MOUSE & TOUCH)
function startDrag(clientX, clientY) {
  if (previewImg.dataset.draggable !== 'true') return false;

  isDragging = true;
  dragStartX = clientX;
  dragStartY = clientY;
  dragStartOffsetX = imgOffsetX;
  dragStartOffsetY = imgOffsetY;

  previewImg.style.userSelect = 'none';
  return true;
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;

  const canDragX = previewImg.dataset.dragX === 'true';
  const canDragY = previewImg.dataset.dragY === 'true';

  if (canDragX) {
    // DIRECT PIXEL-BASED MOVEMENT (INVERTED BECAUSE OBJECT-POSITION WORKS OPPOSITE TO DRAG DIRECTION)
    const deltaX = clientX - dragStartX;
    imgOffsetX = dragStartOffsetX - deltaX;
  }

  if (canDragY) {
    // DIRECT PIXEL-BASED MOVEMENT (INVERTED BECAUSE OBJECT-POSITION WORKS OPPOSITE TO DRAG DIRECTION)
    const deltaY = clientY - dragStartY;
    imgOffsetY = dragStartOffsetY - deltaY;
  }

  updateImagePosition();
}

function endDrag() {
  if (isDragging) {
    isDragging = false;
    previewImg.style.userSelect = '';
  }
}

// MOUSE EVENTS
previewImg.addEventListener('mousedown', (e) => {
  if (startDrag(e.clientX, e.clientY))
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
document.addEventListener('mouseup', () => endDrag());

// TOUCH EVENTS
previewImg.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    if (startDrag(touch.clientX, touch.clientY))
      e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', () => endDrag());
document.addEventListener('touchcancel', () => endDrag());

// DYNAMIC NOISE TEXTURE GENERATION
function generateNoiseTexture(width, height) {
  const svg = `
    <svg viewBox='0 0 ${width} ${height}' xmlns='http://www.w3.org/2000/svg'>
      <filter id='noiseFilter'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
    </svg>
  `.trim();

  const encoded = encodeURIComponent(svg);
  return `url("data:image/svg+xml,${encoded}")`;
}

function updateNoiseTexture() {
  const rect = previewCard.getBoundingClientRect();
  const noiseUrl = generateNoiseTexture(Math.ceil(rect.width), Math.ceil(rect.height));
  previewCard.style.setProperty('--noise-texture', noiseUrl);
}

// DEBOUNCE FUNCTION TO PREVENT EXCESSIVE CALLS
let resizeTimeout;
function debounce(func, delay) {
  return function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(func, delay);
  };
}

const resizeObserver = new ResizeObserver(debounce(() => updateNoiseTexture(), 100));
resizeObserver.observe(previewCard);

updateNoiseTexture();

// EXPORT BANNER FUNCTIONALITY
const dlBtn = document.getElementById('dl-btn');
dlBtn.addEventListener('click', () => {
  if (!currentImg) {
    alert('Please upload an image first!');
    return;
  }

  const fixWidth = parseInt(inputFixWidth.value, 10) || null;
  const fixHeight = parseInt(inputFixHeight.value, 10) || null;

  exportBanner(
    bannerPreview,
    previewImg,
    previewCard,
    previewTxt,
    fixWidth,
    fixHeight,
    inputCardTint.value,
    imgPosX,
    imgPosY
  );
});
