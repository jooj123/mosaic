function rgbToHex(r, g, b) {
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getAverageHexColor(binaryImageData, x, y) {

  var blockSize = 5, // only visit every 5 pixels
    defaultRGB = {r:0,g:0,b:0},
    data,
    i = -4,
    length,
    rgb = {r:0,g:0,b:0},
    count = 0;

  context.drawImage(image, x * config.tileWidth, y * config.tileHeight, config.tileWidth, 
    config.tileHeight, 0, 0, config.tileWidth, config.tileHeight);

  try {
    data = context.getImageData(0, 0, config.tileWidth, config.tileHeight);
  } catch(e) {
    // security error (cross domain)
    return defaultRGB;
  }

  length = data.data.length;

  while ( (i += blockSize * 4) < length ) {
    ++count;
    rgb.r += data.data[i];
    rgb.g += data.data[i+1];
    rgb.b += data.data[i+2];
  }

  // floor values
  rgb.r = Math.floor(rgb.r/count);
  rgb.g = Math.floor(rgb.g/count);
  rgb.b = Math.floor(rgb.b/count);

  // convert to hex
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

onmessage = function(e) {

  var rowRange = e.data.rowRange;
  var colRange = e.data.colRange;
  var binaryImageData = e.data.binaryImageData.data;
  var workerResults = {};

  rowRange.forEach(function(y) {
    colRange.forEach(function(x) { 
      workerResults[y][x] = getAverageHexColor(binaryImageData, x, y);
    });
  });

  postMessage(workerResults);
}