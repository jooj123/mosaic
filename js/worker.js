function rgbToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getAverageHexColor(data) {

    var blockSize = 5, // only visit every 5 pixels
        i = -4,
        length,
        rgb = {r:0,g:0,b:0},
        count = 0;

    length = data.length;

    while ( (i += blockSize * 4) < length ) {
        ++count;
        rgb.r += data[i];
        rgb.g += data[i+1];
        rgb.b += data[i+2];
    }

    // floor values
    rgb.r = Math.floor(rgb.r/count);
    rgb.g = Math.floor(rgb.g/count);
    rgb.b = Math.floor(rgb.b/count);

    // convert to hex
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

onmessage = function(e) {
  var hexValues = [];
  for (var i=0; i < e.data.length; i++) {
    hexValues.push(getAverageHexColor(e.data[i]));
  }
  postMessage(hexValues);
};

