// js/color-utils.js

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h, s, l };
  }
  
  export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
  
  export function getSafeTextColor(bg) {
    const brightness = (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000;
    const contrastFactor = 120;
    let r, g, b;
  
    if (brightness < 128) {
      r = Math.min(255, bg.r + contrastFactor);
      g = Math.min(255, bg.g + contrastFactor);
      b = Math.min(255, bg.b + contrastFactor);
    } else {
      r = Math.max(0, bg.r - contrastFactor);
      g = Math.max(0, bg.g - contrastFactor);
      b = Math.max(0, bg.b - contrastFactor);
    }
  
    const { h, s, l } = rgbToHsl(r, g, b);
    const bgHsl = rgbToHsl(bg.r, bg.g, bg.b);
    const adjustedColor = hslToRgb(bgHsl.h, Math.min(1, s * 1.2), l);
    return adjustedColor;
  }
  
 

  export function getSaturatedDominantColor(imgEl) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
        willReadFrequently: true,           // 強制用高精度 buffer
        colorSpace: 'srgb'                  // 明確指定使用 sRGB 色彩空間
      });
    const w = canvas.width = imgEl.naturalWidth;
    const h = canvas.height = imgEl.naturalHeight;
    ctx.drawImage(imgEl, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;
    const colorMap = new Map();

    let totalR = 0, totalG = 0, totalB = 0;
    let totalPixels = 0;
    let colorfulPixels = 0;
    let blackPixels = 0;
    let whitePixels = 0;
    let grayPixels = 0;

    // 第一次掃描：計算黑白像素比例
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;

      totalR += r;
      totalG += g;
      totalB += b;
      totalPixels++;

      // 檢測黑白像素
      const isGrayish = 
        Math.abs(r - g) < 12 &&
        Math.abs(g - b) < 12 &&
        Math.abs(r - b) < 12 &&
        r > 40 && g > 40 && b > 40 && // 排除接近黑
        r < 220 && g < 220 && b < 220; // 排除接近白

      const isBlack = r < 30 && g < 30 && b < 30;
      const isWhite = r > 225 && g > 225 && b > 225;

      // 優先統計黑白，再統計灰
      if (isBlack) blackPixels++;
      else if (isWhite) whitePixels++;
      else if (isGrayish) grayPixels++;

      if (isBlack) blackPixels++;
      if (isWhite) whitePixels++;
    }

    // 立即判斷黑白佔比
    const blackRatio = blackPixels / totalPixels;
    const whiteRatio = whitePixels / totalPixels;
    const grayRatio = grayPixels / totalPixels;

   

    if (blackRatio > 0.8) return { r: 10, g: 10, b: 10, manual: true };
    if (whiteRatio > 0.8){ 
      console.log('白色佔主導');
      return { r: 240, g: 240, b: 240, manual: true };

    }

    if (grayRatio > 0.5 && colorfulPixels / totalPixels < 0.3) {
      console.log(' 灰色佔主導，使用封面主要灰色');
      
      // 創建直方圖來分析灰度分布
      const grayHistogram = new Array(256).fill(0);
      let totalGrayPixels = 0;
      
      // 遍歷所有像素
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 判斷是否為灰色像素 (RGB差值很小)
        if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) {
          // 計算灰度值
          const grayValue = Math.round((r + g + b) / 3);
          grayHistogram[grayValue]++;
          totalGrayPixels++;
        }
      }
      
      // 計算灰度累積分布，尋找第25百分位的灰度值
      let cumulativeSum = 0;
      let darkPercentile = 0;  // 較暗的25%百分位
      
      // 找出第25百分位的灰度值（較暗的主色調）
      const darkThreshold = totalGrayPixels * 0.25;
      for (let i = 0; i < 256; i++) {
        cumulativeSum += grayHistogram[i];
        if (cumulativeSum >= darkThreshold) {
          darkPercentile = i;
          break;
        }
      }
      
      // 使用較暗的值作為基準
     
      // 否則取中間值，偏向暗側
      let selectedGray = darkPercentile < 50 ? darkPercentile : Math.max(40, darkPercentile);
      
      // 確保顏色不會太淡
      selectedGray = Math.min(selectedGray, 160); // 限制最大亮度，確保不會太淡
      
      let { h, s, l } = rgbToHsl(selectedGray, selectedGray, selectedGray);
      
      // 更溫和的亮度調整，偏暗一些
      l = Math.max(0.2, Math.min(l * 1.1, 0.7)); // 減少提亮的幅度，最高只到0.5
      
      const compensatedGray = hslToRgb(h, s, l);
      return { ...compensatedGray, manual: true };
    }

    // 繼續原有的處理邏輯
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;

      const isGrayish = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;
      const isBlack = r < 50 && g < 50 && b < 50;
      const isWhite = r > 225 && g > 225 && b > 225;
      
      if (!isGrayish && !isBlack && !isWhite) colorfulPixels++;

      const key = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10}`;
      const [pr, pg, pb] = key.split(',').map(Number);
      const { h, s, l } = rgbToHsl(pr, pg, pb);

      if (!colorMap.has(key)) {
        colorMap.set(key, { count: 1, saturation: s, r: pr, g: pg, b: pb, l });
      } else {
        const prev = colorMap.get(key);
        colorMap.set(key, { 
          count: prev.count + 1, 
          saturation: s, 
          r: pr, 
          g: pg, 
          b: pb, 
          l
        });
      }
    }

    

    

    // 過濾低佔比顏色 
    const minPixelRatio = 0.015; 
    const filtered = Array.from(colorMap.entries())
    .filter(([key, val]) => {
      // 解析顏色值
      const [r, g, b] = key.split(',').map(Number);
      
      // 完全排除黑色
      const isNearBlack = r < 50 && g < 50 && b < 50;
      if (isNearBlack) return false;
      
      // 處理白色
      const isNearWhite = r >= 180 && g >= 180 && b >= 180;
      if (isNearWhite) {
        return false;
      }
      
      // 其他顏色正常過濾
      return val.count / totalPixels >= minPixelRatio;
    });

    // 如果過濾後沒剩下就回平均色
    if (filtered.length === 0) {
      
      console.log('平均色')
      
      let avgR = Math.round(totalR / totalPixels);
      let avgG = Math.round(totalG / totalPixels);
      let avgB = Math.round(totalB / totalPixels);
      const { h, s, l } = rgbToHsl(avgR, avgG, avgB);

      // 避免太灰的顏色
      if (s < 0.4) {
        const enhancedColor = hslToRgb(h, Math.min(0.7, s * 1.8), 
          l < 0.2 ? 0.3 : (l > 0.8 ? 0.7 : l));
        return enhancedColor;
      }

      
      


      //控制目標亮度

      const darker = hslToRgb(h, s, l);
      avgR = darker.r;
      avgG = darker.g;
      avgB = darker.b;

      return { r: avgR, g: avgG, b: avgB };
    }

    // 根據顏色飽和度和數量排序
    const sorted = filtered.sort((a, b) => {
      // 降低純黑純白的權重
      const [aR, aG, aB] = a[0].split(',').map(Number);
      const [bR, bG, bB] = b[0].split(',').map(Number);
      
      const aIsGray = Math.abs(aR - aG) < 20 && Math.abs(aG - aB) < 20 && Math.abs(aR - aB) < 20;
      const bIsGray = Math.abs(bR - bG) < 20 && Math.abs(bG - bB) < 20 && Math.abs(bR - bB) < 20;
      
      // 為灰色調降低權重
      const aWeight = aIsGray ? 0.4 : 1;
      const bWeight = bIsGray ? 0.4 : 1;
      
      
      const aOccupancyFactor = Math.pow(a[1].count / totalPixels, 1.5) * 3;
      const bOccupancyFactor = Math.pow(b[1].count / totalPixels, 1.5) * 3;
      
      
      const aScore = Math.pow(a[1].saturation,0.7) * aOccupancyFactor * aWeight;
      const bScore = Math.pow(b[1].saturation,0.7) * bOccupancyFactor * bWeight;
      
      return bScore - aScore;
    });

    const topColors = sorted.slice(0, Math.min(5, sorted.length));
    
    // 直接選擇超過30%的超高佔比顏色
    const dominantColor = topColors.find(color => color[1].count / totalPixels > 0.3);
    if (dominantColor) {
      let { r, g, b} = dominantColor[1];
      
      
      console.log('dominantColor')
      
      return { r, g, b };
    }
    
    // 如果沒有超高佔比顏色，選擇最佳顏色
    const bestColor = topColors.reduce((best, current) => {
      
     
      
      
      const currentScore = current[1].saturation * Math.sqrt(current[1].count / totalPixels);
      const bestScore = best[1].saturation * Math.sqrt(best[1].count / totalPixels);
      console.log('最佳顏色')
      return currentScore > bestScore ? current : best;
    }, topColors[0]);

    let { r, g, b,} = bestColor[1];
    
   
    
    console.log( r, g, b)
    return { r, g, b };
  }
  