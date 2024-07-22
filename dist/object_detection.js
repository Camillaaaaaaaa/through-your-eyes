importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd");

let model_coco;

async function object_detection(img,w,h){
    const predictions = await model_coco.detect(img);

    //normalize positions
    /*for (let i = 0; i < predictions.length; i++) {
        predictions[i].bbox[0]=predictions[i].bbox[0]*w/img.videoWidth;
        predictions[i].bbox[1]=predictions[i].bbox[1]*h/img.videoHeight;
        predictions[i].bbox[2]=predictions[i].bbox[2]*w/img.videoWidth;
        predictions[i].bbox[3]=predictions[i].bbox[3]*h/img.videoHeight;
    }*/
    //label_tiles(predictions);
    return predictions;
}

onmessage= async function(e){
    if (e.data[0] === "load"){
        model_coco = await cocoSsd.load();
        postMessage('Model loaded');
    }
    if (e.data[0] === "start"){
        let p= await object_detection(e.data[1],e.data[2],e.data[3]);
        postMessage(p);
    }
}