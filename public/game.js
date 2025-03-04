// 获取DOM元素
const loginForm = document.getElementById('loginForm');
const joinBtn = document.getElementById('joinBtn');
const playerIdInput = document.getElementById('playerId');
const roomIdInput = document.getElementById('roomId');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 连接到服务器
const socket = io();

// 玩家数据
let players = {};
let myPlayerId = null;

// 移动状态
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// 当玩家点击加入按钮
joinBtn.addEventListener('click', () => {
  const playerId = playerIdInput.value.trim();
  const roomId = roomIdInput.value.trim();
  
  if (playerId && roomId) {
    myPlayerId = socket.id;
    
    // 发送加入房间请求
    socket.emit('join', {
      id: playerId,
      room: roomId
    });
    
    // 隐藏登录表单，显示游戏画布
    loginForm.style.display = 'none';
    canvas.style.display = 'block';
    
    // 启动游戏循环
    gameLoop();
  } else {
    alert('请输入玩家ID和房间号');
  }
});

// 处理键盘按下事件
document.addEventListener('keydown', (event) => {
  if (!myPlayerId) return;
  
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = true;
  }
});

// 处理键盘释放事件
document.addEventListener('keyup', (event) => {
  if (!myPlayerId) return;
  
  const key = event.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    keys[key] = false;
  }
});

// 游戏主循环
function gameLoop() {
  if (!myPlayerId || !players[socket.id]) {
    requestAnimationFrame(gameLoop);
    return;
  }
  
  // 处理玩家移动
  const speed = 5;
  let moved = false;
  
  if (keys.w) {
    players[socket.id].y -= speed;
    moved = true;
  }
  
  if (keys.s) {
    players[socket.id].y += speed;
    moved = true;
  }
  
  if (keys.a) {
    players[socket.id].x -= speed;
    moved = true;
  }
  
  if (keys.d) {
    players[socket.id].x += speed;
    moved = true;
  }
  
  // 如果玩家移动了，发送位置更新
  if (moved) {
    socket.emit('playerMovement', {
      x: players[socket.id].x,
      y: players[socket.id].y
    });
  }
  
  // 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制所有玩家
  Object.values(players).forEach((player) => {
    ctx.beginPath();
    ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
    
    // 绘制玩家ID
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(player.id, player.x, player.y - 30);
  });
  
  // 继续游戏循环
  requestAnimationFrame(gameLoop);
}

// Socket.io 事件处理
socket.on('currentPlayers', (roomPlayers) => {
  players = roomPlayers;
  console.log('当前房间玩家:', players);
});

socket.on('newPlayer', (playerInfo) => {
  players[socket.id] = playerInfo;
  console.log('新玩家加入:', playerInfo);
});

socket.on('playerMoved', (movementInfo) => {
  if (players[movementInfo.id]) {
    players[movementInfo.id].x = movementInfo.x;
    players[movementInfo.id].y = movementInfo.y;
  }
});

socket.on('playerDisconnected', (playerId) => {
  delete players[playerId];
  console.log('玩家离开:', playerId);
}); 