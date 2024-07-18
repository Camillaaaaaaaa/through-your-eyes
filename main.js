/*
npm install --save three


npm install --save-dev vite

npx vite
*/

import * as THREE from 'three';
import vertex from "./vertex.js";

let current_filter=-1;
let w= screen.width;
let h= 0;
let labels_vision=["typical human vision", "simulated red-green color blindness (protanopia)", "simulated garden snail vision", "simulated blue-yellow color blindness (tritanopia)", "computer vision: object detection", "simulated red-green color blindness/ dog vision (deuteranopia)", "simulated achromatopsia", "computer vision: edge detection"]
let vision_label=document.getElementById("visionLabel");
let timeouts=[];


let start_button=document.getElementById("start_button");

start_button.addEventListener("click",  
    function() {           // anonyme Funktion
       start();  
    }, 
    false);

function start(){
    document.getElementById("explanation").style.display="none";
}

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
        color_per_tile[x].push(parseFloat(Math.floor(Math.random() * 7)+1));
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
// animate tiles
//--------------------------------------------------------------------------------------------------------------------------------
/*for(let x = 0; x<tiles_dim[1];x++){
    for(let y = 0; y<tiles_dim[0];y++){
        setInterval(randomColor, Math.random()*4000+4000, x,y);
    }
}
*/
//setInterval(change_filter, 5000);

function change_filter() {
    current_filter+=1;
    current_filter=current_filter%8;
    vision_label.innerHTML=labels_vision[current_filter];
}

function randomColor(x,y) {
    color_per_tile[x][y]=parseFloat(Math.floor(Math.random() * 7)+1);
}

function resetColor(x,y,change_large_filter) {
    animated[x][y]=false;
    //color_per_tile[x][y]=current_filter;
    randomColor(x,y);  
}

function selectFilter(x,y){
    for(let i=0; i<timeouts.length;i++){
        clearTimeout(timeouts[i]);
    }
    timeouts=[];
    if(current_filter==-1){
        console.log("clicked",x,y)
        current_filter=color_per_tile[x][y];

        for(let x = 0; x<tiles_dim[1];x++){
            for(let y = 0; y<tiles_dim[0];y++){
                color_per_tile[x][y]=current_filter;
                animated[x][y]=false;
            }
        }
        vision_label.innerHTML=labels_vision[current_filter];

        let t =setTimeout(tiles_random_start,4000);
        timeouts.push(t);
        t= setTimeout(resetInteraction,6000);
        timeouts.push(t);
    }else{

        tiles_random_start();
        resetInteraction();
    }
    
}

function resetInteraction(){
    vision_label.innerHTML="";
    current_filter=-1;
}

function tiles_random_start(){
    for (let x = 0; x < tiles_dim[1]; x++) {
        for (let y = 0; y < tiles_dim[0]; y++) {
            if(!animated[x][y]){
                animated[x][y]=true;
                let t= setTimeout(resetColor, Math.random() * 3000, x,y,true);
                timeouts.push(t);
            }
        }
    }
}

function animate_tiles(){
    for (let x = 0; x < tiles_dim[1]; x++) {
        for (let y = 0; y < tiles_dim[0]; y++) {
            if(!animated[x][y]){
                animated[x][y]=true;
                let t= setTimeout(resetColor, 2000+Math.random() * 5000, x,y,true);
                timeouts.push(t);
            }
        }
    }
}


//--------------------------------------------------------------------------------------------------------------------------------
// tiles interaction
//--------------------------------------------------------------------------------------------------------------------------------

function setupInteraction(){
    for(let x = 0; x<tiles_dim[1];x++){
        for(let y = 0; y<tiles_dim[0];y++){
            tile_container[x][y].addEventListener("click",  
                function() {           // anonyme Funktion
                   selectFilter(x,y);  
                }, 
                false);
        }
    }

}


//--------------------------------------------------------------------------------------------------------------------------------
// animate
//--------------------------------------------------------------------------------------------------------------------------------

let motion_setup=false;

//videoElement.style.display="none";

async function animate() {
    
    //videoElement.play();
    
    requestAnimationFrame( animate );

    if(videoElement.videoHeight>0&&!motion_setup){
        setup_threeJS();
        setup_object_detect_labels();
        setup_object_outline();
        setupInteraction();
        tiles_random_start();

        motion_setup=true;
        resetInteraction()
    }else{
        if(motion_setup){
            if(current_filter==-1){
                animate_tiles();
            }
            let d= await object_detection(videoElement);

            if(current_filter==4){
                draw_outline(d);
            }else{
                for (let i = 0; i < object_outlines.length; i++) {
                    object_outlines[i].style.display= "none";
                }
            }
            label_tiles(d);

            render();
        }
    }
}

animate()