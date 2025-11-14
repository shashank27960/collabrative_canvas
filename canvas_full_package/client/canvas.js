// canvas.js - Upgraded client
(function(){
const socket = window._socket;
let myId = null;
let myColor = '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
let myName = 'User-'+Math.random().toString(36).slice(2,7);

const canvas = document.getElementById('main');
const overlay = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const ov = overlay.getContext('2d');

const toolSel = document.getElementById('tool');
const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const usersDiv = document.getElementById('users');
const statusSpan = document.getElementById('status');
const roomInput = document.getElementById('room');
const joinBtn = document.getElementById('join');

let roomId = 'default';

let devicePixelRatioValue = window.devicePixelRatio || 1;

function resize(){
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * devicePixelRatioValue);
  canvas.height = Math.floor(rect.height * devicePixelRatioValue);
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  ctx.setTransform(devicePixelRatioValue,0,0,devicePixelRatioValue,0,0);
  ov.setTransform(devicePixelRatioValue,0,0,devicePixelRatioValue,0,0);
  redrawAll();
}
window.addEventListener('resize', resize);
setTimeout(resize, 100);

// Offscreen checkpoint canvas
let checkpointCanvas = document.createElement('canvas');
let checkpointCtx = checkpointCanvas.getContext('2d');
let ops = []; // op-log for the current room
let removedStack = []; // for redo (per-user or global depending on server)
let lastCheckpointIndex = -1;
const CHECKPOINT_INTERVAL = 25; // create checkpoint every 25 ops

function makeCheckpoint(){
  // draw full ops onto checkpoint canvas for faster redraws
  checkpointCanvas.width = canvas.width;
  checkpointCanvas.height = canvas.height;
  checkpointCtx.setTransform(devicePixelRatioValue,0,0,devicePixelRatioValue,0,0);
  checkpointCtx.clearRect(0,0,checkpointCanvas.width,checkpointCanvas.height);
  for(let i=0;i<ops.length;i++){
    drawOpToContext(checkpointCtx, ops[i]);
  }
  lastCheckpointIndex = ops.length - 1;
}

// utility
function uid(){ return 'op-'+Math.random().toString(36).slice(2); }

function getTool(){ return toolSel.value; }
function getColor(){ return colorInput.value; }
function getWidth(){ return parseInt(widthInput.value,10); }

// pointer handling - supports mouse & touch
let drawing=false;
let currentOp=null;
let startPoint=null;

function clientXY(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0].clientX);
  const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0].clientY);
  return { x: (clientX - rect.left), y: (clientY - rect.top) };
}

// event handlers
canvas.addEventListener('pointerdown', (e)=>{
  canvas.setPointerCapture(e.pointerId);
  const p = clientXY(e);
  startPoint = p;
  drawing = true;
  if(getTool() === 'brush' || getTool() === 'eraser'){
    currentOp = {
      opId: uid(),
      tool: getTool(),
      color: getColor(),
      width: getWidth(),
      points: [p],
      meta: { userId: myId, name: myName, ts: Date.now() }
    };
  } else if (getTool() === 'rectangle' || getTool() === 'circle'){
    currentOp = {
      opId: uid(),
      tool: getTool(),
      color: getColor(),
      width: getWidth(),
      rect: { x: p.x, y: p.y, w:0, h:0 },
      meta: { userId: myId, name: myName, ts: Date.now() }
    };
  }
});

canvas.addEventListener('pointermove', (e)=>{
  const p = clientXY(e);
  // throttle cursor updates
  if(Math.random() < 0.2){
    socket.emit('cursor_move', { x: p.x, y: p.y, color: myColor, name: myName, roomId });
  }
  if(!drawing || !currentOp) return;
  if(currentOp.points){
    currentOp.points.push(p);
    // draw incremental
    drawLatestSegment(currentOp);
    // send chunk frequently
    if(currentOp.points.length % 6 === 0){
      socket.emit('draw_chunk', { opId: currentOp.opId, points: currentOp.points.slice(-6), tool: currentOp.tool, color: currentOp.color, width: currentOp.width, roomId });
    }
  } else if(currentOp.rect){
    currentOp.rect.w = p.x - startPoint.x;
    currentOp.rect.h = p.y - startPoint.y;
    // draw preview on overlay
    drawPreviewShape(currentOp);
  }
});

canvas.addEventListener('pointerup', (e)=>{
  canvas.releasePointerCapture(e.pointerId);
  if(!drawing || !currentOp) { drawing=false; return; }
  // finalize op and send to server
  if(currentOp.points){
    socket.emit('stroke_end', { ...currentOp, roomId });
  } else if(currentOp.rect){
    socket.emit('stroke_end', { ...currentOp, roomId });
  }
  // push locally (optimistic)
  // server will send op_added with seq; we keep op optimistic (without seq)
  ops.push(currentOp);
  if(ops.length % CHECKPOINT_INTERVAL === 0) makeCheckpoint();
  currentOp = null;
  drawing = false;
  redrawAll();
});

// drawing helpers
function drawLatestSegment(op){
  // draws only the last segment
  const pts = op.points;
  if(pts.length < 2) return;
  const a = pts[pts.length-2], b = pts[pts.length-1];
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap='round';
  ctx.lineWidth = op.width;
  if(op.tool === 'eraser'){ ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = 'rgba(0,0,0,1)'; }
  else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle=op.color; }
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(a.x, a.y, b.x, b.y); ctx.stroke();
  ctx.restore();
}

function drawOpToContext(context, op){
  if(op.tool === 'brush' || op.tool === 'eraser'){
    const pts = op.points || [];
    if(pts.length < 2) return;
    context.save();
    context.lineJoin='round'; context.lineCap='round'; context.lineWidth=op.width;
    if(op.tool === 'eraser'){ context.globalCompositeOperation='destination-out'; context.strokeStyle='black'; }
    else { context.globalCompositeOperation='source-over'; context.strokeStyle=op.color; }
    context.beginPath();
    context.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++){
      const midx=(pts[i-1].x+pts[i].x)/2; const midy=(pts[i-1].y+pts[i].y)/2;
      context.quadraticCurveTo(pts[i-1].x, pts[i-1].y, midx, midy);
    }
    context.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
    context.stroke();
    context.restore();
  } else if(op.tool === 'rectangle' || op.tool === 'circle'){
    context.save();
    context.lineWidth = op.width;
    context.globalCompositeOperation='source-over';
    context.strokeStyle = op.color;
    const r = op.rect;
    if(op.tool === 'rectangle'){
      context.strokeRect(r.x, r.y, r.w, r.h);
    } else {
      // circle: use bounding rect to draw ellipse
      context.beginPath();
      context.ellipse(r.x + r.w/2, r.y + r.h/2, Math.abs(r.w/2), Math.abs(r.h/2), 0, 0, Math.PI*2);
      context.stroke();
    }
    context.restore();
  }
}

function drawPreviewShape(op){
  ov.clearRect(0,0,overlay.width, overlay.height);
  drawOpToContext(ov, op);
}

// redraw full canvas using checkpoint optimization
function redrawAll(){
  ctx.clearRect(0,0,canvas.width, canvas.height);
  if(lastCheckpointIndex >= 0){
    // draw checkpoint bitmap
    ctx.drawImage(checkpointCanvas, 0, 0);
    // draw remaining ops
    for(let i=lastCheckpointIndex+1;i<ops.length;i++) drawOpToContext(ctx, ops[i]);
  } else {
    for(let i=0;i<ops.length;i++) drawOpToContext(ctx, ops[i]);
  }
  ov.clearRect(0,0,overlay.width, overlay.height);
}

// socket handlers
socket.on('connect', () => {
  myId = socket.id;
  statusSpan.textContent = 'Connected as '+myId;
});

socket.on('init_state', (data) => {
  if(!data || !data.ops) return;
  ops = data.ops;
  // restore lastCheckpointIndex to force making new checkpoint client-side
  lastCheckpointIndex = -1;
  makeCheckpoint();
  redrawAll();
});

socket.on('op_chunk', (chunk) => {
  // chunk might be part of a stroke; draw it directly for low-latency
  drawOpToContext(ctx, chunk);
});

socket.on('op_added', (op) => {
  // if we already have an op with same opId, update it; else append
  const idx = ops.findIndex(o => o.opId === op.opId);
  if(idx >= 0){
    ops[idx] = op;
  } else {
    ops.push(op);
  }
  if(ops.length % CHECKPOINT_INTERVAL === 0) makeCheckpoint();
  redrawAll();
});

socket.on('op_removed', (data) => {
  // server indicates opId removed; remove locally
  ops = ops.filter(o => o.opId !== data.opId);
  redrawAll();
});

socket.on('op_reinserted', (op) => {
  ops.push(op);
  redrawAll();
});

socket.on('cursor_update', (c) => {
  // draw cursors for users
  ov.clearRect(0,0,overlay.width,overlay.height);
  if(c && c.x !== undefined){
    ov.beginPath(); ov.fillStyle = c.color || '#000'; ov.arc(c.x, c.y, 4,0,Math.PI*2); ov.fill();
    ov.font='12px sans-serif'; ov.fillText(c.name || '', c.x+8, c.y+4);
  }
});

socket.on('user_list', (data) => {
  if(!data || !data.users) return;
  usersDiv.textContent = 'Users: ' + data.users.map(u=>u.name||u.id).join(', ');
});

// UI actions
undoBtn.addEventListener('click', ()=>{
  // per-user undo request
  socket.emit('undo_request', { roomId });
});
redoBtn.addEventListener('click', ()=>{ socket.emit('redo_request', { roomId }); });
joinBtn.addEventListener('click', ()=>{ roomId = roomInput.value || 'default'; socket.emit('join_room', { roomId, displayName: myName, color: myColor }); });

// initial join
socket.emit('join_room', { roomId: roomId, displayName: myName, color: myColor });

})();