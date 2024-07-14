/*
npm install --save three


npm install --save-dev vite

npx vite
*/

import * as THREE from 'three';
import vertex from "./vertex.js";

let current_filter=0;
let w= screen.width;
let h= 0;
let labels_vision=["typical human vision", "simulated red-green color blindness (protanopia)", "simulated garden snake vision", "simulated blue-yellow color blindness (tritanopia)", "computer vision: object detection", "simulated red-green color blindness/ dog vision (deuteranopia)", "simulated achromatopsia", "computer vision: edge detection"]
let vision_label=document.getElementById("visionLabel");

let stream;
let videoElement = document.getElementById('videoElement');
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
            video: {
              facingMode: 'environment',
            } });
        //videoElement.width = 1080;
        //videoElement.height = 1920;
        videoElement.srcObject = stream;
        //https://github.com/tensorflow/tfjs/issues/322
        videoElement = await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => resolve(videoElement);
        });
        videoElement.play();
        videoElement.setAttribute("autoplay",'');
        videoElement.setAttribute('muted','');
        videoElement.setAttribute('playsinline','')

        console.log(videoElement.videoWidth, videoElement.videoHeight);
        
        h= parseInt(videoElement.videoHeight*w/videoElement.videoWidth);
        console.log(w,h);
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
    }
}


startWebcam();


//--------------------------------------------------------------------------------------------------------------------------------
// object detection
//--------------------------------------------------------------------------------------------------------------------------------

const model_coco = await cocoSsd.load();

async function object_detection(img){
    const predictions = await model_coco.detect(img);

    //normalize positions
    for (let i = 0; i < predictions.length; i++) {
        predictions[i].bbox[0]=predictions[i].bbox[0]*w/img.videoWidth;
        predictions[i].bbox[1]=predictions[i].bbox[1]*h/img.videoHeight;
        predictions[i].bbox[2]=predictions[i].bbox[2]*w/img.videoWidth;
        predictions[i].bbox[3]=predictions[i].bbox[3]*h/img.videoHeight;
    }

    return predictions;
    //label_tiles(predictions);
}
//--------------------------------------------------------------------------------------------------------------------------------
// matrix
//--------------------------------------------------------------------------------------------------------------------------------


let tiles_dim = [3,5];
let color_per_tile=[];

let animated=[];

let motion = [];
let sum_motion = [];

for(let x = 0; x<tiles_dim[1];x++){
    color_per_tile.push([]);
    animated.push([]);
    for(let y = 0; y<tiles_dim[0];y++){
        color_per_tile[x].push(0);
        motion.push(0);
        sum_motion.push(0);
        animated[x].push(false);
    }
}

//--------------------------------------------------------------------------------------------------------------------------------
// create object detection labels
//--------------------------------------------------------------------------------------------------------------------------------

let labels,tile_container,container,max_width,max_height

function setup_object_detect_labels(){
    labels=[];
    tile_container=[];
    container = document.getElementById("container");
    
    max_width= w/tiles_dim[0];
    max_height= h/tiles_dim[1];
    
    for(let x = 0; x<tiles_dim[1];x++){
        labels.push([]);
        tile_container.push([]);
        for(let y = 0; y<tiles_dim[0];y++){
            const con = document.createElement("div");
            con.style.width= max_width+"px";
            con.style.height= max_height+"px";
            con.style.position = "absolute";
            con.style.left= y*max_width+"px";
    
            con.style.top= x*max_height+"px";
    
            const para = document.createElement("p");
            para.innerHTML="no object found";
    
            
            con.classList.add("tiles");
    
            
            para.style.maxWidth=max_width+"px";
            para.style.maxHeight=max_height+"px";
    
            con.appendChild(para);
            container.appendChild(con);
    
            labels[x].push(para);
            tile_container[x].push(con);
        }
    }
}

//--------------------------------------------------------------------------------------------------------------------------------
// create object outline
//--------------------------------------------------------------------------------------------------------------------------------

const object_outlines=[];
const label_objects=[];

function setup_object_outline(){
    for(let x = 0; x<15;x++){
    for(let y = 0; y<tiles_dim[0];y++){
        const con = document.createElement("div");
        con.style.position = "absolute";

        const para = document.createElement("p");

        con.classList.add("objectOutlines");
        para.classList.add("labelObjects");

        con.appendChild(para);
        container.appendChild(con);

        con.style.display="none";

        label_objects.push(para);
        object_outlines.push(con);
    }
}
}





//--------------------------------------------------------------------------------------------------------------------------------
//check if rectancles overlap
//https://www.educative.io/answers/how-to-check-if-two-rectangles-overlap-each-other
//--------------------------------------------------------------------------------------------------------------------------------


function check_rect_overlap(rect1,rect2){
    let widthIsPositive = Math.min(rect1[2], rect2[2]) > Math.max(rect1[0], rect2[0]);
    let heightIsPositive = Math.min(rect1[3], rect2[3]) > Math.max(rect1[1], rect2[1]);
    
    return ( widthIsPositive && heightIsPositive); 
}


//--------------------------------------------------------------------------------------------------------------------------------
// label tiles
//--------------------------------------------------------------------------------------------------------------------------------
function label_tiles(detections){
    // reset labels
    for(let x = 0; x<tiles_dim[1];x++){
        for(let y = 0; y<tiles_dim[0];y++){
            labels[x][y].innerHTML="no object found";
        }
    }

    for(let x = 0; x<tiles_dim[1];x++){
        for(let y = 0; y<tiles_dim[0];y++){
        if (color_per_tile[x][y]==4.&&current_filter!=4.){
            for (let i = 0; i < detections.length; i++) {
                let tile= [w/tiles_dim[0]*y, h/tiles_dim[1]*x, w/tiles_dim[0]*(y+1),h/tiles_dim[1]*(x+1)];
            
                let detected= [detections[i].bbox[0], detections[i].bbox[1], detections[i].bbox[0]+detections[i].bbox[2], detections[i].bbox[1]+detections[i].bbox[3]];
                if (check_rect_overlap(tile,detected)){
                    
                    if(labels[x][y].innerHTML=="no object found"){
                        labels[x][y].innerHTML= Math.round(detections[i].score * 1000) / 1000+ "% " + detections[i].class;
                    }else{
                        labels[x][y].innerHTML+= "<br>" + Math.round(detections[i].score * 1000) / 1000+ "% " + detections[i].class;
                    }
                }
            }
        }else{
            labels[x][y].innerHTML="";
        }
        }
    }
}

//--------------------------------------------------------------------------------------------------------------------------------
// draw outlines
//--------------------------------------------------------------------------------------------------------------------------------


function draw_outline(detections) {
    for (let i = 0; i < object_outlines.length; i++) {
        if(detections.length>i){
            object_outlines[i].style.display= "block";

            object_outlines[i].style.width= detections[i].bbox[2]+"px";
            object_outlines[i].style.height= detections[i].bbox[3]+"px";
            object_outlines[i].style.left= detections[i].bbox[0]+"px";

            object_outlines[i].style.top= detections[i].bbox[1]+"px";

            label_objects[i].innerHTML=Math.round(detections[i].score * 1000) / 1000+ "% " + detections[i].class;
        }
        else{
            
            object_outlines[i].style.display= "none";
        }
    }
  }


//https://lvngd.com/blog/how-write-custom-fragment-shader-glsl-and-use-it-threejs/

//--------------------------------------------------------------------------------------------------------------------------------
// set up scene
//--------------------------------------------------------------------------------------------------------------------------------

let camera,scene,renderer, loader, canvas,plane,texture,material,mesh,ctx_gl;

function setup_threeJS(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x000000 );

    loader = new THREE.TextureLoader();

    camera = new THREE.OrthographicCamera( w / - 2, w/ 2, h/ 2, h/ - 2, 1, 1000 );
    camera.position.z = 1;

    canvas = document.querySelector('#glCanvas');

    texture = new THREE.VideoTexture( videoElement );
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;

    //const texture = new THREE.TextureLoader().load( "linz.png" );

    renderer = new THREE.WebGLRenderer({canvas});
    renderer.setPixelRatio( screen.devicePixelRatio);
    renderer.setSize( w, h );

    plane = new THREE.PlaneGeometry(w, h);

    material = new THREE.ShaderMaterial( {
        uniforms: {
            u_resolution: new THREE.Uniform( new THREE.Vector2() ),
            texSize: {value: [1080,920]},
            colorM: {value: color_per_tile.flat(Infinity)},
            tex0:{
                type:'t',
                value: texture
            }
        },
        fragmentShader: vertex,
    } );
    
    mesh = new THREE.Mesh( plane, material );
    
    scene.add( mesh );

}



//--------------------------------------------------------------------------------------------------------------------------------
// shader
//--------------------------------------------------------------------------------------------------------------------------------

function render() {
    const object = scene.children[ 0 ];
    object.material.uniforms.u_resolution.value.x = w;
    object.material.uniforms.u_resolution.value.y = h;
    
    object.material.uniforms.colorM.value = color_per_tile.flat(Infinity); 

    texture.needsUpdate=true;
    renderer.render( scene, camera );
}

//--------------------------------------------------------------------------------------------------------------------------------
// motion detection
//--------------------------------------------------------------------------------------------------------------------------------

// sample the colour of every 50 pixels
//https://codersblock.com/blog/motion-detection-with-javascript/
var sample_size,pixels_per_tile,offscreen,ctx,data,dataPrevious,w_motion_canvas,h_motion_canvas;

function setup_motion(){
    h= parseInt(videoElement.videoHeight*screen.width/videoElement.videoWidth);

    w_motion_canvas=600;
    h_motion_canvas= parseInt(h*w_motion_canvas/w);

    sample_size = 30;
    pixels_per_tile=[w_motion_canvas / tiles_dim[0],h_motion_canvas / tiles_dim[1]];

    offscreen= new OffscreenCanvas(w_motion_canvas,h_motion_canvas);

    ctx=offscreen.getContext("2d", {willReadFrequently: true});


    data = ctx.getImageData(0, 0, w_motion_canvas, h_motion_canvas).data;
    dataPrevious = ctx.getImageData(0, 0, w_motion_canvas, h_motion_canvas).data;
}

function detect_motion(){

    let motion_threshold= 0.65;


    let change=[];
    for (let x = 0; x < tiles_dim[1]; x++) {
        for (let y = 0; y < tiles_dim[0]; y++) {
            change.push(0);
        }
    }
    
    ctx.drawImage(videoElement, 0, 0, w_motion_canvas, h_motion_canvas);
    data = ctx.getImageData(0, 0, w_motion_canvas, h_motion_canvas).data;

    for (var y = 0; y < h_motion_canvas; y+= sample_size) {
        for (var x = 0; x < w_motion_canvas; x+= sample_size) {

            var index = (x + y * w_motion_canvas) * 4;
            let pr = dataPrevious[index + 0];
            let pg = dataPrevious[index + 1];
            let pb = dataPrevious[index + 2];
    
            let r = data[index + 0];
            let g = data[index + 1];
            let b = data[index + 2];

            var dx = pr - r;
            var dy = pg- g;
            var dz = pb - b;
            
            var dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2));

            change[
                parseInt(y / pixels_per_tile[1]) * tiles_dim[0] +
                parseInt(x / pixels_per_tile[0])
                ] += dist;


        }
    }

    for (let x = 0; x < tiles_dim[1]; x++) {
        for (let y = 0; y < tiles_dim[0]; y++) {
          change[x*tiles_dim[0]+y] /= 1000;
          if (change[x*tiles_dim[0]+y]>1){
            change[x*tiles_dim[0]+y]=0.99;
          }
          
          let weight= 0.85;
          motion[x*tiles_dim[0]+y] =motion[x*tiles_dim[0]+y]*weight+change[x*tiles_dim[0]+y]*(1-weight);
        }
      }

      for (let x = 0; x < tiles_dim[1]; x++) {
        for (let y = 0; y < tiles_dim[0]; y++) {
            if(motion[x * tiles_dim[0] + y]>motion_threshold&&!animated[x][y]){
                randomColor(x,y);
                animated[x][y]=true;
                setTimeout(resetColor, 200+800*motion[x * tiles_dim[0] + y], x,y);
            }else{
                if(!animated[x][y]){
                    color_per_tile[x][y]=current_filter;
                }
            }
        }
    }
    
    dataPrevious = data;
}

//--------------------------------------------------------------------------------------------------------------------------------
// animate tiles
//--------------------------------------------------------------------------------------------------------------------------------
/*for(let x = 0; x<tiles_dim[1];x++){
    for(let y = 0; y<tiles_dim[0];y++){
        setInterval(randomColor, Math.random()*4000+4000, x,y);
    }
}
*/
setInterval(change_filter, 4000);

function change_filter() {
    current_filter++;
    current_filter=current_filter%8;
    vision_label.innerHTML=labels_vision[current_filter];
}

function randomColor(x,y) {
    color_per_tile[x][y]=parseFloat(Math.floor(Math.random() * 7)+1);
}

function resetColor(x,y) {
    animated[x][y]=false;
    color_per_tile[x][y]=current_filter;
}


//--------------------------------------------------------------------------------------------------------------------------------
// animate
//--------------------------------------------------------------------------------------------------------------------------------

let motion_setup=false;

//videoElement.style.display="none";

async function animate() {
    
    videoElement.play();
    
    requestAnimationFrame( animate );

    if(videoElement.videoHeight>0&&!motion_setup){
        setup_motion();
        setup_threeJS();
        setup_object_detect_labels();
        setup_object_outline();
        motion_setup=true;
    }else{
        if(motion_setup){
            detect_motion();
            let d= await object_detection(videoElement);

            if(current_filter==4){
                draw_outline(d);
            }else{
                for (let i = 0; i < object_outlines.length; i++) {
                    object_outlines[i].style.display= "none";
                }
                label_tiles(d);
            }

            render();
        }
    }
}

animate()