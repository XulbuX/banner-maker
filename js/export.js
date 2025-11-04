/**
 * Helper to get computed CSS value
 * @param {HTMLElement} element - the element to get the style from
 * @param {string} property - the CSS property name
 * @returns {string}
 */
const getComputed = (element, property) => window.getComputedStyle(element).getPropertyValue(property).trim();

/**
 * Convert hex color to RGB object
 * @param {string} hex - hex color string
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Exports the banner as a PNG image
 * @param {HTMLElement} bannerElement - the banner preview element
 * @param {HTMLImageElement} imgElement - the image element inside the banner
 * @param {HTMLElement} cardElement - the card element inside the banner
 * @param {HTMLElement} txtElement - the text element inside the banner
 * @param {number|null} fixWidth - fixed width for export (or null)
 * @param {number|null} fixHeight - fixed height for export (or null)
 * @param {string} cardTintColor - the card tint color in hex format
 * @param {number} imgPosX - horizontal image position percentage (0-100)
 * @param {number} imgPosY - vertical image position percentage (0-100)
 */
async function exportBanner(bannerElement, imgElement, cardElement, txtElement, fixWidth, fixHeight, cardTintColor, imgPosX, imgPosY) {
  try {
    const currentRect = bannerElement.getBoundingClientRect();
    const imgNaturalWidth = imgElement.naturalWidth;
    const imgNaturalHeight = imgElement.naturalHeight;

    let targetWidth, targetHeight;

    if (fixWidth && fixHeight) {
      // USE FIX DIMENSIONS TO CALCULATE ASPECT RATIO, THEN APPLY TO ORIGINAL IMAGE
      const targetAspectRatio = fixWidth / fixHeight;
      const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;

      if (imgAspectRatio > targetAspectRatio) {
        // IMAGE IS WIDER - FIT TO HEIGHT
        targetHeight = imgNaturalHeight;
        targetWidth = Math.round(imgNaturalHeight * targetAspectRatio);
      } else {
        // IMAGE IS TALLER - FIT TO WIDTH
        targetWidth = imgNaturalWidth;
        targetHeight = Math.round(imgNaturalWidth / targetAspectRatio);
      }
    } else if (fixWidth || fixHeight) {
      const previewAspectRatio = currentRect.width / currentRect.height;
      const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;

      if (previewAspectRatio > imgAspectRatio) {
        targetWidth = imgNaturalWidth;
        targetHeight = Math.round(imgNaturalWidth / previewAspectRatio);
      } else {
        targetHeight = imgNaturalHeight;
        targetWidth = Math.round(imgNaturalHeight * previewAspectRatio);
      } 
    } else {
      targetWidth = imgNaturalWidth;
      targetHeight = imgNaturalHeight;
    }

    const scale = targetWidth / currentRect.width;

    // CREATE CANVAS
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    // DRAW BACKGROUND IMAGE
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgElement.src;
    });

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // CALCULATE IMAGE POSITIONING IF CROPPED
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = targetWidth / targetHeight;
    
    let drawX = 0, drawY = 0, drawWidth = targetWidth, drawHeight = targetHeight;
    let sourceX = 0, sourceY = 0, sourceWidth = img.naturalWidth, sourceHeight = img.naturalHeight;
    
    if (imgAspect > targetAspect) {
      // Image is wider - crop horizontally
      const scaledWidth = img.naturalHeight * targetAspect;
      const cropAmount = img.naturalWidth - scaledWidth;
      sourceX = cropAmount * (imgPosX / 100);
      sourceWidth = scaledWidth;
    } else if (imgAspect < targetAspect) {
      // Image is taller - crop vertically
      const scaledHeight = img.naturalWidth / targetAspect;
      const cropAmount = img.naturalHeight - scaledHeight;
      sourceY = cropAmount * (imgPosY / 100);
      sourceHeight = scaledHeight;
    }
    
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);

    // GET CARD MEASUREMENTS
    const cardRect = cardElement.getBoundingClientRect();
    const bannerRect = bannerElement.getBoundingClientRect();

    const cardX = ((cardRect.left - bannerRect.left) / currentRect.width) * targetWidth;
    const cardY = ((cardRect.top - bannerRect.top) / currentRect.height) * targetHeight;
    const cardWidth = (cardRect.width / currentRect.width) * targetWidth;
    const cardHeight = (cardRect.height / currentRect.height) * targetHeight;
    const cardRadius = parseFloat(getComputed(cardElement, 'border-radius')) * scale;

    // CREATE BLURRED BACKDROP
    const blurRadius = 12 * scale;
    const blurCanvas = document.createElement('canvas');
    const padding = Math.ceil(blurRadius * 2);
    blurCanvas.width = cardWidth + padding * 2;
    blurCanvas.height = cardHeight + padding * 2;
    const blurCtx = blurCanvas.getContext('2d');

    blurCtx.drawImage(
      canvas,
      Math.max(0, cardX - padding),
      Math.max(0, cardY - padding),
      Math.min(targetWidth - cardX + padding, blurCanvas.width),
      Math.min(targetHeight - cardY + padding, blurCanvas.height),
      0, 0,
      blurCanvas.width,
      blurCanvas.height
    );

    // APPLY BLUR
    if (typeof StackBlur !== 'undefined') {
      StackBlur.canvasRGB(blurCanvas, 0, 0, blurCanvas.width, blurCanvas.height, Math.round(blurRadius));
    }

    // APPLY SATURATION (180%)
    const imageData = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      data[i] = Math.min(255, Math.max(0, gray + 1.8 * (r - gray)));
      data[i + 1] = Math.min(255, Math.max(0, gray + 1.8 * (g - gray)));
      data[i + 2] = Math.min(255, Math.max(0, gray + 1.8 * (b - gray)));
    }
    blurCtx.putImageData(imageData, 0, 0);

    // DRAW BOX SHADOWS FIRST (BEHIND THE CARD)
    const shadows = [
      { offsetY: 2 * scale, blur: 4 * scale, color: 'rgba(10, 10, 10, 0.1)' },
      { offsetY: 8 * scale, blur: 16 * scale, color: 'rgba(10, 10, 10, 0.2)' },
      { offsetY: 16 * scale, blur: 48 * scale, color: 'rgba(10, 10, 10, 0.3)' }
    ];

    // DRAW SHADOWS MULTIPLE TIMES TO MAKE THEM MORE VISIBLE
    for (let i = 0; i < 3; i++) {
      shadows.forEach(shadow => {
        ctx.save();
        ctx.shadowColor = shadow.color;
        ctx.shadowBlur = shadow.blur;
        ctx.shadowOffsetY = shadow.offsetY;
        ctx.shadowOffsetX = 0;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fill();
        ctx.restore();
      });
    }

    // CREATE A TEMPORARY CANVAS FOR THE CARD CONTENT WITH BLUR AND GRADIENT
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = cardWidth;
    cardCanvas.height = cardHeight;
    const cardCtx = cardCanvas.getContext('2d');

    // DRAW BLURRED BACKGROUND TO CARD CANVAS
    cardCtx.drawImage(blurCanvas, padding, padding, cardWidth, cardHeight, 0, 0, cardWidth, cardHeight);

    // DRAW GRADIENT OVERLAY ON CARD CANVAS WITH CARD TINT COLOR
    const tintRgb = hexToRgb(cardTintColor);
    const gradient = cardCtx.createLinearGradient(0, 0, cardWidth, cardHeight);
    gradient.addColorStop(0, `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.30)`);
    gradient.addColorStop(1, `rgba(${tintRgb.r}, ${tintRgb.g}, ${tintRgb.b}, 0.18)`);
    cardCtx.fillStyle = gradient;
    cardCtx.fillRect(0, 0, cardWidth, cardHeight);

    // CLIP AND DRAW THE CARD WITH ROUNDED CORNERS
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();
    ctx.drawImage(cardCanvas, cardX, cardY);

    // DRAW INSET HIGHLIGHTS (WITHIN THE CLIP REGION)

    // FIRST INSET
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + 0.5, cardY + 0.5, cardWidth - 1, cardHeight - 1, cardRadius);
    ctx.stroke();

    // TOP HIGHLIGHT GRADIENT (INSET LIGHT EFFECT)
    const topGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 12 * scale);
    topGradient.addColorStop(0, 'rgba(250, 250, 250, 0.24)');
    topGradient.addColorStop(1, 'rgba(250, 250, 250, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(cardX, cardY, cardWidth, 12 * scale);

    // GENERATE AND DRAW NOISE TEXTURE
    // SCALE NOISE SIZE PROPORTIONALLY TO MAINTAIN CONSISTENT
    // VISUAL GRAIN SIZE ACROSS DIFFERENT EXPORT RESOLUTIONS
    const noiseSize = Math.round(cardWidth * 0.25);
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = noiseSize;
    noiseCanvas.height = noiseSize;
    const noiseCtx = noiseCanvas.getContext('2d');

    // CREATE NOISE USING 'ImageData'
    const noiseData = noiseCtx.createImageData(noiseSize, noiseSize);
    for (let i = 0; i < noiseData.data.length; i += 4) {
      const noise = Math.random() * 255;
      noiseData.data[i] = noise;
      noiseData.data[i + 1] = noise;
      noiseData.data[i + 2] = noise;
      noiseData.data[i + 3] = 255;
    }
    noiseCtx.putImageData(noiseData, 0, 0);

    // DRAW NOISE WITH OVERLAY BLEND MODE AT 15% OPACITY
    ctx.globalAlpha = 0.15;
    ctx.globalCompositeOperation = 'overlay';
    ctx.imageSmoothingEnabled = false; // DISABLE SMOOTHING TO KEEP SHARP NOISE
    
    // TILE THE NOISE PATTERN TO COVER THE ENTIRE CARD
    const pattern = ctx.createPattern(noiseCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // DRAW TEXT (NEED TO CLIP TO CARD REGION)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();

    // GET TEXT LINES (SPLIT BY <br> TAGS)
    const textHTML = txtElement.innerHTML;
    const explicitLines = textHTML.split('<br>');

    const fontSize = parseFloat(getComputed(txtElement, 'font-size')) * scale;
    const fontWeight = getComputed(txtElement, 'font-weight');
    const fontFamily = getComputed(txtElement, 'font-family');
    const textColor = getComputed(txtElement, 'color');

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // WORD WRAP FUNCTION - SPLITS LONG LINES TO FIT WITHIN CARD WIDTH
    const maxTextWidth = cardWidth - (30 * 2 * scale); // ACCOUNT FOR PADDING
    const textLines = [];

    explicitLines.forEach(line => {
      // PRESERVE EMPTY LINES
      if (!line || line.trim() === '') {
        textLines.push('');
        return;
      }

      const words = line.split(' ');
      let currentLine = '';

      words.forEach((word, index) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxTextWidth && currentLine) {
          textLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });

      if (currentLine)
        textLines.push(currentLine);
    });

    // CALCULATE LINE HEIGHT AND POSITIONING FOR MULTI-LINE TEXT

    const lineHeight = fontSize * 1.2;
    const totalTextHeight = textLines.length * lineHeight;

    const textX = cardX + cardWidth / 2;
    // CENTER TEXT VISUALLY BY USING ALPHABETIC BASELINE AND OFFSETTING BY HALF THE VISUAL HEIGHT
    const textY = cardY + cardHeight / 2 - totalTextHeight / 2 + lineHeight * 0.8;

    // PARSE TEXT COLOR TO GET RGB VALUES
    const colorMatch = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    let r = 255, g = 255, b = 255;
    if (colorMatch) {
      r = parseInt(colorMatch[1]);
      g = parseInt(colorMatch[2]);
      b = parseInt(colorMatch[3]);
    }

    // CALCULATE SHADOW COLORS (USING 'color-mix' LOGIC)

    const shadow1 = `rgba(${r}, ${g}, ${b}, 0.25)`;

    const r2 = Math.round(r * 0.2 / 0.34);
    const g2 = Math.round(g * 0.2 / 0.34);
    const b2 = Math.round(b * 0.2 / 0.34);
    const shadow2 = `rgba(${r2}, ${g2}, ${b2}, 0.34)`;

    const r3 = Math.round(r * 0.2 + 255 * 0.8);
    const g3 = Math.round(g * 0.2 + 255 * 0.8);
    const b3 = Math.round(b * 0.2 + 255 * 0.8);
    const shadow3 = `rgba(${r3}, ${g3}, ${b3}, 1)`;

    // DRAW ALL SHADOW LAYERS (HANDLE MULTI-LINE TEXT)
    textLines.forEach((line, index) => {
      const currentY = textY + index * lineHeight;

      ctx.shadowColor = shadow1;
      ctx.shadowBlur = 5 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = -2 * scale;
      ctx.fillStyle = textColor;
      ctx.fillText(line, textX, currentY);

      ctx.shadowColor = shadow2;
      ctx.shadowBlur = 0.5 * scale;
      ctx.shadowOffsetY = -1 * scale;
      ctx.fillText(line, textX, currentY);

      ctx.shadowColor = shadow3;
      ctx.shadowBlur = 2 * scale;
      ctx.shadowOffsetY = 1 * scale;
      ctx.fillText(line, textX, currentY);

      // MAIN TEXT WITH 80% OPACITY AND MULTIPLY BLEND MODE
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 0.8;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = textColor;
      ctx.fillText(line, textX, currentY);

      // RESET FOR NEXT LINE
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });

    ctx.restore();

    // DOWNLOAD IMAGE
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `banner_${targetWidth}x${targetHeight}_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');

  } catch (error) {
    console.error('Error exporting banner:', error);
    alert('Failed to export banner. Please try again.');
  }
}

// EXPORT THE FUNCTION FOR USE IN 'main.js'
window.exportBanner = exportBanner;
