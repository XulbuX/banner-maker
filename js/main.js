const initTxt = `Sample
Banner Text`;
const initTxtColor = '#FFFFFF';
const initCardTint = '#FFFFFF';
const initImg = 'assets/img/banner_img_sample.jpg';
const initFixWidth = null;
const initFixHeight = 360;

const fixWidthRange = { min: 500, max: 10000 };
const fixHeightRange = { min: 140, max: 1000 };
const commonAspectRatios = [
  { w: 1, h: 1, label: '1:1 (Square)' },
  { w: 16, h: 9, label: '16:9 (Widescreen)' },
  { w: 9, h: 16, label: '9:16 (Portrait)' },
  { w: 4, h: 3, label: '4:3 (Standard)' },
  { w: 3, h: 4, label: '3:4 (Portrait)' },
  { w: 21, h: 9, label: '21:9 (Ultrawide)' },
  { w: 3, h: 2, label: '3:2 (Classic)' },
  { w: 2, h: 3, label: '2:3 (Portrait)' },
  { w: 5, h: 4, label: '5:4 (Monitor)' },
];

const inputTxt = document.getElementById('input-txt');
const inputTxtColor = document.getElementById('input-txt-color');
const inputCardTint = document.getElementById('input-card-tint');
const inputImg = document.getElementById('input-img');
const inputAspectRatio = document.getElementById('input-aspect-ratio');
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
let isUpdatingAspectRatio = false;

function setInitValues() {
  // POPULATE ASPECT RATIO DATALIST
  const aspectRatioDatalist = document.getElementById('aspect-ratio-presets');
  commonAspectRatios.forEach(ratio => {
    const option = document.createElement('option');
    option.value = `${ratio.w}:${ratio.h}`;
    option.textContent = ratio.label;
    aspectRatioDatalist.appendChild(option);
  });

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

function setFixWidth(width = null, wasAutoSet = false) {
  if (width == null || isNaN(width)) {
    bannerPreview.style.width = 'auto';
  }
  else {
    if (width < fixWidthRange.min) {
      width = fixWidthRange.min;
      if (wasAutoSet)
        inputFixWidth.value = width;
    } else if (width > fixWidthRange.max) {
      width = fixWidthRange.max;
      inputFixWidth.value = width;
    }
    bannerPreview.style.width = `${width}px`;
  }
  updateImageDraggability();
  updateAspectRatioDisplay(previewImg.width, previewImg.height);
}

function setFixHeight(height = null, wasAutoSet = false) {
  if (height == null || isNaN(height)) {
    bannerPreview.style.height = 'auto';
  }
  else {
    if (height < fixHeightRange.min) {
      height = fixHeightRange.min;
      if (wasAutoSet)
        inputFixHeight.value = height;
    } else if (height > fixHeightRange.max) {
      height = fixHeightRange.max;
      inputFixHeight.value = height;
    }
    bannerPreview.style.height = `${height}px`;
  }
  updateImageDraggability();
  updateAspectRatioDisplay(previewImg.width, previewImg.height);
}

function parseAspectRatio(ratioString) {
  // PARSE ASPECT RATIO FROM STRING LIKE "16:9" OR "16/9"
  const match = ratioString.trim().match(/^(\d+(?:\.\d+)?)[:/](\d+(?:\.\d+)?)$/);
  if (match) {
    return {
      width: parseFloat(match[1]),
      height: parseFloat(match[2])
    };
  }
  return null;
}

function applyAspectRatio(ratioString) {
  const ratio = parseAspectRatio(ratioString);
  if (!ratio) return;

  isUpdatingAspectRatio = true;

  const width = parseInt(inputFixWidth.value, 10);
  const height = parseInt(inputFixHeight.value, 10);
  const ratioVal = ratio.width / ratio.height;

  let calcWidth, calcHeight;

  // DETERMINE WHICH DIMENSION TO USE AS BASE
  // IF BOTH ARE SET, USE WIDTH AS BASE
  // IF ONLY ONE IS SET, USE THAT ONE
  // IF NEITHER IS SET, USE A DEFAULT BASE (PREVIEW IMAGE WIDTH OR 1000)
  if (width && !isNaN(width)) {
    calcWidth = width;
    calcHeight = Math.round(width / ratioVal);
  } else if (height && !isNaN(height)) {
    calcHeight = height;
    calcWidth = Math.round(height * ratioVal);
  } else {
    calcWidth = previewImg.width || 1000;
    calcHeight = Math.round(calcWidth / ratioVal);
  }

  // CLAMP TO VALID RANGES AND ADJUST THE OTHER DIMENSION IF NEEDED
  if (calcWidth < fixWidthRange.min) {
    calcWidth = fixWidthRange.min;
    calcHeight = Math.round(calcWidth / ratioVal);
  } else if (calcWidth > fixWidthRange.max) {
    calcWidth = fixWidthRange.max;
    calcHeight = Math.round(calcWidth / ratioVal);
  }

  if (calcHeight < fixHeightRange.min) {
    calcHeight = fixHeightRange.min;
    calcWidth = Math.round(calcHeight * ratioVal);
  } else if (calcHeight > fixHeightRange.max) {
    calcHeight = fixHeightRange.max;
    calcWidth = Math.round(calcHeight * ratioVal);
  }

  // FINAL CLAMP (IN CASE ADJUSTING ONE DIMENSION PUSHED THE OTHER OUT OF RANGE)
  calcWidth = Math.max(fixWidthRange.min, Math.min(fixWidthRange.max, calcWidth));
  calcHeight = Math.max(fixHeightRange.min, Math.min(fixHeightRange.max, calcHeight));

  setFixWidth(calcWidth, true);
  setFixHeight(calcHeight, true);

  isUpdatingAspectRatio = false;
}

function updateAspectRatioDisplay(width, height) {
  if (isUpdatingAspectRatio) return;

  // ONLY UPDATE IF BOTH WIDTH AND HEIGHT ARE SET
  if (width && !isNaN(width) && height && !isNaN(height)) {
    const actualRatio = width / height;

    // CHECK IF ACTUAL RATIO IS CLOSE TO ANY COMMON RATIO (WITHIN 1% TOLERANCE)
    const tolerance = 0.01;
    for (const ratio of commonAspectRatios) {
      const commonRatioVal = ratio.w / ratio.h;
      if (Math.abs(actualRatio - commonRatioVal) / commonRatioVal < tolerance) {
        // CLOSE ENOUGH TO A COMMON RATIO, USE IT
        inputAspectRatio.value = `${ratio.w}:${ratio.h}`;
        return;
      }
    }

    // NOT CLOSE TO ANY COMMON RATIO, CALCULATE GCD TO SIMPLIFY
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    const ratioWidth = width / divisor;
    const ratioHeight = height / divisor;

    inputAspectRatio.value = `${ratioWidth}:${ratioHeight}`;
  } else {
    inputAspectRatio.value = '';
  }
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

// HANDLE ASPECT RATIO INPUT
inputAspectRatio.addEventListener('input', (e) => {
  applyAspectRatio(e.target.value);
});

// SELECT ALL TEXT IN ASPECT RATIO INPUT WHEN FOCUSED
inputAspectRatio.addEventListener('focus', (e) => {
  e.target.select();
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
