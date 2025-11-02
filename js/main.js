const initTxt = 'Sample Banner Text';
const initTxtColor = '#FFFFFF';
const initCardTint = '#FFFFFF';
const initImg = 'assets/img/banner_img_sample.jpg';
const initFixWidth = null;
const initFixHeight = 320;

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

let currentImg = null;

function setInitValues() {
  inputTxt.value = initTxt;
  inputTxtColor.value = initTxtColor;
  inputCardTint.value = initCardTint;
  inputFixWidth.value = initFixWidth;
  inputFixHeight.value = initFixHeight;
  previewTxt.textContent = initTxt;
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
      bannerPreview.style.height = '320px';
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
}

// UPDATE TEXT CONTENT
inputTxt.addEventListener('input', (e) => {
  previewTxt.textContent = e.target.value || '';
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
      setFixWidth(parseInt(inputFixWidth.value, 10));
      setFixHeight(parseInt(inputFixHeight.value, 10));
    };
    reader.readAsDataURL(file);
  }
  else {
    setFixHeight(320);
  }
});

// HANDLE FIX WIDTH INPUT
inputFixWidth.addEventListener('input', (e) => {
  setFixWidth(parseInt(e.target.value, 10));
});

// HANDLE FIX HEIGHT INPUT
inputFixHeight.addEventListener('input', (e) => {
  setFixHeight(parseInt(e.target.value, 10));
});

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
    fixHeight
  );
});
