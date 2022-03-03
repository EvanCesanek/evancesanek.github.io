// Class definitions
class Timer {
  constructor() {
    this.reset();
  }

  reset() {
    this.mark = getSecs();
  }

  elapsed() {
    var t = getSecs() - this.mark;
    return (t);
  }

  elapsedMSec() {
    return (this.elapsed() * 1000.0);
  }

  expired(t) {
    return (this.elapsed() >= t);
  }

  expiredMSec(t) {
    return (this.expired(t / 1000.0));
  }
}

class State {
  constructor(stateList, frameUpdateFunc) {
    this.count = stateList.length;
    this.names = stateList;
    this.current = 0;
    this.last = 0;
    this.timer = null;
    this.frameUpdateFunc = null;
    this.stack = [];

    // Associate each state name variable with its index.
    for (var stateIndex = 0; stateIndex < this.count; stateIndex++) {
      //eval('this.' + stateNames[stateIndex] + ' = stateIndex;');
      this[stateNames[stateIndex]] = stateIndex;
    }

    this.timer = new Timer();

    if (frameUpdateFunc) {
      this.frameUpdateFunc = frameUpdateFunc;
    }

    consoleLog(`State: ${this.names[this.current]}`);
  }

  next(state) {
    if (this.current === state) {
      return;
    }

    consoleLog(`State: ${this.names[this.current]} > ${this.names[state]} (${Math.round(this.timer.elapsedMSec())}ms)`);

    this.timer.reset(); // Reset state time.
    this.last = this.current; // Save last state.
    this.current = state; // Change current state.

    // Call optional frame update function.
    if (this.frameUpdateFunc) {
      this.frameUpdateFunc();
    }
  }
  
  push(state) {
    if (this.current === state) {
      return;
    }
    this.stack.push(this.current);
    this.next(state);
  }

  pop() {
    var state;
    if (this.stack.length > 0) {
      state = this.stack.pop();
      this.next(state);
    }
  }

  elapsed() {
    return (this.timer.elapsed());
  }

  elapsedMSec() {
    return (this.timer.elapsedMSec());
  }

  expired(t) {
    return (this.timer.expired(t));
  }

  expiredMSec(t) {
    return (this.timer.expiredMSec(t));
  }
}

class Explosion {

  constructor(position, initialRadius, color, duration, fragments, fragmentSize, speed) {
    this.popping = false;
    this.timer = new Timer();
    this.position = position;
    this.initialRadius = initialRadius;
    this.duration = duration;
    this.fragments = fragments;
    this.fragmentSize = fragmentSize;
    this.speed = speed;
    this.gradient = colorGradient(color, [0, 0, 0], Math.floor(duration / 10));
  }

  pop(position, initialRadius) {
    if (this.popping) {
      return;
    }

    if (position) {
      this.position = [position[0], position[1]];
    }

    if (initialRadius) {
      this.initialRadius = initialRadius;
    }

    this.popping = true;
    this.timer.reset();
  }

  draw() {
    if (this.timer.expiredMSec(this.duration)) {
      this.popping = false;
      return;
    }

    var t = this.timer.elapsedMSec();
    var radius = Math.pow((this.duration - t) / this.duration, 2) * this.fragmentSize / 2;

    for (let i = 0; i < this.fragments; i++) {
      var angle = 2 * Math.PI * i / this.fragments;
      var x = this.position[0] + (Math.sin(angle) * ((this.speed * t) + this.initialRadius));
      var y = this.position[1] + (Math.cos(angle) * ((this.speed * t) + this.initialRadius));
      drawCircle([x, y], radius, this.gradient[Math.floor(t/10)], true, 2);
    }
  }
}

// Global variables
var currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
var uid;
var browserInfo;
var browserName;
var saveSuccessful;
var experimentFinished = false;
var FB; // firebase connection flag
var FS = document.fullscreenElement;
var PL = document.pointerLockElement;
var totalSeconds = 0;
setInterval(setTime, 1000);
var trialTimer = new Timer();
var dtTimer = new Timer();
var clickTimer = new Timer();
//var myWorker = new Worker('cleanDataWorker.js');


/*var loopFuncTimers = [[],[],[]];
setInterval(function(){
  for (let i = 0; i<3; i++){
    console.log(`Main loop function #${i} avg dt: ${(loopFuncTimers[i].reduce((a,b)=>a+b)/loopFuncTimers[i].length)}`)
  }
}, 1000);*/

// Functions
function mainLoopFunc(timestamp) {
  var loopFuncList = [calcFunc, stateFunc, displayFunc];
  // Loop over the 3 main-loop functions, executing each (if defined).
  for (let i = 0; i < 3 ; i++) {
    if (!loopFuncList[i]) {
      continue;
    }
    //let start = performance.now();
    loopFuncList[i](timestamp);
    //loopFuncTimers[i].push(performance.now()-start);
    //if (loopFuncTimers[i].length > 1000){ loopFuncTimers[i].shift() }*/
  }
  window.requestAnimationFrame(mainLoopFunc); // recursive call
  //var mainLoopRAF = window.requestAnimationFrame(mainLoopFunc); // recursive call
}

function getSecs() {
  return (performance.now() / 1000.0);
}

function colorGradient(start, end, steps) {
  if (start.every(x => x<=1)){
    //console.warn('WJS: You supplied RGB values all in [0, 1]. Rescaling [0, 255]...');
    start = start.map(x => x*255);
  }
  var i, j, wStart, wEnd, output = [];

  for (i = 0; i < steps; i++) {
    var combinedRGB = [];
    wStart = i / (steps - 1);
    wEnd = 1 - wStart;
    for (j = 0; j < 3; j++) {
      combinedRGB[j] = Math.round(start[j] * wEnd + end[j] * wStart);
    }
    output.push(combinedRGB);
  }
  return output;
}

function weightedAverageVector(a1,a2,w1){
  w1 = clamp(w1,0,1);
  return a1.map(function(x,i){return w1*x + (1-w1)*a2[i];});
}

function getWorkerId(){
  var workerId = new URLSearchParams(window.location.search).get('workerId');
  var f = document.getElementsByName('workerId')[0];
  if (workerId) {
    f.value = workerId;
    f.setAttribute('readonly', '');
  }else{
    workerId = String(round(Math.random()*10000000)).padStart(7,'0');
    f.value = workerId;
  }
  return workerId;
}

function onClose() {
  if (!confirmationCode) {
    event.preventDefault();
    event.returnValue = '';
  }
}

function getQuadrant(xy) {
  x = xy[0];
  y = xy[1];
  if (x > 0 && y > 0)
    return 1;
  else if (x < 0 && y > 0)
    return 2;
  else if (x < 0 && y < 0)
    return 3;
  else if (x > 0 && y < 0)
    return 4;
  else if (x === 0 && y > 0)
    return 'y+';
  else if (x === 0 && y < 0)
    return 'y-';
  else if (y === 0 && x < 0)
    return 'x-';
  else if (y === 0 && x > 0)
    return 'x+';
  else
    return 'o';
}

function isHome(cursor, target, tolerance) {
  var d = distance(cursor, target);
  return (d < tolerance);
}

function distance(p1, p2) {
  if (!(Array.isArray(p1) || Array.isArray(p2))){
    console.error('WJS-ERROR: distance(p1,p2) requires array arguments');
  }
  var d = 0.0;
  for (let i = 0; i < p1.length; i++) {
    d += Math.pow(p1[i] - p2[i], 2);
  }
  return (Math.sqrt(d));
}

function radialToEuclidean(angle,distance,homeXY,ySign = -1){
  if(!homeXY){
    homeXY=[0,0];
  }
  return [homeXY[0] + Math.cos(angle) * distance, homeXY[1] + ySign * Math.sin(angle) * distance];
}

function clamp(value, min, max) {
  return value > max ? max : value < min ? min : value;
}

function round(value, places){
  // Round a value to specified number of decimal places.
  if (typeof(places) == 'undefined'){
    places = 0;
  }
  for (var m = 1.0, i = 0; (i < places); i++ ){
    m *= 10.0;
  }
  value = Math.round(value * m) / m;

  return(value);
}

function setTime() { // Called every second to display elapsed time.
  ++totalSeconds;
  document.getElementById('seconds').innerHTML = String(totalSeconds % 60).padStart(2, '0');
  document.getElementById('minutes').innerHTML = String(parseInt(totalSeconds / 60)).padStart(2, '0');
}

function isMember(item, array) {
  return (array.indexOf(item) !== -1);
}

function shuffle(array) { // Fisher-Yates shuffle
  for (var currentIndex = array.length-1; currentIndex>0; currentIndex--) {
    var randomIndex = Math.floor(Math.random() * currentIndex);
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function randomNormal(min, max, truncateStd=3) {
  let u = 0, v = 0;
  while (u === 0){ u = Math.random(); }// Converting [0,1) to (0,1)
  while (v === 0){ v = Math.random(); }
  let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
  if (Math.abs(num) > truncateStd) {
    num = randomNormal(min, max, truncateStd); // resample if out of range
  }else{
    num = (num + truncateStd) / (2*truncateStd); // Translate to 0 -> 1
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
  }
  return num;
}

function randomInteger(min, max) {
  // Returns a random integer between min and max (inclusive)
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function linspace(startValue, stopValue, cardinality) {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
}

function drawPath(xyList,color,lineWidth) {
  canvasContext.beginPath();
  for(var i=0; i < xyList.length; i++) {
    var xy = xyList[i];
    if(i === 0) {  
      canvasContext.moveTo(xy[0],xy[1]);
    }else{
      canvasContext.lineTo(xy[0],xy[1]);
    }
  }
  canvasContext.lineJoin = 'round';
  canvasContext.lineCap = 'round';
  canvasContext.strokeStyle = color;
  canvasContext.lineWidth = lineWidth;
  canvasContext.stroke();
}

function drawCircle(xy, radius, color, isFilled, width, arcProportion = 1, rotateRadians = 0) {
  var alpha;
  if (Array.isArray(color)){
    if(color.length==4){ 
      alpha = color[3];
      if (alpha>1 || alpha<0){
        console.war('WJS: Invalid alpha value in drawCircle. Clamping 0 - 1...');
        alpha = clamp(alpha,0,1);
      }
    }
    color = color.slice(0,3);
    if (color.every(x => x<=1)){
      //console.warn('WJS: You supplied RGB values all in [0, 1]. Rescaling [0, 255]...');
      color = color.map(x => x*255);
    }
    color = 'rgb('+color+')';
  }
  if (radius <= 0.0 || xy[0] === null || xy[1] === null) {
    return;
  }
  canvasContext.beginPath();
  arcProportion = clamp(arcProportion,0,1);
  canvasContext.arc(xy[0], xy[1], radius, -rotateRadians, -rotateRadians+arcProportion*2*Math.PI, false);
  canvasContext.globalAlpha = alpha!==undefined ? alpha : 1;
  if (isFilled) {
    canvasContext.fillStyle = color;
    canvasContext.fill();
  }
  canvasContext.lineWidth = width;
  canvasContext.strokeStyle = color;
  canvasContext.stroke();
  
  canvasContext.globalAlpha = 1;
}

function drawRectangle(xy, width, height, lineColor, lineWidth, fillColor, alpha) {
  if (Array.isArray(lineColor)) {
    lineColor = lineColor.slice(0,3);
    lineColor = 'rgb('+lineColor+')';
  }
  
  canvasContext.globalAlpha = alpha!==undefined ? alpha : 1;
  
  if (fillColor!==undefined) {
    if (Array.isArray(fillColor)) {
      fillColor = fillColor.slice(0,3);
      fillColor = 'rgb('+fillColor+')';
    }
    canvasContext.fillStyle = fillColor;
    canvasContext.fillRect(xy[0]+lineWidth,xy[1]+lineWidth,width-lineWidth,height-lineWidth);
  }
  
  var buff = lineWidth/2;
  canvasContext.lineWidth = lineWidth;
  canvasContext.strokeStyle = lineColor;
  canvasContext.strokeRect(xy[0]+buff,xy[1]+buff,width-buff,height-buff);
  
  canvasContext.globalAlpha = 1;
}

function getObjectPixelCoords(point, modelMatrix){
  // point is in the local space of the model with w=1
  point = vec4.fromValues(point[0],point[1],point[2], 1.0);
  
  var MVP = mat4.mul(mat4.create(),camera.projection,mat4.mul(mat4.create(),camera.view,modelMatrix));
  var clipspace = vec4.transformMat4(vec4.create(), point, MVP);
  
  /*var clipspace = vec4.transformMat4(vec4.create(),point,modelMatrix);
  vec4.transformMat4(clipspace,clipspace,camera.view);
  vec4.transformMat4(clipspace,clipspace,camera.projection);*/
  
  // divide X and Y by W just like the GPU does.
  clipspace[0] /= clipspace[3];
  clipspace[1] /= clipspace[3];
   
  // convert from clipspace to pixels
  var pX = (clipspace[0] *  0.5 + 0.5) * gl.canvas.width;
  var pY = (clipspace[1] * -0.5 + 0.5) * gl.canvas.height;

  return [pX, pY];
}

function drawTextOnObject(point, modelMatrix, string, fontSize, color, hAlign = 'center', vAlign = 'top', style){
  var pxy = getObjectPixelCoords(point, modelMatrix);
  drawText(pxy,string,fontSize,color,hAlign,vAlign,style)
}

function drawText(xy, string, fontSize, color, hAlign = 'center', vAlign = 'top', style) {
  if (typeof string !== 'string'){
    string = String(string);
  }
  canvasContext.font = (style ? (style + ' ') : '') + fontSize.toString() + 'pt Helvetica';
  var alpha;
  if (Array.isArray(color)){
    if (color.length==4){ 
      alpha = color[3];
      if (alpha>1 || alpha<0){
        //console.warn('WJS: Invalid alpha value in drawText. Clamping 0 - 1...');
        alpha = clamp(alpha,0,1);
      }
    }
    color = color.slice(0,3);
    color = 'rgb('+color+')';
  }
  canvasContext.globalAlpha = alpha!==undefined ? alpha : 1;
  canvasContext.fillStyle = color;
  canvasContext.textAlign = hAlign;
  canvasContext.textBaseline = vAlign;
  var lines = string.split('\n'); // in case of multiple lines of text, split at '\n'
  if (vAlign=='top'){
    for (var j = 0; j < lines.length; j++) {
      canvasContext.fillText(lines[j], xy[0], xy[1] + j * 2 * fontSize);
    }
  }else{
    for (var j = 0; j < lines.length; j++) {
      canvasContext.fillText(lines[lines.length-j-1], xy[0], xy[1] - j * 2 * fontSize);
    }
  }
  canvasContext.globalAlpha = 1;
}

function alphaFade(target, oi=null, rate = 0.2, final=0){
  if (typeof(oi)=='number'){
    if(oi>=0 && oi<target.diffuseColor.length){
      // Make sure you've cleared the interval before setting another!
      if (typeof(target.fadeRoutine)!==undefined){
        clearInterval(target.fadeRoutine);
      }
      target.fadeRoutine = setInterval(function(){
        target.diffuseColor[oi][3] *= (1-rate);
        if(target.diffuseColor[oi][3] < (final+0.01)){
          target.diffuseColor[oi][3] = final;
          clearInterval(target.fadeRoutine);
          target.fadeRoutine = undefined;
        }
      },10);
    }else{
      consoleLog(`ERROR: alphaFade oi (==${oi}) must be in range [0, ${target.diffuseColor.length}].`);
    }
    return;
  }

  if (typeof target!=='object'){
    consoleLog(`ERROR: alphaFade target must be a javascript object.`);
    return;
  }else if (!Array.isArray(target.color) || target.color.length<3){
    consoleLog(`ERROR: alphaFade target.color field must be an RGBA array.`);
    return;
  }
  // Make sure you've cleared the interval before setting another!
  if (typeof(target.fadeRoutine)!==undefined){
   clearInterval(target.fadeRoutine);
  }
  target.fadeRoutine = setInterval(function(){
    target.color[3] *= (1-rate);
    if(target.color[3] < (final+0.01)){
      target.color[3] = final;
      clearInterval(target.fadeRoutine);
      target.fadeRoutine = undefined;
    }
  },10);
}

// TODO : NOT WORKING
function colorFade(target, fadeColor, rate = 0.2){
  if (typeof target!=='object'){
    consoleLog(`ERROR: alphaFade target must be a javascript object.`);
    return;
  }else if (!Array.isArray(target.color) || target.color.length<3){
    consoleLog(`ERROR: alphaFade target.color field must be an RGBA array.`);
    return;
  }
  target.colorFadeRoutine = setInterval(function(){
    //target.color.map((x, idx) => (1-rate)*x + rate*fadeColor[idx]);
    //if (Math.abs(target.color[0]-fadeColor[0]) < 0.01){
      target.color = fadeColor;
      clearInterval(target.colorFadeRoutine);
    //}
  },1000);
}

function getFormattedDateObject() {
  var date = new Date();
  var yyyy = date.getFullYear().toString();
  var mm = ('0' + (date.getMonth() + 1)).slice(-2); // Date object has 0-indexed months
  var dd = ('0' + date.getDate()).slice(-2);
  var hh = ('0' + date.getHours()).slice(-2);
  var nn = ('0' + date.getMinutes()).slice(-2);
  var ss = ('0' + date.getSeconds()).slice(-2);

  var dateStringObject = {
    string: [yyyy, mm, dd, hh, nn, ss].join('-'),
    unix: Date.parse(date) / 1000, // unix seconds
    highResTimeStamp: performance.now()
  };

  return dateStringObject;
}

function generateCompletionCode() {
  return uid;
}

function firebaseExperimentComplete(successfulSaveCallback) {
  if (firebase) {
    var ref = firebase.database().ref('workers/' + workerId + '/' + expName + '/' + uid).set({
      uid: uid
    },function(error) {
      if (error) {
        consoleLog('ERROR: Failed to save user data to firebase.');
      } else {
        successfulSaveCallback();
      }
    });
  } else {
    consoleLog('ERROR: Not connected to Firebase.');
  }
}

function firebaseTrialSave(trialdata, successfulSaveCallback) {
  if (firebase) {
    trialdata = cleanTrialData(trialdata);
    /*if (sizeof(td) / 1000 > 100) {
      consoleLog('WARNING: sizeof(td) > 100 KB');
    }*/
    var ref = firebase.database().ref('experiments/' + expName + '/' + uid + '/' + trialdata.trialNumber);
    console.log('save start:' +performance.now());
    ref.set(trialdata, function(error) {
      console.log('save callback:' +performance.now());
      if (error) {
        consoleLog('ERROR: Failed to save data to Firebase.');
      } else {
        successfulSaveCallback();
      }
    });
    //myWorker.postMessage(trialdata);
  } else {
    consoleLog('ERROR: Not connected to Firebase.');
  }
}

function cleanTrialData(trialdata){
  var nanValue = -9999;
  Object.keys(trialdata).forEach(function(tdi){
    if (Array.isArray(trialdata[tdi])) {
      if (trialdata[tdi].length === 0) {
        trialdata[tdi][0] = nanValue;
      } else {
        trialdata[tdi] = trialdata[tdi].map((x) => ((!x) && (x!==0) && (x!==false)) ? nanValue : x);
      }
    } else if (!trialdata[tdi] && trialdata[tdi] !== 0 && trialdata[tdi] !== false) {
      trialdata[tdi] = nanValue;
    }
  });
  return trialdata;
}

function firebaseSignIn(successfulSignInCallback) {
  if (firebase) {
    firebase.auth().signOut(); // forces new uid every page load (at odds w requested feature below)
    firebase.auth().signInAnonymously().then(function(userCredentials) {
      uid = userCredentials.user.uid;
      successfulSignInCallback();
      /*firebase.database().ref('experiments/'+expName+'/'+uid).once('value').then(function(dataSnapshot){
        if (dataSnapshot.exists()){
          // would be nice to figure out how to put them back where they left off
          // under certain conditions of course, if they just had to refresh page or somethint
        }
      });*/
    }).catch(function(error) {
      var errorCode = error.code;
      var errorMessage = error.message;
      if (errorCode === 'auth/operation-not-allowed') {
        alert('You must enable Anonymous auth in the Firebase Console.');
      } else {
        console.error(error);
      }
    });
  } else {
    consoleLog('ERROR: Not connected to Firebase.');
  }
}

function firebaseLocalSave(successfulSaveCallback){
  if (firebase) {
    var ref = firebase.database().ref('experiments/' + expName + '/' + uid).once('value')
    .then(function(dataSnapshot) {
  		if (dataSnapshot.exists()){
  			subjData = dataSnapshot.toJSON(); // we pull the subject data
  			localDownload(JSON.stringify(subjData,null,'\t'), getFormattedDateObject().string+'.json', 'text/plain');
  		}else{
  			console.log('\n----- ERROR: Failed to find UID in the database. Aborting program.\n\n');
  		}
  	});
  }
}

function localDownload(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function browserCheck(){
  browserInfo = bowser.parse(window.navigator.userAgent);
  browserName = browserInfo.browser.name;
  consoleLog(`${browserName} detected.`);
  if(requireDesktop && browserInfo.platform.type == 'mobile'){
    document.getElementById('consent-content').style.display = 'none';
    document.getElementById('desktop-required-content').style.display = 'block';
  }else if (requireChrome && browserName !== 'Chrome' ) {
    document.getElementById('consent-content').style.display = 'none';
    document.getElementById('chrome-required-content').style.display = 'block';
  }
}

function bypassForms(bypass,skip=false){
  if (skip){
    document.getElementById('consent-content').style.display = 'none';
    //firebaseSignIn(function() {
      //initTrial(trialNumber); // this should be the first call to initTrial
      //document.getElementById('fullscreen-content').style.display = 'block';
    //});
  }else if (bypass) {
    document.body.querySelectorAll('input').forEach(x => x.removeAttribute('required'));
    document.body.querySelectorAll('select').forEach(x => x.removeAttribute('required'));
    document.getElementById('instructions-button').removeAttribute('disabled');
  }
}

function consoleLog(text) {
  if( logFlag ){
    console.log(text);
  }
}

function wjsRequestFullscreen(element) {
  // These days (2021) only Safari has webkit prefix for requestFullScreen
  var requestMethod = element.requestFullscreen || element.webkitRequestFullscreen;
  requestMethod.call(element);
  
  /* Based on https://stackoverflow.com/questions/1125084 */
}

function wjsExitFullscreen(element) {
  // These days (2021) only Safari has webkit prefix for requestFullScreen
  var exitMethod = element.exitFullscreen || element.webkitExitFullscreen;
  exitMethod.call(element);
}

function raycastCanvas(mouseX,mouseY) {
  var x = (2 * mouseX) / glCanvas.width - 1;
  var y = 1 - (2 * mouseY) / glCanvas.height;
  var rayEye = vec4.transformMat4(vec4.create(), vec4.fromValues(x, y, -1, 1), camera.invProj);
  var rayWorld = vec4.transformMat4(vec4.create(), vec4.fromValues(rayEye[0], rayEye[1], -1, 0), camera.invView);
  vec3.normalize(rayWorld, rayWorld);
  var ray = {direction:rayWorld, origin:camera.position};
  return ray;
}

function rayPlaneIntersect(ray,plane){
  var denom = vec3.dot(ray.direction,plane.normal);
  if (Math.abs(denom) <= 0.0001){
    return null;
  }
  var t = vec3.dot(plane.normal,vec3.sub(vec3.create(),plane.point,ray.origin))/denom;
  if (t < 0) {
    return null;
  }
  return vec3.scaleAndAdd(vec3.create(),ray.origin,ray.direction,t);
}

function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect();
  return [evt.clientX - rect.left, evt.clientY - rect.top];
}

// WebGL2 methods
function initWebGL(gl,bgCol = [0.8, 0.8, 0.8]){
  if (gl === null){ alert("Error: Unable to initialize WebGL 2.0."); }
  // Set some basic WebGL properties
  gl.clearColor(bgCol[0],bgCol[2],bgCol[2],1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  //gl.enable(gl.BLEND);
  //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}

function updateCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if(gl) {
    glCanvas.width = window.innerWidth;
    glCanvas.height = window.innerHeight;
    
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    mat4.perspective(camera.projection, camera.fov, gl.canvas.width/gl.canvas.height, camera.near, camera.far);
    gl.useProgram(shaderProgram);
    var projMatLoc = gl.getUniformLocation(shaderProgram, 'projection');
    gl.uniformMatrix4fv(projMatLoc, false, camera.projection);
    mat4.invert(camera.invProj,camera.projection);
    mat4.mul(camera.invViewProj,camera.invView,camera.invProj);
    //mat4.invert(camera.invViewProj,mat4.mul(mat4.create(),camera.projection,camera.view));
    // TODO: also update the shadow frustum here
  }
}

function handleResize(event) {
  if (state.current >= state.START && state.current <= state.ADVANCE) {
    updateCanvas();
  }
}

function initShaderProgram(gl, vsSource, fsSource) {
  /////////////
  // Initialize a shader program, so WebGL knows how to draw our data
  /////////////
  
  function loadShader(gl, type, source) {
    /////////////////
    // Create a shader of the given type, upload the source, and compile it.
    /////////////////
    
    const shader = gl.createShader(type);
    
    // Send the source to the shader object
    gl.shaderSource(shader, source);
    // Compile the shader program
    gl.compileShader(shader);
    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

function initVAO(gl, meshArrays, shaderProgram){
  // VAO Initialization
  // 0. Generate Object VAO, VBO, & EBO
  const VAO = gl.createVertexArray();
  const VBO = gl.createBuffer();
  const EBO = gl.createBuffer();
  
  // 1. Bind VAO
  gl.bindVertexArray(VAO);
  
  // 2. Copy our vertices array in the VBO for OpenGL to use
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
  gl.bufferData(gl.ARRAY_BUFFER, meshArrays.vertices, gl.STATIC_DRAW);
  // 3. Copy our indices array in the EBO for OpenGL to use
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshArrays.indices, gl.STATIC_DRAW);
  // IMPORTANT: The last element buffer object (EBO) that gets bound while a VAO is bound is stored
  //   as the VAO's element buffer object. Binding the VAO then also automatically binds that EBO.
  //   So later when we draw, we don't need to bind EBO again.
  //   But make sure you don't unbind the EBO before the VAO, or it will also unbind from the VAO.
  // 4. Set our vertex-attribute pointers (these must correspond to the vertex shader!)
  
  //console.log('vertex stride: '+meshArrays.vertexStride)
  // Positions
  const PosLoc = gl.getAttribLocation(shaderProgram,'aPos');
  gl.enableVertexAttribArray(PosLoc);
  gl.vertexAttribPointer(PosLoc, 3, gl.FLOAT, false, meshArrays.vertexStride, 0);
  // Normals
  const NormalLoc = gl.getAttribLocation(shaderProgram,'aNormal');
  gl.enableVertexAttribArray(NormalLoc);
  gl.vertexAttribPointer(NormalLoc, 3, gl.FLOAT, false, meshArrays.vertexStride, meshArrays.byteOffsetToNormal);
  // Texture Coordinates
  const TexCoordLoc = gl.getAttribLocation(shaderProgram,'aTexCoord');
  gl.enableVertexAttribArray(TexCoordLoc);
  gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, meshArrays.vertexStride, meshArrays.byteOffsetToTexCoord);
  
  // Optional unbind:
  //gl.bindBuffer(gl.ARRAY_BUFFER, null); 
  gl.bindVertexArray(null); 
  
  return VAO;
}

function initTextVAO(gl, meshArrays, shaderProgram){
  const VAO = gl.createVertexArray();
  const VBO = gl.createBuffer();
  const EBO = gl.createBuffer();
  gl.bindVertexArray(VAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
  gl.bufferData(gl.ARRAY_BUFFER, meshArrays.vertices, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, EBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshArrays.indices, gl.DYNAMIC_DRAW);
  // Positions
  const PosLoc = gl.getAttribLocation(shaderProgram,'aPos');
  gl.enableVertexAttribArray(PosLoc);
  gl.vertexAttribPointer(PosLoc, 2, gl.FLOAT, false, meshArrays.vertexStride, 0);
  // Texture Coordinates
  const TexCoordLoc = gl.getAttribLocation(shaderProgram,'aTexCoord');
  gl.enableVertexAttribArray(TexCoordLoc);
  gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, meshArrays.vertexStride, meshArrays.byteOffsetToTexCoord);
  gl.bindVertexArray(null); 
  return VAO;
}

function initLighting(gl, shaderProgram, lightPositions, shadows, ads = [0.3, 0.7, 0.5]){
  const light = {
    color: vec3.fromValues(1, 1, 1),
    ambient: vec3.create(),
    diffuse: vec3.create(),
    specular: vec3.create(),
    constant: 1,
    linear: 0.1,
    quadratic: 0.03,
    position: lightPositions,
  };
  vec3.scale(light.ambient,light.color,ads[0]);
  vec3.scale(light.diffuse,light.color,ads[1]);
  vec3.scale(light.specular,light.color,ads[2]);
  
  // Activate shader when setting uniforms or drawing
  gl.useProgram(shaderProgram);
  
  if (shadows){
    light.shadowsOn = true;
    // We want to compute a bounding box for the shadow frustum that contains everything in view
    // 1. Transform the 8 vertices of view frustum from NDC to "light space""
    //    a. Transform NDC to world space (via inverse view-projection matrix of camera)
    //    b. Transform world space to light space (via inverse model matrix of light)
    let pos = vec3.fromValues(light.position[shadows.lightIndex][0],
                              light.position[shadows.lightIndex][1],
                              light.position[shadows.lightIndex][2]);
    light.view = mat4.lookAt(mat4.create(), pos, vec3.create(), vec3.fromValues(0,0,1));
    camera.frustumVerts = [];
    for (let zn = -1; zn<=1; zn+=2){
      for (let yn = -1; yn<=1; yn+=2){
        for (let xn = -1; xn<=1; xn+=2){
          let ndc = vec4.fromValues(xn, yn, zn, 1.0);
          let transform = mat4.mul(mat4.create(),light.view,camera.invViewProj);
          let coord = vec4.transformMat4(vec4.create(),ndc,transform);
          vec4.div(coord, coord, vec4.fromValues(coord[3],coord[3],coord[3],coord[3]));
          camera.frustumVerts.push(coord);
        }
      }
    }
    // 2. Find the bounding box that contains the view frustum vertices in light space
    light.projectionBounds = computeBoundingBox(camera.frustumVerts);
    // 3. Create the orthogonal projection matrix based on results
    let lp = light.projectionBounds; // shorthand so next line is not crazy long
    light.projection = mat4.ortho(mat4.create(), lp[0], lp[1], lp[2], lp[3], 1, -lp[4]);
    light.view = mat4.lookAt(mat4.create(), pos, vec3.create(), vec3.fromValues(0,0,1));
    // 4. View-projection matrix is the light space matrix we need
    light.viewProjection = mat4.mul(mat4.create(), light.projection, light.view);
    
    // Set up shadowmap framebuffer object (we will draw the depth info here, not on screen)
    light.shadowMapFBO = initShadowMap(gl, shadows.textureSize, shadows.textureUnit);
    
    // Set uniforms in shadow shaders
    const shadowMapLoc = gl.getUniformLocation(shaderProgram, 'shadowMap');
    gl.uniform1i(shadowMapLoc, shadows.textureUnit);
    const lightViewLoc = gl.getUniformLocation(shaderProgram, 'lightView');
    gl.uniformMatrix4fv(lightViewLoc, false, light.viewProjection);
  }
  
  // To Fragment Shader
  for (var li = 0; li < light.position.length; li++){
    let LightPosnLoc   = gl.getUniformLocation(shaderProgram, 'lights['+li+'].position');
    let LightAmbiLoc   = gl.getUniformLocation(shaderProgram, 'lights['+li+'].ambient');
    let LightDiffLoc   = gl.getUniformLocation(shaderProgram, 'lights['+li+'].diffuse');
    let LightSpecLoc   = gl.getUniformLocation(shaderProgram, 'lights['+li+'].specular');
    let LightAtten0Loc = gl.getUniformLocation(shaderProgram, 'lights['+li+'].constantAtten');
    let LightAtten1Loc = gl.getUniformLocation(shaderProgram, 'lights['+li+'].linearAtten');
    let LightAtten2Loc = gl.getUniformLocation(shaderProgram, 'lights['+li+'].quadraticAtten');
    gl.uniform4fv(LightPosnLoc, light.position[li]);
    gl.uniform3fv(LightAmbiLoc, light.ambient);
    gl.uniform3fv(LightDiffLoc, light.diffuse);
    gl.uniform3fv(LightSpecLoc, light.specular);
    gl.uniform1f(LightAtten0Loc, light.constant);
    gl.uniform1f(LightAtten1Loc, light.linear);
    gl.uniform1f(LightAtten2Loc, light.quadratic);
  }
  
  return light;
}

function computeBoundingBox(vertexArray){
  // bounds = [xmin, xmax, ymin, ymax, zmin, zmax]
  bounds = [0,0,0,0,0,0];
  for (let vi = 0; vi < vertexArray.length; vi++){
    if (vertexArray[vi][0] < bounds[0]){
      bounds[0] = vertexArray[vi][0];
    }else if(vertexArray[vi][0] > bounds[1]){
      bounds[1] = vertexArray[vi][0];
    }
    
    if (vertexArray[vi][1] < bounds[2]){
      bounds[2] = vertexArray[vi][1];
    }else if(vertexArray[vi][1] > bounds[3]){
      bounds[3] = vertexArray[vi][1];
    }
    
    if (vertexArray[vi][2] < bounds[4]){
      bounds[4] = vertexArray[vi][2];
    }else if(vertexArray[vi][2] > bounds[5]){
      bounds[5] = vertexArray[vi][2];
    }
  }
  return bounds;
}

function initShadowMap(gl,depthTextureSize,shadowMapTextureUnit){
  const depthTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + shadowMapTextureUnit);
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,      // target
      0,                  // mip level
      gl.DEPTH_COMPONENT16, // internal format
      depthTextureSize,   // width
      depthTextureSize,   // height
      0,                  // border
      gl.DEPTH_COMPONENT, // format
      gl.UNSIGNED_SHORT,  // type
      null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   
  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,       // target
      gl.DEPTH_ATTACHMENT,  // attachment point
      gl.TEXTURE_2D,        // texture target
      depthTexture,         // texture
      0);                   // mip level
    
  //From learnopengl.com:
  //We only need the depth information when rendering the scene from the
  //  light's perspective so there is no need for a color buffer.
  //  A framebuffer object however is not complete without a color buffer
  //  so we need to explicitly tell OpenGL we're not going to render any 
  //  color data. We do this by setting both the read and draw buffer to 
  //  GL_NONE with glDrawBuffer and glReadBuffer.
  //gl.drawBuffer(gl.NONE);
  //gl.readBuffer(gl.NONE);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  return depthFramebuffer;

}

function initCamera(gl, shaderProgram, posn, lookAt, near, far, fovInDegrees){
  camera.position = posn ? vec3.fromValues(posn[0], posn[1], posn[2]) : (camera.position ? camera.position : vec3.fromValues(0, -10.0, 10.0));
  camera.focalPoint = lookAt ? vec3.fromValues(lookAt[0], lookAt[1], lookAt[2]) : (camera.focalPoint ? camera.focalPoint : vec3.create());
  camera.fixationVector = vec3.sub(vec3.create(),camera.focalPoint,camera.position);
  camera.forward = vec3.normalize(vec3.create(),camera.fixationVector);
  camera.up = vec3.fromValues(0.0, 0.0, 1.0);
  if( vec3.angle(camera.forward, camera.up) % Math.PI ){
    // mat4.lookAt() does not work if camera.forward and camera.up are parallel
    // hack: add a small offset to x position
    vec3.add(camera.position, camera.position, vec3.fromValues(0.01, 0.0, 0.0));
    camera.fixationVector = vec3.sub(vec3.create(),camera.focalPoint,camera.position);
    vec3.normalize(camera.forward,camera.fixationVector);
  }
  camera.near = near ? near : (camera.near ? camera.near : 1);
  camera.far = far ? far : (camera.far ? camera.far : 500);
  camera.fov = fovInDegrees ? (fovInDegrees * Math.PI / 180) : (camera.fov ? camera.fov : (45 * Math.PI / 180));
  
  camera.view = mat4.create();
  mat4.lookAt(camera.view, camera.position, camera.focalPoint, camera.up);
  camera.projection = mat4.create();
  mat4.perspective(camera.projection, camera.fov, gl.canvas.width/gl.canvas.height, camera.near, camera.far);
  camera.invView = mat4.invert(mat4.create(),camera.view);
  camera.invProj = mat4.invert(mat4.create(),camera.projection);
  camera.invViewProj = mat4.mul(mat4.create(),camera.invView,camera.invProj);
  //camera.invViewProj = mat4.invert(mat4.create(),mat4.mul(mat4.create(),camera.projection,camera.view));

  gl.useProgram(shaderProgram);
  const viewPosLoc = gl.getUniformLocation(shaderProgram, 'viewPos');
  gl.uniform3fv(viewPosLoc, camera.position);
  const viewMatLoc = gl.getUniformLocation(shaderProgram, 'view');
  gl.uniformMatrix4fv(viewMatLoc, false, camera.view);
  const projMatLoc = gl.getUniformLocation(shaderProgram, 'projection');
  gl.uniformMatrix4fv(projMatLoc, false, camera.projection);
}

function initTextureImage(url,textureUnit,generateMipmap = true){
  gl.activeTexture(gl.TEXTURE0+textureUnit);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,0,255,255]));
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = function() {
    gl.activeTexture(gl.TEXTURE0+textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (generateMipmap){
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }else{
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  }
  image.src = url;
  
  return texture;
}

function instantiate(object){
  object.enabled = true;
  object.position.push([0,0,0]);
  object.orientation.push([0,0,0]);
  object.scale.push([0,0,0]);
  object.modelMatrix.push(mat4.create());
  object.invModelMatrix.push(mat4.create());
  object.modelMatrixUpdated.push(true);
  object.count++;
}

function destroy(object,oi){
  object.position.splice(oi,1);
  object.orientation.splice(oi,1);
  object.scale.splice(oi,1);
  object.modelMatrix.splice(oi,1);
  object.invModelMatrix.splice(oi,1);
  object.modelMatrixUpdated.splice(oi,1);
  object.count--;
}

function setModelParam(object, paramName, oi, value, vi=false){
  if (!isMember(paramName,['position','orientation','scale'])){
    console.error('WJS-ERROR: invalid argument paramName. Accepted values: \'position\', \'orientation\', \'scale\')')
    return;
  }
  if (Number.isInteger(oi) && oi >= 0 && oi < object.count){
    if (Number.isInteger(vi)){
      object[paramName][oi][vi] = value;
    }else{
      object[paramName][oi] = value;
    }
    object.modelMatrixUpdated[oi] = true;
  }else{
    console.error('WJS-ERROR: invalid argument oi. Accepted values: integer in [0, object.count-1]');
  }
}

function computeModelMatrix(object, ci = 0){
  let o = object.orientation[ci].map(x => x*Math.PI/180);
  //let q = quat.fromEuler(quat.create(),o[0],o[1],o[2]);
  let v = object.position[ci];
  let s = object.scale[ci];
  //mat4.fromRotationTranslationScale(object.modelMatrix[ci],mat4.create(),q,v,s);
  mat4.translate(object.modelMatrix[ci],mat4.create(),v);
  mat4.rotateZ(object.modelMatrix[ci],object.modelMatrix[ci],o[2]);
  mat4.rotateY(object.modelMatrix[ci],object.modelMatrix[ci],o[1]);
  mat4.rotateX(object.modelMatrix[ci],object.modelMatrix[ci],o[0]);
  mat4.scale(object.modelMatrix[ci],object.modelMatrix[ci],s);
  mat4.invert(object.invModelMatrix[ci],object.modelMatrix[ci]);
  object.modelMatrixUpdated[ci] = false;
  //if(object.setting!==undefined){
  //object.MVP[ci] = mat4.mul(mat4.create(),camera.projection,mat4.mul(mat4.create(),camera.view,object.modelMatrix[ci]));
  //}
}

function drawObject(gl, shaderProgram, object) {
  if(!object.enabled) {
    return;
  }

  gl.useProgram(shaderProgram);
  gl.bindVertexArray(object.VAO);
  
  for (var ci = 0; ci < object.count; ci++){
    // Transformations composed by:
    // Move to position in world space (translate)
    // Change azimuth (zrotate), change pitch (xrotate)
    // Scale (obj coord frame)
    if (object.modelMatrixUpdated===undefined || object.modelMatrixUpdated[ci]){
      computeModelMatrix(object,ci);
    }

    if (isMember(0,object.scale[ci])) {
      continue; // don't try to draw things with 0 as one of the scale dimensions
    }
    
    //if(object.MVP[ci]){
    //const MVPLoc = gl.getUniformLocation(shaderProgram, 'MVP');
    //gl.uniformMatrix4fv(MVPLoc, false, object.MVP[ci]);
    //}
    
    const modelMatLoc = gl.getUniformLocation(shaderProgram, 'model');
    const invModelMatLoc = gl.getUniformLocation(shaderProgram, 'invModel');
    // Remember: uniformMatrix4fv has a boolean 'transpose' param (#2)
    gl.uniformMatrix4fv(modelMatLoc, false, object.modelMatrix[ci]);
    gl.uniformMatrix4fv(invModelMatLoc, false, object.invModelMatrix[ci]);
    
    const MatDiffColorLoc = gl.getUniformLocation(shaderProgram, 'material.diffuseColor');
    if (object.diffuseColor){
      gl.uniform3fv(MatDiffColorLoc, object.diffuseColor[ci]);
    }else{
      gl.uniform3fv(MatDiffColorLoc, [1,1,1]); // white if not assigned
    }
    
    const MatDiffMapLoc = gl.getUniformLocation(shaderProgram, 'material.diffuseMap');
    if (object.diffuseMap){
      gl.uniform1i(MatDiffMapLoc, object.diffuseMap[ci]);
    }else{
      gl.uniform1i(MatDiffMapLoc, 0);
    }
    
    const MatSpecColorLoc = gl.getUniformLocation(shaderProgram, 'material.specularColor');
    if (object.specularColor){
      gl.uniform3fv(MatSpecColorLoc, object.specularColor[ci]);
    }else{
      gl.uniform3fv(MatSpecColorLoc, [1,1,1]);
    }
    
    const MatSpecMapLoc = gl.getUniformLocation(shaderProgram, 'material.specularMap');
    if (object.specularMap){
      gl.uniform1i(MatSpecMapLoc, object.specularMap[ci]);
    }else{
      gl.uniform1i(MatSpecMapLoc, 0);
    }
    
    const MatShinLoc = gl.getUniformLocation(shaderProgram, 'material.shininess');
    if (object.shininess){
      gl.uniform1f(MatShinLoc, object.shininess[ci]);
    }else{
      gl.uniform1f(MatShinLoc, 8);
    }
    
    // set additional uniforms if needed for this shader
    if (typeof setCustomShaderUniforms==='function'){
      setCustomShaderUniforms(object, ci, shaderProgram);
    }
    
    // Params: 'drawMode', 'indexCount', 'indexType', 'firstIndexLoc'
    if(!object.wireframe){
      gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_INT, 0);
    }else{
      gl.drawElements(gl.LINES, object.indices.length, gl.UNSIGNED_INT, 0);
    }
  }
  
  gl.bindVertexArray(null);
  //gl.useProgram(null); // In MATLAB this was necessary to keep objects from disappearing...
}

function drawObjectShadowMap(gl, shadowShaderProgram, object){
  gl.useProgram(shadowShaderProgram);
  gl.bindVertexArray(object.VAO);
  
  const lightViewLoc = gl.getUniformLocation(shadowShaderProgram, 'lightView');
  gl.uniformMatrix4fv(lightViewLoc, false, light.viewProjection);
  
  for (var ci = 0; ci<object.count; ci++){
    if (object.modelMatrixUpdated===undefined || object.modelMatrixUpdated[ci]){
      let o = object.orientation[ci];
      let v = object.position[ci];
      let s = object.scale[ci];
      mat4.translate(object.modelMatrix[ci],mat4.create(),v);
      mat4.rotateZ(object.modelMatrix[ci],object.modelMatrix[ci],o[2]);
      mat4.rotateX(object.modelMatrix[ci],object.modelMatrix[ci],o[0]);
      mat4.scale(object.modelMatrix[ci],object.modelMatrix[ci],s);
      mat4.invert(object.invModelMatrix[ci],object.modelMatrix[ci]);
      object.modelMatrixUpdated[ci] = false;
    }
    
    const modelMatLoc = gl.getUniformLocation(shadowShaderProgram, 'model');
    // Remember: uniformMatrix4fv has a boolean 'transpose' param (#2)
    gl.uniformMatrix4fv(modelMatLoc, false, object.modelMatrix[ci]);
    
    // set additional uniforms if needed for this shader
    if (typeof setCustomShadowShaderUniforms==='function'){
      setCustomShadowShaderUniforms(object, ci, shadowShaderProgram);
    }
    
    gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_INT, 0);
  }
  
  gl.bindVertexArray(null);
  
}

function genTextMesh(object = {}, s) {
  var fontInfo = {
    pxPerWorldCm: 1,
    letterHeight: 8,
    spaceWidth: 8,
    spacing: -1,
    textureWidth: 64,
    textureHeight: 40,
    glyphInfos: {
      'a': { x:  0, y:  0, width: 8, },
      'b': { x:  8, y:  0, width: 8, },
      'c': { x: 16, y:  0, width: 8, },
      'd': { x: 24, y:  0, width: 8, },
      'e': { x: 32, y:  0, width: 8, },
      'f': { x: 40, y:  0, width: 8, },
      'g': { x: 48, y:  0, width: 8, },
      'h': { x: 56, y:  0, width: 8, },
      'i': { x:  0, y:  8, width: 8, },
      'j': { x:  8, y:  8, width: 8, },
      'k': { x: 16, y:  8, width: 8, },
      'l': { x: 24, y:  8, width: 8, },
      'm': { x: 32, y:  8, width: 8, },
      'n': { x: 40, y:  8, width: 8, },
      'o': { x: 48, y:  8, width: 8, },
      'p': { x: 56, y:  8, width: 8, },
      'q': { x:  0, y: 16, width: 8, },
      'r': { x:  8, y: 16, width: 8, },
      's': { x: 16, y: 16, width: 8, },
      't': { x: 24, y: 16, width: 8, },
      'u': { x: 32, y: 16, width: 8, },
      'v': { x: 40, y: 16, width: 8, },
      'w': { x: 48, y: 16, width: 8, },
      'x': { x: 56, y: 16, width: 8, },
      'y': { x:  0, y: 24, width: 8, },
      'z': { x:  8, y: 24, width: 8, },
      '0': { x: 16, y: 24, width: 8, },
      '1': { x: 24, y: 24, width: 8, },
      '2': { x: 32, y: 24, width: 8, },
      '3': { x: 40, y: 24, width: 8, },
      '4': { x: 48, y: 24, width: 8, },
      '5': { x: 56, y: 24, width: 8, },
      '6': { x:  0, y: 32, width: 8, },
      '7': { x:  8, y: 32, width: 8, },
      '8': { x: 16, y: 32, width: 8, },
      '9': { x: 24, y: 32, width: 8, },
      '-': { x: 32, y: 32, width: 8, },
      '*': { x: 40, y: 32, width: 8, },
      '!': { x: 48, y: 32, width: 8, },
      '?': { x: 56, y: 32, width: 8, },
    },
  };
  
  var vertices = new Float32Array(s.length * 4 * 4); // 4 floats per vert, 4 verts per letter
  var indices = new Uint32Array(s.length * 2 * 3); // 3 ints per tri, 2 tris per letter
  var offsetV = 0;
  var offsetI = 0;
  var x = 0;
  var numVerts = 0;
  var maxX = fontInfo.textureWidth;
  var maxY = fontInfo.textureHeight;
  for (var ii = 0; ii < s.length; ++ii) {
    var letter = s[ii];
    var glyphInfo = fontInfo.glyphInfos[letter];
    if (glyphInfo) {
      var x2 = x + glyphInfo.width / fontInfo.pxPerWorldCm;
      var u1 = glyphInfo.x / maxX;
      var v2 = (glyphInfo.y + fontInfo.letterHeight - 1) / maxY;
      var u2 = (glyphInfo.x + glyphInfo.width - 1) / maxX;
      var v1 = glyphInfo.y / maxY;

      // Bottom-left
      vertices[offsetV + 0] = x;
      vertices[offsetV + 1] = 0;
      vertices[offsetV + 2] = u1;
      vertices[offsetV + 3] = v1;
      // Bottom-right
      vertices[offsetV + 4] = x2;
      vertices[offsetV + 5] = 0;
      vertices[offsetV + 6] = u2;
      vertices[offsetV + 7] = v1;
      // Top-left
      vertices[offsetV + 8] = x;
      vertices[offsetV + 9] = fontInfo.letterHeight / fontInfo.pxPerWorldCm;
      vertices[offsetV + 10] = u1;
      vertices[offsetV + 11] = v2;
      // Top-right
      vertices[offsetV + 12] = x2;
      vertices[offsetV + 13] = fontInfo.letterHeight / fontInfo.pxPerWorldCm;
      vertices[offsetV + 14] = u2;
      vertices[offsetV + 15] = v2;
      // Increment
      x += (glyphInfo.width + fontInfo.spacing) / fontInfo.pxPerWorldCm;
      offsetV += 16;
      
      // Triangle 1
      indices[offsetI + 0] = numVerts+0;
      indices[offsetI + 1] = numVerts+1;
      indices[offsetI + 2] = numVerts+2;
      // Triangle 2
      indices[offsetI + 3] = numVerts+1;
      indices[offsetI + 4] = numVerts+3;
      indices[offsetI + 5] = numVerts+2;
      // Increment
      offsetI += 6;
      numVerts += 4;
      
    } else {
      // we don't have this character so just advance
      x += fontInfo.spaceWidth / fontInfo.pxPerWorldCm;
    }
  }
  
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code (moglsingle, uint32)
    vertices: vertices,
    numVerts: s.length * 4,
    numFloatsPerVert: 4,
    floatSizeInBytes: 4,
    indices: indices,
    numFaces: s.length * 2,
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToTexCoord = 2 * meshArrays.floatSizeInBytes; // skip 2 posn floats
  
  return meshArrays;
}

function drawObjectText(gl, textShaderProgram, object){
  gl.useProgram(textShaderProgram);
  gl.bindVertexArray(object.VAO);
  
  //var scale = object.position[2] * object.desiredScale;
  object.modelMatrix = mat4.fromTranslation(mat4.create(), object.position);
  mat4.mul(object.modelMatrix,object.modelMatrix,camera.view);
  mat4.mul(object.modelMatrix,object.modelMatrix,camera.projection);
  //mat4.scale(object.modelMatrix, object.modelMatrix, [scale, scale, 1]);
  const matrixLoc = gl.getUniformLocation(textShaderProgram, 'matrix');
  gl.uniformMatrix4fv(matrixLoc, false, object.modelMatrix);
  
  const modelMatLoc = gl.getUniformLocation(textShaderProgram, 'model');
  gl.uniformMatrix4fv(modelMatLoc, false, mat4.rotateX(mat4.create(),mat4.create(),Math.PI/2));
  const viewMatLoc = gl.getUniformLocation(textShaderProgram, 'view');
  gl.uniformMatrix4fv(viewMatLoc, false, camera.view);
  const projMatLoc = gl.getUniformLocation(textShaderProgram, 'projection');
  gl.uniformMatrix4fv(projMatLoc, false, camera.projection);
  
  const glyphTextureLoc = gl.getUniformLocation(textShaderProgram, 'glyphTexture');
  if (object.diffuseMap){
    gl.uniform1i(glyphTextureLoc, object.diffuseMap[0]);
  }else{
    gl.uniform1i(glyphTextureLoc, 0);
  }
  
  // Draw the text.
  gl.drawElements(gl.TRIANGLES, object.indices.length, gl.UNSIGNED_INT, 0);
  
  gl.bindVertexArray(null);
}

function initModelParams(meshArrays){
  meshArrays.position = [];
  meshArrays.orientation = [];
  meshArrays.scale = [];
  meshArrays.modelMatrix = [];
  meshArrays.invModelMatrix = [];
  meshArrays.modelMatrixUpdated = [];
  meshArrays.MVP = [];
  meshArrays.count = 0;
  return meshArrays;
}

function genQuadMesh(object = {}){
  var meshArrays = {
    ...object,
    vertices: new Float32Array([
      -0.5, 0, -0.5,  0.0, -1.0,  0.0,  0.0,  1.0,
       0.5, 0, -0.5,  0.0, -1.0,  0.0,  1.0,  1.0,
       0.5, 0,  0.5,  0.0, -1.0,  0.0,  1.0,  0.0,
      -0.5, 0,  0.5,  0.0, -1.0,  0.0,  0.0,  0.0
    ]),
    numVerts: 4,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
  
    indices: new Uint32Array([
      0, 1, 2,
      2, 3, 0
    ]),
    numFaces: 2
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats
  
  meshArrays = initModelParams(meshArrays);
  
  return meshArrays;
}

function genCubeMesh(object = {}){
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code
    vertices: new Float32Array([
      //FRONT
      -0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  0.0,  0.0,
       0.5, -0.5, -0.5,  0.0, -1.0,  0.0,  1.0,  0.0,
       0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  1.0,  1.0,
      -0.5, -0.5,  0.5,  0.0, -1.0,  0.0,  0.0,  1.0,
      //RIGHT
       0.5, -0.5, -0.5,  1.0,  0.0,  0.0,  0.0,  0.0,
       0.5,  0.5, -0.5,  1.0,  0.0,  0.0,  1.0,  0.0,
       0.5,  0.5,  0.5,  1.0,  0.0,  0.0,  1.0,  1.0,
       0.5, -0.5,  0.5,  1.0,  0.0,  0.0,  0.0,  1.0,
      //REAR
       0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  0.0,  0.0,
      -0.5,  0.5, -0.5,  0.0,  1.0,  0.0,  1.0,  0.0,
      -0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  1.0,  1.0,
       0.5,  0.5,  0.5,  0.0,  1.0,  0.0,  0.0,  1.0,
      //LEFT
      -0.5,  0.5, -0.5, -1.0,  0.0,  0.0,  0.0,  0.0,
      -0.5, -0.5, -0.5, -1.0,  0.0,  0.0,  1.0,  0.0,
      -0.5, -0.5,  0.5, -1.0,  0.0,  0.0,  1.0,  1.0,
      -0.5,  0.5,  0.5, -1.0,  0.0,  0.0,  0.0,  1.0,
      //TOP
      -0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  0.0,
       0.5, -0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  0.0,
       0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  1.0,  1.0,
      -0.5,  0.5,  0.5,  0.0,  0.0,  1.0,  0.0,  1.0,
      //BOTTOM
      -0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  0.0,
      -0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  0.0,
       0.5,  0.5, -0.5,  0.0,  0.0, -1.0,  1.0,  1.0,
       0.5, -0.5, -0.5,  0.0,  0.0, -1.0,  0.0,  1.0
    ]),
    numVerts: 24,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
  
    indices: new Uint32Array([
      0, 1, 2,
      2, 3, 0,
      4, 5, 6,
      6, 7, 4,
      8, 9, 10,
      10, 11, 8,
      12, 13, 14,
      14, 15, 12,
      16, 17, 18,
      18, 19, 16,
      20, 21, 22,
      22, 23, 20
    ]),
    numFaces: 12,
    
    
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats
  
  meshArrays = initModelParams(meshArrays);
  
  return meshArrays;
}

function genIcosphereMesh(object = {}, order = 2) {
  order = order > 10 ? 10 : order; // maximum 10
  
  // set up an icosahedron (12 vertices / 20 triangles)
  const f = (1 + Math.sqrt(5)) / 2;
  const T = Math.pow(4, order);

  const numVertices = 10 * T + 2;

  const vertices = new Float32Array((numVertices) * 3);
  vertices.set(Float32Array.of(
    -1, f, 0, 1, f, 0, -1, -f, 0, 1, -f, 0,
    0, -1, f, 0, 1, f, 0, -1, -f, 0, 1, -f,
    f, 0, -1, f, 0, 1, -f, 0, -1, -f, 0, 1
  ));

  let indices = Uint32Array.of(
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
    11, 10, 2, 5, 11, 4, 1, 5, 9, 7, 1, 8, 10, 7, 6,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
    9, 8, 1, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7
  );

  let v = 12;
  const midCache = order ? new Map() : null; // midpoint vertices cache to avoid duplicating shared vertices

  function addMidPoint(a, b) {
    const key = Math.floor(((a + b) * (a + b + 1) / 2) + Math.min(a, b)); // Cantor's pairing function
    const i = midCache.get(key);
    if (i !== undefined) {
      midCache.delete(key); // midpoint is only reused once, so we delete it for performance
      return i;
    }
    midCache.set(key, v);
    vertices[3 * v + 0] = (vertices[3 * a + 0] + vertices[3 * b + 0]) * 0.5;
    vertices[3 * v + 1] = (vertices[3 * a + 1] + vertices[3 * b + 1]) * 0.5;
    vertices[3 * v + 2] = (vertices[3 * a + 2] + vertices[3 * b + 2]) * 0.5;
    return v++;
  }

  let indicesPrev = indices;

  for (let i = 0; i < order; i++) { // repeatedly subdivide each triangle into 4 triangles
    const prevLen = indicesPrev.length;
    indices = new Uint32Array(prevLen * 4);

    for (let k = 0; k < prevLen; k += 3) {
      const v1 = indicesPrev[k + 0];
      const v2 = indicesPrev[k + 1];
      const v3 = indicesPrev[k + 2];
      const a = addMidPoint(v1, v2);
      const b = addMidPoint(v2, v3);
      const c = addMidPoint(v3, v1);
      let t = k * 4;
      indices[t++] = v1; indices[t++] = a; indices[t++] = c;
      indices[t++] = v2; indices[t++] = b; indices[t++] = a;
      indices[t++] = v3; indices[t++] = c; indices[t++] = b;
      indices[t++] = a;  indices[t++] = b; indices[t++] = c;
    }
    indicesPrev = indices;
  }

  // normalize vertices
  var verticesAugment = [];
  for (let i = 0; i < numVertices * 3; i += 3) {
    const v1 = vertices[i + 0];
    const v2 = vertices[i + 1];
    const v3 = vertices[i + 2];
    const m  = 1 / Math.sqrt(v1 * v1 + v2 * v2 + v3 * v3);
    vertices[i + 0] *= m/2;
    vertices[i + 1] *= m/2;
    vertices[i + 2] *= m/2;
    
    // These vertices are now ready
    verticesAugment.push(vertices[i + 0]);
    verticesAugment.push(vertices[i + 1]);
    verticesAugment.push(vertices[i + 2]);
    // Normals are the same...
    verticesAugment.push(vertices[i + 0]);
    verticesAugment.push(vertices[i + 1]);
    verticesAugment.push(vertices[i + 2]);
    // TexCoords are not used
    verticesAugment.push(0);
    verticesAugment.push(0);
  }
  
  
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code (moglsingle, uint32)
    vertices: new Float32Array(verticesAugment),
    numVerts: numVertices,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
    indices: new Uint32Array(indices),
    numFaces: 20*T,
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats

  meshArrays = initModelParams(meshArrays);
  
  return meshArrays;
}

function genDiskMesh(object = {}, slices=20,innerRadius=0){
  var vertices = [];
  var indices = [];
  var twoPI = Math.PI*2;
  var loop = 1;
  if (innerRadius===0){
    vertices = [0,0,0, 0,0,1, 0,0]; // center
  }else if (innerRadius>0 && innerRadius<1){
    loop = 2;
  }else{
    console.error('WJS-ERROR: genDiskMesh innerRadius must be [0, 1) ');
  }
  for (var li=0; li<loop; li++){ // do the outer loop then (if needed) inner loop
    var shrink = li * (1-innerRadius);
    for (var ui=0; ui<slices; ui++){
      let angle = ui*twoPI/slices;
      let x = Math.cos(angle);
      let y = Math.sin(angle);
      // verts
      vertices.push(x/2 - shrink*x/2);
      vertices.push(y/2 - shrink*y/2);
      vertices.push(0);
      // normals
      vertices.push(0);
      vertices.push(0);
      vertices.push(1); // always pointing up
      // tex coords
      vertices.push(0);
      vertices.push(0);
      if(loop==1 && ui>0){ // i.e., innerRadius===0
        indices.push(0); // center
        indices.push(ui); // this is lagged one
        indices.push(ui+1); // this is the vertex we just created
      }else if(li==1){ // where there is an innerRadius, we need 2 faces
        // face 1
        indices.push(ui);
        indices.push((ui+1)%slices);
        indices.push(ui+slices);
        // face 2
        indices.push(ui+slices);
        indices.push((ui+1)%slices);
        indices.push((ui+1)%slices+slices);
      }
    }
  }
  if (loop==1){ // when innerRadius==0, one extra face to close it up
    indices.push(0);
    indices.push(slices);
    indices.push(1);
  }
  
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code (moglsingle, uint32)
    vertices: new Float32Array(vertices),
    numVerts: loop==1 ? slices+1 : 2*slices,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
    indices: new Uint32Array(indices),
    numFaces: loop==1 ? slices : 2*slices,
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats
  
  meshArrays = initModelParams(meshArrays);
  
  return meshArrays;
}

function genCylinderMesh(object = {}){
  var slices = 20;
  var vertices = [];
  var indices = [];
  var twoPI = Math.PI*2;
  var vCount = 0;
  var numFaces = 0;
  for (var zi=-1; zi<2; zi=zi+2){
    for (var ui=0; ui<slices; ui++){
      let angle = ui*twoPI/slices;
      let x = Math.cos(angle);
      let y = Math.sin(angle);
      // verts
      vertices.push(x/2);
      vertices.push(y/2);
      vertices.push(zi/2);
      // normals
      vertices.push(x);
      vertices.push(y);
      vertices.push(0);
      // tex coords
      vertices.push(ui/slices);
      vertices.push((zi+1)/2);
      
      if (zi==1){ // don't build faces until the top loop
        if(ui==slices-1){// last vertex is different
          // First Tri
          indices.push(vCount);
          indices.push(vCount-slices);
          indices.push(vCount-slices+1);
          // Second Tri
          indices.push(vCount-slices);
          indices.push(vCount-2*slices+1);
          indices.push(vCount-slices+1);
          numFaces +=2;
        }else{
          // First Tri
          indices.push(vCount);
          indices.push(vCount-slices);
          indices.push(vCount+1);
          // Second Tri
          indices.push(vCount-slices);
          indices.push(vCount-slices+1);
          indices.push(vCount+1);
          numFaces +=2;
        }
      }
      vCount++; // increment at the end... because indices is actually zero-indexed
    }
  }
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code (moglsingle, uint32)
    vertices: new Float32Array(vertices),
    numVerts: vCount,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
    indices: new Uint32Array(indices),
    numFaces: numFaces,
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats
  
  meshArrays = initModelParams(meshArrays);
  
  return meshArrays;
}

function genSpringMesh(object = {},coilRadius,wireRadius,numCoils,slices=20,torusMode=false,torusArc=Math.PI*2){
  // We generate a tightly wound spiral that we can stretch later in the vertex shader
  // Method involves generating a torus with a linear z-offset between slices
  var vertsPerCoilLoop = slices;
  var vertsPerWireLoop = 8;
  var vertices = [];
  var indices = [];
  var twoPI = Math.PI*2; // convenience
  var vCount = 0;
  var numFaces = 0;
  var totalSlices = numCoils*vertsPerCoilLoop+1;
  for (var ui=0; ui<totalSlices; ui++){
    let coilAngle = ui*torusArc/vertsPerCoilLoop;
    let z = torusMode ? 0 : (2*wireRadius)*(coilAngle/twoPI); // for stretching it out into a coil (ignored til later)
    let w = vec3.fromValues(Math.cos(coilAngle),Math.sin(coilAngle),0); // unit vector in XY plane
    let c1 = vec3.create();
    vec3.scale(c1,w,coilRadius); // point on first radius (in XY plane)
    for (var vi=0; vi<vertsPerWireLoop; vi++){
      let wireAngle = vi*twoPI/vertsPerWireLoop;
      let c2 = vec3.create();
      vec3.scale(c2,w,wireRadius*Math.cos(wireAngle)); // c2 is c1 to the XY position on the surface
      let c3 = vec3.fromValues(0,0,wireRadius*Math.sin(wireAngle)+z); // c3 is c1 to the Z position
      
      let vert = vec3.create();
      vec3.add(vert,c1,c2);
      vec3.add(vert,vert,c3);
      vertices.push(vert[0]);
      vertices.push(vert[1]);
      vertices.push(vert[2]);
      
      let normal = vec3.create();
      vec3.scale(normal,w,Math.cos(wireAngle));
      vec3.add(normal,normal,vec3.fromValues(0,0,Math.sin(wireAngle)));
      vertices.push(normal[0]);
      vertices.push(normal[1]);
      vertices.push(normal[2]);
      
      // TexCoord labels vertices on the same loop
      //  - allows us to displace in vertex shader
      //  - or to discard in the fragment shader
      let texCoord = vec2.fromValues(ui/(totalSlices-1),0); 
      vertices.push(texCoord[0]);
      vertices.push(texCoord[1]);
      
      if (coilAngle>0){ // don't build faces until we've done one full wire loop
        if(vi==vertsPerWireLoop-1){// last vertex of the wire loop is different
          // First Tri
          indices.push(vCount);
          indices.push(vCount-vertsPerWireLoop+1);
          indices.push(vCount-vertsPerWireLoop);
          // Second Tri
          indices.push(vCount-vertsPerWireLoop);
          indices.push(vCount-vertsPerWireLoop+1);
          indices.push(vCount-2*vertsPerWireLoop+1);
          numFaces +=2;
        }else{
          // First Tri
          indices.push(vCount);
          indices.push(vCount+1);
          indices.push(vCount-vertsPerWireLoop);
          // Second Tri
          indices.push(vCount-vertsPerWireLoop);
          indices.push(vCount+1);
          indices.push(vCount-vertsPerWireLoop+1);
          numFaces +=2;
        }
      }
      vCount++; // increment at the end... because indices is actually zero-indexed
    }
  }
  
  var meshArrays = {
    ...object,
    // Notice the strong type declarations, like in the Matlab code (moglsingle, uint32)
    vertices: new Float32Array(vertices),
    numVerts: vCount,
    numFloatsPerVert: 8,
    floatSizeInBytes: 4,
    indices: new Uint32Array(indices),
    numFaces: numFaces,
  };
  
  meshArrays.vertexStride = meshArrays.numFloatsPerVert * meshArrays.floatSizeInBytes;
  meshArrays.byteOffsetToNormal = 3 * meshArrays.floatSizeInBytes; // skip 3 posn floats
  meshArrays.byteOffsetToTexCoord = 6 * meshArrays.floatSizeInBytes; // skip 3 posn + 3 normal floats
  
  meshArrays = initModelParams(meshArrays);
  
  meshArrays.numCoils = numCoils;
  meshArrays.coilRadius = coilRadius;
  meshArrays.wireRadius = wireRadius;
  
  return meshArrays;
}

function setupVideo(url,screen) {
  const video = document.createElement('video');

  video.screen = screen;
  
  video.autoplay = false;
  video.muted = true;
  video.loop = false;
  video.poster = '';
  video.preload = 'auto';
  video.ready = false;

  video.addEventListener('loadeddata', function() {
     video.ready = true;
     this.screen.scale[0][0] = this.screen.scale[0][2]*this.videoWidth/this.videoHeight;
  }, false);
  
  video.crossOrigin = "Anonymous";
  //video.src = url;

  return video;
}

function updateVideoTexture(gl, texture, video, textureUnit) {
  const level = 0;
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  gl.activeTexture(gl.TEXTURE0 + textureUnit)
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, video);
}

function initShadowCube(wireframe = false){
  var shadowCube = genCubeMesh();
  shadowCube.VAO = initVAO(gl,shadowCube,shaderProgram);
  shadowCube.diffuseColor = [[0,0,0]];
  shadowCube.specularColor = [[0,0,0]];
  shadowCube.position = [0]; // needed so drawObject thinks there is one instance of this object
  // create a model matrix for this light-view-space cube visualization
  // 1. initialize a matrix at light pos oriented toward origin
  // 2. translate forward (+Y) to arrive at midpoint of near + far frustum bounds
  // 3. scale up to the size of the frustum
  let lp = light.projectionBounds; // shorthand so next line is not crazy long
  var ld = vec3.fromValues(lp[0]+(lp[1]-lp[0])/2,lp[2]+(lp[3]-lp[2])/2,-(lp[4]+(lp[5]-lp[4])/2));
  var ll = mat4.translate(mat4.create(), light.view, ld);
  shadowCube.modelMatrix = mat4.scale(mat4.create(),ll,vec3.fromValues(lp[1]-lp[0],lp[3]-lp[2],lp[5]-lp[4]));
  shadowCube.wireframe = wireframe;
  return shadowCube;
}

const shadowVsSource = `#version 300 es
precision lowp float;
layout (location = 0) in vec3 aPos;
uniform mat4 lightView;
uniform mat4 model;
void main()
{
  gl_Position = lightView * model * vec4(aPos, 1.0);
}`;

const shadowFsSource = `#version 300 es
void main()
{
  gl_FragDepth = gl_FragCoord.z;
}`; // in fact this shader could just be empty as depth buffer written by default

var vsSource = `#version 300 es
precision lowp float;
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoord;
out vec3 FragPos, Normal;
out vec2 TexCoord;
uniform mat4 model, invModel, view, projection;
uniform mat4 lightView;
out vec4 FragPosLightSpace;
//uniform mat4 MVP;

void main()
{
  TexCoord = aTexCoord;
  FragPos = vec3(model * vec4(aPos, 1.0));
  FragPosLightSpace = lightView * vec4(FragPos, 1.0);
  Normal = mat3(transpose(invModel)) * aNormal;
  gl_Position = projection * view * vec4(FragPos, 1.0);
  //gl_Position = MVP * vec4(aPos, 1.0);
}`;
  
var fsSource = `#version 300 es
precision lowp float;
struct Material {
  vec3 diffuseColor;
  vec3 specularColor;
  sampler2D diffuseMap;
  sampler2D specularMap;
  float shininess;
}; 
struct Light {
  vec4 position;
  vec3 ambient;
  vec3 diffuse;
  vec3 specular;
  float constantAtten;
  float linearAtten;
  float quadraticAtten;
};

out vec4 fragColor;

in vec3 FragPos, Normal;
in vec2 TexCoord;

uniform vec3 viewPos;
uniform Material material;

in vec4 FragPosLightSpace;
uniform sampler2D shadowMap;

#define NR_LIGHTS 1
uniform Light lights[NR_LIGHTS];

vec3 CalcLight(Light light, vec3 norm, vec3 viewDir, vec3 diffColor, vec3 specColor);
float ShadowCalculation();

void main()
{
  // compute fragment properties
  vec3 norm = normalize(Normal);
  vec3 viewDir = normalize(viewPos - FragPos);
  
  // define an output color value
  vec3 result = vec3(0.0, 0.0, 0.0);
  vec3 diffColor = vec3(texture(material.diffuseMap,TexCoord)) * material.diffuseColor;
  vec3 specColor = vec3(texture(material.specularMap,TexCoord)) * material.specularColor;
  
  // accumulate contributions of the lights
  for(int i = 0; i < NR_LIGHTS; i++){
    result += CalcLight(lights[i], norm, viewDir, diffColor, specColor);
  }
  fragColor = vec4(result, 1.0);
}

vec3 CalcLight( Light light, vec3 norm, vec3 viewDir, vec3 diffColor, vec3 specColor)
{
  // FragPos only matters for point light (as it is multiplied by w = 0 for directional lights)
  vec3 lightDir = normalize(light.position.xyz - FragPos * light.position.w);
  // Diffuse
  float diff = max(dot(norm, lightDir), 0.0);
  
  // Blinn-Phong model
  vec3 halfwayDir = normalize(lightDir + viewDir);  
  float spec = pow(max(dot(norm, halfwayDir), 0.0), material.shininess);
  
  // Shadows
  float shadowMult = 1.0;// - ShadowCalculation();
  
  // Combine
  vec3 ambient = light.ambient * diffColor;
  vec3 diffuse = light.diffuse * diff * diffColor * shadowMult;
  vec3 specular = light.specular * spec * specColor * shadowMult;
  
  // Attenuation (point lights only)
  float d = length(light.position.xyz - FragPos);
  float lightDenom = light.constantAtten + light.linearAtten * d + light.quadraticAtten * d * d;
  float attenuation = max(1.0 / lightDenom, 1.0 - light.position.w);    
  ambient  *= attenuation;
  diffuse  *= attenuation;
  specular *= attenuation;
  
  return(ambient + diffuse + specular);
}
float ShadowCalculation(){
  // perform perspective divide
  vec3 projCoords = FragPosLightSpace.xyz / FragPosLightSpace.w;
  // transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;
  // get closest depth value from light's perspective
  //   (using [0,1] range fragPosLight as coords)
  float closestDepth = texture(shadowMap, projCoords.xy).r; 
  // get depth of current fragment from light's perspective
  float currentDepth = projCoords.z;
  // check whether current frag pos is in shadow
  float bias = 0.002; // bias to prevent "shadow acne" (shadowmap res < display res)
  //float shadow = (currentDepth - bias > closestDepth) ? 1.0 : 0.0;
  // Simple PCF (percentage-closer filtering) for softer edges
  float shadow = 0.0;
  vec2 texelSize = 1.0 / vec2(textureSize(shadowMap,0));
  for(int x = -3; x <= 3; ++x){
    for(int y = -3; y <= 3; ++y){
      float pcfDepth = texture(shadowMap, projCoords.xy + vec2(x, y) * texelSize).r;
      shadow += (currentDepth - bias > pcfDepth) ? 1.0 : 0.0;        
    }    
  }
  shadow /= 49.0;

  return (shadow);
}`;

var textVsSource = `#version 300 es
in vec2 aPos;
in vec2 aTexCoord;
uniform mat4 matrix;
uniform mat4 model, view, projection;
out vec2 TexCoord;
void main() {
  gl_Position = projection * view * model * vec4(aPos,1.0,1.0);
  TexCoord = aTexCoord;
}`

var textFsSource = `#version 300 es
precision lowp float;
in vec2 TexCoord;
uniform sampler2D glyphTexture;
out vec4 fragColor;
void main() {
   fragColor = texture(glyphTexture, TexCoord);
}`


function setCustomShaderUniforms(object, ci, shaderProgram){
  
}

var setCustomShadowShaderUniforms = setCustomShaderUniforms;
