/**
 * Export functionality for the banner maker
 * Renders the banner with the card overlay to a canvas and exports it as an image
 */

/**
 * Creates a noise texture canvas
 * @param {number} width - Width of the noise texture
 * @param {number} height - Height of the noise texture
 * @returns {HTMLCanvasElement} Canvas with noise texture
 */
function createNoiseTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.random() * 255;
    data[i] = value;     // R
    data[i + 1] = value; // G
    data[i + 2] = value; // B
    data[i + 3] = 255;   // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Draws a rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Exports the banner as a PNG image
 * @param {HTMLElement} bannerElement - The banner preview element
 * @param {HTMLImageElement} imgElement - The background image element
 * @param {HTMLElement} cardElement - The card overlay element
 * @param {HTMLElement} txtElement - The text element
 * @param {number|null} fixWidth - Fixed width in pixels (if set)
 * @param {number|null} fixHeight - Fixed height in pixels (if set)
 */
async function exportBanner(bannerElement, imgElement, cardElement, txtElement, fixWidth, fixHeight) {
  try {
    // Get the actual dimensions of the preview
    const previewRect = bannerElement.getBoundingClientRect();
    const imgNaturalWidth = imgElement.naturalWidth;
    const imgNaturalHeight = imgElement.naturalHeight;
    
    // Calculate aspect ratios
    const imgAspectRatio = imgNaturalWidth / imgNaturalHeight;
    const previewAspectRatio = previewRect.width / previewRect.height;
    
    // Determine export dimensions
    let exportWidth, exportHeight;
    
    if (fixWidth && fixHeight) {
      // Both dimensions fixed - use those exact dimensions
      exportWidth = fixWidth;
      exportHeight = fixHeight;
    } else if (fixWidth || fixHeight) {
      // One dimension fixed - export at original resolution but cropped to preview aspect ratio
      if (previewAspectRatio > imgAspectRatio) {
        // Preview is wider (relative to height) than original - use full width, crop height
        exportWidth = imgNaturalWidth;
        exportHeight = Math.round(imgNaturalWidth / previewAspectRatio);
      } else {
        // Preview is taller (relative to width) than original - use full height, crop width
        exportHeight = imgNaturalHeight;
        exportWidth = Math.round(imgNaturalHeight * previewAspectRatio);
      }
    } else {
      // No fixed dimensions - use natural image size
      exportWidth = imgNaturalWidth;
      exportHeight = imgNaturalHeight;
    }
    
    // Calculate scale factor
    const scale = exportWidth / previewRect.width;
    
    // Create main canvas
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    
    // Load and draw the background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgElement.src;
    });
    
    // Calculate source cropping if needed
    let sx = 0, sy = 0, sw = imgNaturalWidth, sh = imgNaturalHeight;
    
    if (fixWidth || fixHeight) {
      const targetAspect = exportWidth / exportHeight;
      const sourceAspect = imgNaturalWidth / imgNaturalHeight;
      
      if (targetAspect > sourceAspect) {
        // Crop height (top and bottom)
        sh = imgNaturalWidth / targetAspect;
        sy = (imgNaturalHeight - sh) / 2;
      } else if (targetAspect < sourceAspect) {
        // Crop width (left and right)
        sw = imgNaturalHeight * targetAspect;
        sx = (imgNaturalWidth - sw) / 2;
      }
    }
    
    // Draw the background image
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, exportWidth, exportHeight);
    
    // Get card and text computed styles
    const cardStyles = window.getComputedStyle(cardElement);
    const txtStyles = window.getComputedStyle(txtElement);
    const cardRect = cardElement.getBoundingClientRect();
    const bannerRect = bannerElement.getBoundingClientRect();
    
    // Calculate card position and size (scaled)
    const cardRelativeX = (cardRect.left - bannerRect.left) / previewRect.width;
    const cardRelativeY = (cardRect.top - bannerRect.top) / previewRect.height;
    const cardRelativeWidth = cardRect.width / previewRect.width;
    const cardRelativeHeight = cardRect.height / previewRect.height;
    
    const cardX = cardRelativeX * exportWidth;
    const cardY = cardRelativeY * exportHeight;
    const cardWidth = cardRelativeWidth * exportWidth;
    const cardHeight = cardRelativeHeight * exportHeight;
    
    // Get and scale card properties
    const borderRadius = parseFloat(cardStyles.borderRadius) * scale;
    
    // Create backdrop blur effect
    const blurRadius = 12 * scale;
    const blurPadding = Math.ceil(blurRadius * 3);
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = Math.ceil(cardWidth + blurPadding * 2);
    blurCanvas.height = Math.ceil(cardHeight + blurPadding * 2);
    const blurCtx = blurCanvas.getContext('2d');
    
    // Copy the card area from main canvas
    blurCtx.drawImage(
      canvas,
      Math.max(0, cardX - blurPadding),
      Math.max(0, cardY - blurPadding),
      Math.min(exportWidth, cardWidth + blurPadding * 2),
      Math.min(exportHeight, cardHeight + blurPadding * 2),
      0, 0,
      blurCanvas.width,
      blurCanvas.height
    );
    
    // Apply blur using StackBlur
    if (typeof StackBlur !== 'undefined') {
      StackBlur.canvasRGB(blurCanvas, 0, 0, blurCanvas.width, blurCanvas.height, Math.round(blurRadius));
    }
    
    // Apply saturation (180%)
    const imageData = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
    const data = imageData.data;
    const saturation = 1.8;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      data[i] = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
      data[i + 1] = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
      data[i + 2] = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
    }
    blurCtx.putImageData(imageData, 0, 0);
    
    // Draw the card with all effects
    ctx.save();
    
    // Clip to rounded rectangle for the blurred background
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.clip();
    
    // Draw blurred background
    ctx.drawImage(blurCanvas, cardX - blurPadding, cardY - blurPadding);
    
    ctx.restore();
    
    // Draw card shadows
    ctx.save();
    const shadowLayers = [
      { blur: 4 * scale, offsetY: 2 * scale, alpha: 0.1 },
      { blur: 16 * scale, offsetY: 8 * scale, alpha: 0.2 },
      { blur: 48 * scale, offsetY: 16 * scale, alpha: 0.3 }
    ];
    
    shadowLayers.forEach(layer => {
      ctx.shadowColor = `rgba(10, 10, 10, ${layer.alpha})`;
      ctx.shadowBlur = layer.blur;
      ctx.shadowOffsetY = layer.offsetY;
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
      ctx.fill();
    });
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
    
    // Draw card gradient overlay
    ctx.save();
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.clip();
    
    const gradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
    const bgStyle = cardStyles.background || cardStyles.backgroundImage;
    const rgbaMatch = bgStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g);
    
    if (rgbaMatch && rgbaMatch.length >= 2) {
      gradient.addColorStop(0, rgbaMatch[0]);
      gradient.addColorStop(1, rgbaMatch[1]);
    } else {
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    }
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Add noise texture
    const noiseCanvas = createNoiseTexture(Math.ceil(cardWidth), Math.ceil(cardHeight));
    ctx.globalAlpha = 0.15;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(noiseCanvas, cardX, cardY, cardWidth, cardHeight);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw inset highlights
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, borderRadius);
    ctx.stroke();
    
    const topHighlight = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 12 * scale);
    topHighlight.addColorStop(0, 'rgba(250, 250, 250, 0.12)');
    topHighlight.addColorStop(1, 'rgba(250, 250, 250, 0)');
    ctx.fillStyle = topHighlight;
    ctx.fillRect(cardX, cardY, cardWidth, 12 * scale);
    
    ctx.restore();
    
    // Draw text
    const fontSize = parseFloat(txtStyles.fontSize) * scale;
    const fontWeight = txtStyles.fontWeight;
    const fontFamily = txtStyles.fontFamily;
    const textColor = txtStyles.color;
    
    // Get text content and measure it
    const text = txtElement.textContent;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    
    // Center text in card
    const textX = cardX + cardWidth / 2;
    const textY = cardY + cardHeight / 2;
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Text shadows - render in order
    const shadowColor = txtStyles.getPropertyValue('--txt-shadow-color') || textColor;
    
    // Shadow 1: Top glow (0 -2px 5px with 25% opacity)
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = -2 * scale;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, textY);
    ctx.restore();
    
    // Shadow 2: Thin outline (0 -1px 0.5px)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
    ctx.shadowBlur = 0.5 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = -1 * scale;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, textY);
    ctx.restore();
    
    // Shadow 3: Bottom highlight (0 1px 2px white)
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 2 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1 * scale;
    ctx.globalAlpha = 1;
    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, textY);
    ctx.restore();
    
    // Main text with multiply blend mode and 80% opacity
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillText(text, textX, textY);
    ctx.restore();
    
    downloadCanvas(canvas, exportWidth, exportHeight);
    
  } catch (error) {
    console.error('Error exporting banner:', error);
    alert('Failed to export banner. Please try again.');
  }
}

/**
 * Downloads a canvas as PNG
 * @param {HTMLCanvasElement} canvas - The canvas to download
 * @param {number} width - Width for filename
 * @param {number} height - Height for filename
 */
function downloadCanvas(canvas, width, height) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename with dimensions
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `banner_${width}x${height}_${timestamp}.png`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Export the function for use in main.js
window.exportBanner = exportBanner;
