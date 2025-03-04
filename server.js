const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 配置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 存储玩家信息
const rooms = {};

// 处理socket连接
io.on('connection', (socket) => {
  console.log('有新用户连接: ' + socket.id);
  
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
    console.log('用户断开连接: ' + socket.id);
  });
});

// 将端口设置为环境变量提供的端口或者默认值
const PORT = process.env.PORT || 3000;

// 修改服务器监听部分
server.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器已在端口 ${PORT} 上启动`);
}); 