(function(NS) {
    NS.ImgManager = (function() {
        const ALPHA_POS = 4, CANVAS_2D_CONTEXT = '2d', CANVAS_TAG = 'canvas';
        var canvas = {},
            croppedImages = false,
	    tempCanvas = {},
            source = {},
            context = {},
            waitQueue = [],
            errorQueue = [],
            readyQueue = [],
            onImageReady = function() {
                //[set callback here]
                return true;
            };

        function processImgs(imgAdded) {
            var src = '';

            if (waitQueue.length > 0) {
                src = waitQueue.shift();
                source.src = src;
            }

            if (imgAdded) {
                readyQueue.push(imgAdded);
            }
        }


        function onImgError(e) {
            errorQueue.push(source.src);
            processImgs();
        }


        function getQueue() {
            return {
                waiting: waitQueue,
                error: errorQueue,
                ready: readyQueue
            };
        }


        function absCeil(value) {
            return ((value >= 0 ? value : -value)) >> 0;
        }


        function imgDataPosToPixel(i) {
            return absCeil(i / ALPHA_POS);
        }


        function x(i) {
            return imgDataPosToPixel(i) % canvas.width;
        }


        function distance(x0, y0, x1, y1) {
            var x = x1 - x0,
                y = y1 - y0;

            return Math.sqrt(x * x + y * y);
        }


        function y(i) {
            return absCeil(imgDataPosToPixel(i) / canvas.width) % canvas.height;
        }


        function index(x, y) {
            return ALPHA_POS * (y * canvas.width + x) - 1;
        }


        function getCroppedCanvas(localContext, threshold) {
            var imageData = localContext.getImageData(0, 0, canvas.width, canvas.height),
                imgData = imageData.data,
                w = 0,
                h = 0,
                box = {};

            //if worker then this must be redirected...
            box = getBoundingBox(imgData, threshold);

            w = distance(box[0].x, box[0].y, box[1].x, box[0].y);
            h = distance(box[0].x, box[0].y, box[0].x, box[1].y);
            imageData = localContext.getImageData(box[0].x, box[0].y, w, h);

            tempCanvas.width = tempCanvas.width;
            tempCanvas.width = w;
            tempCanvas.height = h;
            tempCanvas.getContext(CANVAS_2D_CONTEXT).putImageData(imageData, 0, 0);

            return tempCanvas;
        }



        function onImgLoaded(loadEvent) {
            var cropped, imgData;

            //set canvas
            canvas.width = source.width;
            canvas.height = source.height;

            // Draw image into canvas
            context.drawImage(source, 0, 0, source.width, source.height);
	    if(croppedImages){
		cropped = getCroppedCanvas(context, 15);
		context.clearRect(0, 0, source.width, source.height);
		canvas.width = cropped.width;
		canvas.height = cropped.height;
		context.drawImage(cropped, 0, 0);
	    }

            // Get canvas contents as a data URL
            imgData = canvas.toDataURL('image/png');

            // Save image into localStorage
            try {
                sessionStorage.removeItem(source.src);
                sessionStorage.setItem(source.src, imgData);
            } catch (e) {
                console.log('Storage failed: ', e);
            } finally {
                //console.log('READY IN SESSION STORAGE:',source.src);
                onImageReady(source.src);
            }

            //continue with next image
            processImgs(source.src);
        }


        function getBoundingBox(imgData, threshold) {
            const ALPHA_MAX = 255;
            var len = imgData.length - 1,
                w = 0,
                h = 0,
                i = ALPHA_POS - 1,
                box = {
                    0: {
                        x: NaN,
                        y: NaN
                    },
                    1: {
                        x: NaN,
                        y: NaN
                    }
                },
                evalPos = function(pos) {
                    var xPos = x(pos),
                        yPos = y(pos);

                    if (imgData[pos] > threshold) {
                        box[0].x = (isNaN(box[0].x) || box[0].x > xPos) ? xPos : box[0].x;
                        box[0].y = (isNaN(box[0].y) || box[0].y > yPos) ? yPos : box[0].y;
                        box[1].x = (isNaN(box[1].x) || box[1].x < xPos) ? xPos : box[1].x;
                        box[1].y = (isNaN(box[1].y) || box[1].y < yPos) ? yPos : box[1].y;
                    }
                };

            threshold = (threshold || ALPHA_MAX);

            while (len > i) {
                evalPos(i);
                evalPos(len);
                i += ALPHA_POS;
                len -= ALPHA_POS;
            }

            return box;
        }


        function init(fileList, onImageReadyCallback, cropEmptySpace) {
	    //sets cropping
	    croppedImages = cropEmptySpace || croppedImages;
	    //Creating img and bindings
            source = document.createElement('img');
            source.addEventListener('load', onImgLoaded); git
            source.addEventListener('error', onImgError);

            //Creating canvas and context
            tempCanvas = document.createElement(CANVAS_TAG);
            canvas = document.createElement(CANVAS_TAG);
            context = canvas.getContext(CANVAS_2D_CONTEXT);

            //set callback
            if (typeof onImageReadyCallback === 'function') {
                onImageReady = onImageReadyCallback;
            }

            //set queue
            waitQueue = fileList.concat([]);

            //start processing
            processImgs();
        }

        return {
            init: init,
            getQueue: getQueue
        };
    }());
}(window));