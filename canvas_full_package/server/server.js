// server.js - Upgraded server with rooms, sqlite persistence, per-user undo, multi-room op logs
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// static client
app.use(express.static(path.join(__dirname, '../client')));

// open or create sqlite DB
const db = new Database(path.join(__dirname, 'canvas.db'));
// create ops table
db.prepare(`CREATE TABLE IF NOT EXISTS ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room TEXT,
  opId TEXT UNIQUE,
  seq INTEGER,
  opJson TEXT
)`).run();

// helper functions
function loadRoomOps(room){
  const rows = db.prepare('SELECT opJson FROM ops WHERE room = ? ORDER BY seq ASC').all(room);
  return rows.map(r => JSON.parse(r.opJson));
}
function persistOp(room, seq, op){
  const stmt = db.prepare('INSERT OR REPLACE INTO ops (room, opId, seq, opJson) VALUES (?,?,?,?)');
  stmt.run(room, op.opId, seq, JSON.stringify(op));
}
function deleteOp(room, opId){
  const stmt = db.prepare('DELETE FROM ops WHERE room = ? AND opId = ?');
  stmt.run(room, opId);
}
function resequenceRoom(room, ops){
  const del = db.prepare('DELETE FROM ops WHERE room = ?');
  del.run(room);
  const insert = db.prepare('INSERT INTO ops (room, opId, seq, opJson) VALUES (?,?,?,?)');
  const txn = db.transaction((opsArr) => {
    for(let i=0;i<opsArr.length;i++){
      insert.run(room, opsArr[i].opId, i, JSON.stringify(opsArr[i]));
    }
  });
  txn(ops);
}

const rooms = new Map(); // roomId -> { ops: [], removed: [] }

// socket.io logic
io.on('connection', (socket) => {
  let currentRoom = 'default';
  console.log('connect', socket.id);

  socket.on('join_room', (payload) => {
    currentRoom = payload.roomId || 'default';
    socket.join(currentRoom);
    if(!rooms.has(currentRoom)){
      const loaded = loadRoomOps(currentRoom);
      rooms.set(currentRoom, { ops: loaded, removed: [] });
    }
    // broadcast user list
    const clients = Array.from(io.sockets.adapter.rooms.get(currentRoom) || []).map(id => {
      const s = io.sockets.sockets.get(id);
      return { id, name: (s && s.displayName) ? s.displayName : id };
    });
    socket.displayName = payload.displayName || socket.id;
    socket.emit('init_state', { ops: rooms.get(currentRoom).ops });
    io.to(currentRoom).emit('user_list', { users: clients });
  });

  socket.on('draw_chunk', (data) => {
    // broadcast to room for low latency
    if(data && data.roomId) currentRoom = data.roomId;
    socket.to(currentRoom).emit('op_chunk', data);
  });

  socket.on('stroke_end', (op) => {
    const room = op.roomId || currentRoom;
    if(!rooms.has(room)) rooms.set(room, { ops: loadRoomOps(room), removed: [] });
    const r = rooms.get(room);
    op.seq = r.ops.length;
    r.ops.push(op);
    // persist
    persistOp(room, op.seq, op);
    // clear redo stack for that room
    r.removed = [];
    io.to(room).emit('op_added', op);
  });

  socket.on('cursor_move', (c) => {
    const room = c.roomId || currentRoom;
    socket.to(room).emit('cursor_update', c);
  });

  socket.on('undo_request', (data) => {
    const room = (data && data.roomId) ? data.roomId : currentRoom;
    const r = rooms.get(room);
    if(!r || r.ops.length === 0) return;
    // PER-USER UNDO: find last op by requester (socket.id)
    const idx = r.ops.map(o=>o.meta && o.meta.userId).lastIndexOf(socket.id);
    if(idx === -1){
      // fallback: global last op
      const removed = r.ops.pop();
      if(removed){
        r.removed.push(removed);
        deleteOp(room, removed.opId);
        // resequence DB & ops
        resequenceRoom(room, r.ops);
        io.to(room).emit('op_removed', { opId: removed.opId });
      }
    } else {
      const [removed] = r.ops.splice(idx,1);
      r.removed.push(removed);
      deleteOp(room, removed.opId);
      resequenceRoom(room, r.ops);
      io.to(room).emit('op_removed', { opId: removed.opId });
    }
  });

  socket.on('redo_request', (data) => {
    const room = (data && data.roomId) ? data.roomId : currentRoom;
    const r = rooms.get(room);
    if(!r || r.removed.length === 0) return;
    const op = r.removed.pop();
    op.seq = r.ops.length;
    r.ops.push(op);
    persistOp(room, op.seq, op);
    io.to(room).emit('op_reinserted', op);
  });

  socket.on('request_full_state', (payload) => {
    const room = (payload && payload.roomId) ? payload.roomId : currentRoom;
    if(!rooms.has(room)){
      rooms.set(room, { ops: loadRoomOps(room), removed: [] });
    }
    socket.emit('init_state', { ops: rooms.get(room).ops });
  });

  socket.on('disconnect', ()=>{ /* optionally broadcast user_list update */ });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('Server listening on '+PORT));