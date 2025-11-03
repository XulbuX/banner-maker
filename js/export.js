/**
 * Export functionality for the banner maker
 * Manually renders the banner to canvas for pixel-perfect export
 */

/**
 * Helper to get computed CSS value
 */
function getComputed(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property).trim();
}

/**
 * Exports the banner as a PNG image
 */
async function exportBanner(bannerElement, imgElement, cardElement, txtElement, fixWidth, fixHeight) {
  try {
    const currentRect = bannerElement.getBoundingClientRect();
    const imgNaturalWidth = imgElement.naturalWidth;
    const imgNaturalHeight = imgElement.naturalHeight;
    
    // Determine target dimensions
    let targetWidth, targetHeight;
    
    if (fixWidth && fixHeight) {
      targetWidth = fixWidth;
      targetHeight = fixHeight;
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
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgElement.src;
    });
    
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    // Get card measurements
    const cardRect = cardElement.getBoundingClientRect();
    const bannerRect = bannerElement.getBoundingClientRect();
    
    const cardX = ((cardRect.left - bannerRect.left) / currentRect.width) * targetWidth;
    const cardY = ((cardRect.top - bannerRect.top) / currentRect.height) * targetHeight;
    const cardWidth = (cardRect.width / currentRect.width) * targetWidth;
    const cardHeight = (cardRect.height / currentRect.height) * targetHeight;
    const cardRadius = parseFloat(getComputed(cardElement, 'border-radius')) * scale;
    
    // Create blurred backdrop
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
    
    // Apply blur
    if (typeof StackBlur !== 'undefined') {
      StackBlur.canvasRGB(blurCanvas, 0, 0, blurCanvas.width, blurCanvas.height, Math.round(blurRadius));
    }
    
    // Apply saturation (180%)
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
    
    // Draw box shadows FIRST (behind the card)
    // CSS: 0 2px 4px 0 gray-950 10%, 0 8px 16px 0 gray-950 20%, 0 16px 48px 0 gray-950 30%
    // gray-950 is rgb(10, 10, 10) - much darker for visible shadows
    const shadows = [
      { offsetY: 2 * scale, blur: 4 * scale, color: 'rgba(10, 10, 10, 0.1)' },
      { offsetY: 8 * scale, blur: 16 * scale, color: 'rgba(10, 10, 10, 0.2)' },
      { offsetY: 16 * scale, blur: 48 * scale, color: 'rgba(10, 10, 10, 0.3)' }
    ];
    
    // Draw shadows multiple times to make them more visible
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
    
    // Now create a temporary canvas for the card content with blur and gradient
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = cardWidth;
    cardCanvas.height = cardHeight;
    const cardCtx = cardCanvas.getContext('2d');
    
    // Draw blurred background to card canvas
    cardCtx.drawImage(blurCanvas, padding, padding, cardWidth, cardHeight, 0, 0, cardWidth, cardHeight);
    
    // Draw gradient overlay on card canvas
    const gradient = cardCtx.createLinearGradient(0, 0, cardWidth, cardHeight);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    cardCtx.fillStyle = gradient;
    cardCtx.fillRect(0, 0, cardWidth, cardHeight);
    
    // Now clip and draw the card with rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();
    ctx.drawImage(cardCanvas, cardX, cardY);
    
    // Draw inset highlights (within the clip region)
    // CSS: inset 0 0 0 1px gray-50 6%, inset 2px 4px 4px 0 gray-50 12%
    
    // First inset: subtle border glow (1px, not scaled)
    ctx.strokeStyle = 'rgba(250, 250, 250, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX + 0.5, cardY + 0.5, cardWidth - 1, cardHeight - 1, cardRadius);
    ctx.stroke();
    
    // Top highlight gradient (inset light effect)
    const topGradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 12 * scale);
    topGradient.addColorStop(0, 'rgba(250, 250, 250, 0.12)');
    topGradient.addColorStop(1, 'rgba(250, 250, 250, 0)');
    ctx.fillStyle = topGradient;
    ctx.fillRect(cardX, cardY, cardWidth, 12 * scale);
    
    // Generate and draw noise texture
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = cardWidth;
    noiseCanvas.height = cardHeight;
    const noiseCtx = noiseCanvas.getContext('2d');
    
    // Create noise using ImageData
    const noiseData = noiseCtx.createImageData(cardWidth, cardHeight);
    for (let i = 0; i < noiseData.data.length; i += 4) {
      const noise = Math.random() * 255;
      noiseData.data[i] = noise;
      noiseData.data[i + 1] = noise;
      noiseData.data[i + 2] = noise;
      noiseData.data[i + 3] = 255;
    }
    noiseCtx.putImageData(noiseData, 0, 0);
    
    // Draw noise with overlay blend mode at 15% opacity
    ctx.globalAlpha = 0.15;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(noiseCanvas, cardX, cardY);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.restore();
    
    // Draw text (need to clip to card region)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();
    
    const text = txtElement.textContent;
    const fontSize = parseFloat(getComputed(txtElement, 'font-size')) * scale;
    const fontWeight = getComputed(txtElement, 'font-weight');
    const fontFamily = getComputed(txtElement, 'font-family');
    const textColor = getComputed(txtElement, 'color');
    
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    
    // Measure text to get actual dimensions
    const metrics = ctx.measureText(text);
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    const textX = cardX + cardWidth / 2;
    // Center text visually by using alphabetic baseline and offsetting by half the visual height
    const textY = cardY + cardHeight / 2 + metrics.actualBoundingBoxAscent / 2;
    
    // Parse text color to get RGB values
    const colorMatch = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    let r = 255, g = 255, b = 255;
    if (colorMatch) {
      r = parseInt(colorMatch[1]);
      g = parseInt(colorMatch[2]);
      b = parseInt(colorMatch[3]);
    }
    
    // Calculate shadow colors (using color-mix logic)
    // Shadow 1: color-mix(in srgb, color 25%, transparent)
    const shadow1 = `rgba(${r}, ${g}, ${b}, 0.25)`;
    
    // Shadow 2: color-mix(in srgb, color 20%, black 14%)
    // This mixes: 20% of original color + 14% black = 34% total, rest transparent
    const r2 = Math.round(r * 0.2 / 0.34);
    const g2 = Math.round(g * 0.2 / 0.34);
    const b2 = Math.round(b * 0.2 / 0.34);
    const shadow2 = `rgba(${r2}, ${g2}, ${b2}, 0.34)`;
    
    // Shadow 3: color-mix(in srgb, color 20%, white 80%)
    // This mixes: 20% of original color + 80% white = 100% opaque
    const r3 = Math.round(r * 0.2 + 255 * 0.8);
    const g3 = Math.round(g * 0.2 + 255 * 0.8);
    const b3 = Math.round(b * 0.2 + 255 * 0.8);
    const shadow3 = `rgba(${r3}, ${g3}, ${b3}, 1)`;
    
    // Draw all shadow layers
    ctx.shadowColor = shadow1;
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = -2 * scale;
    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, textY);
    
    ctx.shadowColor = shadow2;
    ctx.shadowBlur = 0.5 * scale;
    ctx.shadowOffsetY = -1 * scale;
    ctx.fillText(text, textX, textY);
    
    ctx.shadowColor = shadow3;
    ctx.shadowBlur = 2 * scale;
    ctx.shadowOffsetY = 1 * scale;
    ctx.fillText(text, textX, textY);
    
    // Main text with 80% opacity and multiply blend mode
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 0.8;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, textY);
    
    ctx.restore();
    
    // Download
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

// Export the function for use in main.js
window.exportBanner = exportBanner;
