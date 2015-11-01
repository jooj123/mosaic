

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

    var myWorker = new Worker("js/worker.js");

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

        var numberOfColumns = Math.floor(image.width / config.tileWidth),
            numberOfRows = Math.floor(image.height / config.tileHeight),
            targetCanvas = document.getElementById('mosaic'),
            tempCanvas = document.createElement('canvas'),
            context,
            tempContext,
            colRange,
            rowRange,
            processingRows = {},
            canvasData;

        // setup the main canvas for displaying mosaic
        targetCanvas.width = image.width;
        targetCanvas.height = image.height;
        context = targetCanvas.getContext('2d');

        // create col and row ranges
        colRange = Array.apply(null, {length: numberOfColumns}).map(Number.call, Number);
        rowRange = Array.apply(null, {length: numberOfRows}).map(Number.call, Number);

        // load image onto temp canvas so we can get the data 
        tempCanvas.width = image.width;
        tempCanvas.width = image.height;
        tempContext = tempCanvas.getContext('2d');
        tempContext.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
        canvasData = tempContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height);

        // first launch a web worker to figure out the color codes of each tile
        // so we dont block main thread
        // TODO: make it run in 4+ workers

        console.log('Image: ' + canvasData);

        myWorker.postMessage({
            binaryImageData: canvasData, 
            colRange: colRange, 
            rowRange: rowRange
        });

        myWorker.onmessage = function(e) {
            console.log('Message received from worker: ' + e.data);
        }


        // rowRange.forEach(function(y) {
        //     var promises = [];
        //     var processedCount = 0;
        //     processingRows[y] = true;


        //     // first calculate the color codes with workers
        //     colRange.forEach(function(x) {       

        //         var img = new Image;         

        //         // calculate the average color with worker
        //         myWorker.postMessage(getTileData(image, x, y));

        //         myWorker.onmessage = function(e) {
                    
        //             console.log('Message received from worker: ' + e.data);

        //             promises.push(new Promise( function (resolve, reject) {

        //                 img.onload = function() {
        //                     resolve({
        //                         image: img,
        //                         xcoord: x,
        //                         ycoord: y
        //                     });
        //                 };

        //                 img.src = config.apiUrl + '/color/' + e.data;                           
        //             }));

        //             // processedCount++;

        //             // if(processedCount == colRange.length) {

        //             // }
        //         }                    
        //     });            

        //     // colRange.forEach(function(x) {                

        //     //     var img = new Image;

        //     //     promises.push(new Promise( function (resolve, reject) {

        //     //         myWorker.postMessage(getTileData(image, x, y));

        //     //         img.onload = function() {
        //     //             resolve({
        //     //                 image: img,
        //     //                 xcoord: x,
        //     //                 ycoord: y
        //     //             });
        //     //         };

        //     //         myWorker.onmessage = function(e) {

        //     //             // calculate the average color
        //     //             img.src = config.apiUrl + '/color/' + e.data;
        //     //             console.log('Image Src: ' + img.src);
        //     //             console.log('Message received from worker: ' + e.data);
        //     //         }
                    
        //     //     }));
        //     // });

        //     // in order to print one row at a time
        //     Promise.all(promises)
        //         .then(function(resolvedList) {
        //             resolvedList.forEach(function(data) {
        //                 console.log('Drawing..');
        //                 context.drawImage(data.image, 0, 0, config.tileWidth, config.tileHeight, 
        //                     data.xcoord * config.tileWidth, data.ycoord * config.tileHeight, config.tileWidth, config.tileHeight); 
        //                 delete processingRows[data.ycoord];
        //             });

        //             if(Object.keys(processingRows).length === 0)
        //                 toggleLoading(false);    
        //         });
        // });    

    }


}( window.mosaicClient = window.mosaicClient || {} ));


// init
document.addEventListener("DOMContentLoaded", function(event) { 
    mosaicClient.setup({
        tileHeight: TILE_HEIGHT,
        tileWidth: TILE_WIDTH
    });
});
