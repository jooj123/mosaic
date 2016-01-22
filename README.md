# Photo mosaic
Used to generate a photo mosaic using Javascript.

The app loads the user image, divides the image into tiles, computes the average color of each tile, fetches a tile from the server for that color, and composites the results into a photomosaic of the original image.

Tiles are rendered a complete row at a time from top to bottom (you will never see a row with some completed tiles and some incomplete)

There is a lightweight server (written in node) for serving the client app and the tile images.

The tile size should be configurable via the code constants in js/mosaic.js. The default size is 16x16.


## Install
```
./setup.sh
```

## Run
```
node server.js
```
Then open your browser and goto http://localhost:8765/

## Contribute
Please feel free to submit a Pull Request, I would love for you to contribute to **Photo Mosaic**

## TODO
1. Tests need to be implemented
2. Use multiple workers (instead of just 1) to process the average image