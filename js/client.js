

// the mosaic client namespace
(function(mosaicClient) {

    'use strict';

    // default if not passed through config
    var config = {
        tileHeight: 16,
        tileWidth: 16,
        fileId: 'file_input',
        apiUrl: '', // default to localhost 
        loadingId: 'loading_msg',
        mimeTypesAccepted: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'] // all mime types accepted
    };

    // public method
    mosaicClient.setup = function(customConfig) {
   
        var i=0,
            j=0;

        config.tileHeight = customConfig.tileHeight ? customConfig.tileHeight : config.tileHeight;
        config.tileWidth = customConfig.tileWidth ? customConfig.tileWidth : config.tileWidth;
        config.fileId = customConfig.fileId ? customConfig.fileId : config.fileId;
        config.apiUrl = customConfig.apiUrl ? customConfig.apiUrl : config.apiUrl;
        config.loadingId = customConfig.loadingId ? customConfig.loadingId : config.loadingId;

        toggleLoading(false);

        // check if we are overridding allowed mime types, and make sure only allowed mime types
        if(customConfig.mimeTypesAccepted) {
            for(i = 0; i < customConfig.mimeTypesAccepted.length; i++) {
                if (config.mimeTypesAccepted.indexOf(customConfig.mimeTypesAccepted[i]) == -1) {
                    throw new Error('Mime type not supported in config'); 
                }
            }

            config.mimeTypesAccepted = customConfig.mimeTypesAccepted;
        }

        // set event listener
        setEventListener();
    };

    // private methods
    function setEventListener() {
        document.getElementById(config.fileId).addEventListener('change', function() {

            if(this.disabled) {
                throw new Error('File upload not supported'); 
            }
            else {
                if(this.files && this.files[0]) {
                    toggleLoading(true);
                    readImage(this.files[0]);
                }
            }

        }, false);
    }

    function toggleLoading(on) {
        var loadingImage = document.getElementById(config.loadingId);
        if(loadingImage) {
            loadingImage.style.visibility = on ? 'visible' : 'hidden';
        }
    }

    function isValidMimeType(type) {
        return config.mimeTypesAccepted.some(function(t) {
            return type === t;
        });
    }

    function readImage(file) {
        var reader = new FileReader();
        var image = new Image();

        reader.readAsDataURL(file);
        reader.onload = function(extractedFile) {

            image.src    = extractedFile.target.result;              
            image.onload = function() {

                if(isValidMimeType(file.type)) {
                    loadImageIntoCanvas(image);
                }
                else {
                    toggleLoading(false);
                    throw new Error('Error invalid file specified');    
                }
            };
            image.onerror= function() {
                toggleLoading(false);
                throw new Error('Error loading file'); 
            };    
        };
    }


    function loadImageIntoCanvas(image) {

        var imagePieces = [],
            numberOfColumns = Math.floor(image.width / config.tileWidth),
            numberOfRows = Math.floor(image.height / config.tileHeight),
            targetCanvas = document.getElementById('mosaic'),
            averageColor,
            context,
            colRange,
            rowRange,
            processingRows = {};

        // setup the main canvas for displaying mosaic
        targetCanvas.width = image.width;
        targetCanvas.height = image.height;
        context = targetCanvas.getContext('2d');

        // create col and row ranges
        colRange = Array.apply(null, {length: numberOfColumns}).map(Number.call, Number);
        rowRange = Array.apply(null, {length: numberOfRows}).map(Number.call, Number);

        // create internal scope with forEach
        rowRange.forEach(function(y) {
            var promises = [];
            processingRows[y] = true;

            colRange.forEach(function(x) {
                var img = new Image;

                promises.push(new Promise( function (resolve, reject) {

                    img.onload = function() {
                        resolve({
                            image: img,
                            xcoord: x,
                            ycoord: y
                        });
                    };

                    // calculate the average color
                    img.src = config.apiUrl + '/color/' + getAverageHexColor(image, x, y);
                }));
            });

            // in order to print one row at a time
            Promise.all(promises)
                .then(function(resolvedList) {
                    resolvedList.forEach(function(data) {
                        context.drawImage(data.image, 0, 0, config.tileWidth, config.tileHeight, 
                            data.xcoord * config.tileWidth, data.ycoord * config.tileHeight, config.tileWidth, config.tileHeight); 
                        delete processingRows[data.ycoord];
                    });

                    if(Object.keys(processingRows).length === 0)
                        toggleLoading(false);    
                });
        });    

    }

    function rgbToHex(r, g, b) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function getAverageHexColor(image, x, y) {

        var blockSize = 5, // only visit every 5 pixels
            defaultRGB = {r:0,g:0,b:0},
            canvas = document.createElement('canvas'),
            tileContext = canvas.getContext && canvas.getContext('2d'),
            data,
            i = -4,
            length,
            rgb = {r:0,g:0,b:0},
            count = 0;

        // for non supporting browsers
        if (!tileContext) {
            return defaultRGB;
        }

        // we only want canvas for the tile
        canvas.height = config.tileHeight;
        canvas.width = config.tileWidth;

        tileContext.drawImage(image, x * config.tileWidth, y * config.tileHeight, config.tileWidth, 
            config.tileHeight, 0, 0, config.tileWidth, config.tileHeight);

        try {
            data = tileContext.getImageData(0, 0, config.tileWidth, config.tileHeight);
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


}( window.mosaicClient = window.mosaicClient || {} ));


// init
document.addEventListener("DOMContentLoaded", function(event) { 
    mosaicClient.setup({
        tileHeight: TILE_HEIGHT,
        tileWidth: TILE_WIDTH
    });
});
