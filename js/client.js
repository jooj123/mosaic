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

        var i=0;

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

        var numberOfColumns = Math.floor(image.width / config.tileWidth),
            numberOfRows = Math.floor(image.height / config.tileHeight),
            targetCanvas = document.getElementById('mosaic'),
            context,
            processingRows = {};

        // setup the main canvas for displaying mosaic
        targetCanvas.width = image.width;
        targetCanvas.height = image.height;
        context = targetCanvas.getContext('2d');

        toggleLoading(true);
        displayRowsFromTopToBottom(numberOfColumns, numberOfRows, 0, image, context, processingRows);
    }

    function displayRowsFromTopToBottom(numberOfColumns, numberOfRows, y, image, context, processingRows) {

        if (y == numberOfRows) {
            toggleLoading(false);
            return;
        }

        var colRange = Array.apply(null, { length: numberOfColumns }).map(Number.call, Number);
        var dotData = [];

        // get the image data for each dot in row
        colRange.forEach(function(x) {
            dotData.push(getImageDataForWorker(image, x, y));
        });

        var worker = new Worker('js/worker.js');
        worker.onmessage = function(e) {
            var promises = [];

            colRange.forEach(function(x) {
                var img = new Image;

                promises.push(new Promise(function (resolve, reject) {
                    img.onload = function() {
                        resolve({
                            image: img,
                            xcoord: x,
                            ycoord: y
                        });
                    };

                    img.src = config.apiUrl + '/color/' + e.data[x];
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

                    // use recursion to goto the next row
                    displayRowsFromTopToBottom(numberOfColumns, numberOfRows, ++y, image, context, processingRows);
                });

            worker.terminate();
        };

        worker.postMessage(dotData);
    }

    function getImageDataForWorker(image, x, y) {

        var canvas = document.createElement('canvas'),
            tileContext = canvas.getContext && canvas.getContext('2d'),
            data;

        // for non supporting browsers
        if (!tileContext) {
            throw new Error('Unsupported browser');
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
            throw new Error('Unsupported browser');
        }

        return data.data;
    }


}( window.mosaicClient = window.mosaicClient || {} ));


// init
document.addEventListener('DOMContentLoaded', function(event) {
    mosaicClient.setup({
        tileHeight: TILE_HEIGHT,
        tileWidth: TILE_WIDTH
    });
});
