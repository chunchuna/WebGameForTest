const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

// 存储玩家信息
const rooms = {};

io.on('connection', (socket) => {
  let playerInfo = {
    id: null,
    room: null,
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200,
    color: `hsl(${Math.random() * 360}, 70%, 50%)` // 随机颜色
  };

  // 玩家加入房间
  socket.on('join', (data) => {
    playerInfo.id = data.id;
    playerInfo.room = data.room;
    
    socket.join(data.room);
    
    // 初始化房间
    if (!rooms[data.room]) {
      rooms[data.room] = {};
    }
    
    // 添加玩家到房间
    rooms[data.room][socket.id] = playerInfo;
    
    // 发送当前房间所有玩家信息给新加入的玩家
    socket.emit('currentPlayers', rooms[data.room]);
    
    // 通知房间其他玩家有新玩家加入
    socket.to(data.room).emit('newPlayer', playerInfo);
    
    console.log(`玩家 ${data.id} 加入房间 ${data.room}`);
  });

  // 处理玩家移动
  socket.on('playerMovement', (movementData) => {
    if (!playerInfo.room) return;
    
    // 更新玩家位置
    rooms[playerInfo.room][socket.id].x = movementData.x;
    rooms[playerInfo.room][socket.id].y = movementData.y;
    
    // 广播玩家位置给同一房间的其他玩家
    socket.to(playerInfo.room).emit('playerMoved', {
      id: socket.id,
      x: movementData.x,
      y: movementData.y
    });
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    if (playerInfo.room && rooms[playerInfo.room]) {
      // 从房间中移除玩家
      delete rooms[playerInfo.room][socket.id];
      
      // 通知其他玩家
      socket.to(playerInfo.room).emit('playerDisconnected', socket.id);
      
      // 如果房间为空，清理房间
      if (Object.keys(rooms[playerInfo.room]).length === 0) {
        delete rooms[playerInfo.room];
      }
      
      console.log(`玩家 ${playerInfo.id} 离开房间 ${playerInfo.room}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 