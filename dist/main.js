/*
npm install --save three


npm install --save-dev vite

npx vite
*/

import * as THREE from 'three';
import vertex from "./vertex.js";



let stream;
let videoElement = document.getElementById('videoElement');
async function startWebcam() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false,
            video: {
              height: 1920,
              width: 1080,
              facingMode: 'environment',
            } });
        videoElement.width = 1080;
        videoElement.height = 1920;
        videoElement.srcObject = stream;
        //https://github.com/tensorflow/tfjs/issues/322
        videoElement = await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = () => resolve(videoElement);
        });
        videoElement.play();
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
    }
}


startWebcam();
//https://lvngd.com/blog/how-write-custom-fragment-shader-glsl-and-use-it-threejs/

//--------------------------------------------------------------------------------------------------------------------------------
// set up scene
//--------------------------------------------------------------------------------------------------------------------------------

let camera,scene,renderer, loader;

const w= screen.width;
const h= 1920*screen.width/1080;

//const w= 1920;
//const h= 1080;


scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000000 );

loader = new THREE.TextureLoader();

camera = new THREE.OrthographicCamera( w / - 2, w/ 2, h/ 2, h/ - 2, 1, 1000 );
camera.position.z = 1;

const canvas = document.querySelector('#glCanvas');

var texture = new THREE.VideoTexture( videoElement );
texture.colorSpace = THREE.LinearSRGBColorSpace;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.format = THREE.RGBFormat;

//const texture = new THREE.TextureLoader().load( "linz.png" );

renderer = new THREE.WebGLRenderer({canvas});
renderer.setPixelRatio( screen.devicePixelRatio);
renderer.setSize( w, h );

const plane = new THREE.PlaneGeometry(w, h);


//--------------------------------------------------------------------------------------------------------------------------------
// shader
//--------------------------------------------------------------------------------------------------------------------------------

const material = new THREE.ShaderMaterial( {
    uniforms: {
        u_resolution: new THREE.Uniform( new THREE.Vector2() ),
        texSize: {value: [1080,920]},
        tex0:{
            type:'t',
            value: texture
        }
    },
    fragmentShader: vertex,
} );

const mesh = new THREE.Mesh( plane, material );

scene.add( mesh );

function render() {
    const object = scene.children[ 0 ];
    object.material.uniforms.u_resolution.value.x = w;
    object.material.uniforms.u_resolution.value.y = h;

    texture.needsUpdate=true;
    renderer.render( scene, camera );
}

//--------------------------------------------------------------------------------------------------------------------------------
// animate
//--------------------------------------------------------------------------------------------------------------------------------

//startWebcam();

//videoElement.style.display="none";

function animate() {
    
    requestAnimationFrame( animate );
    render();
}

animate()