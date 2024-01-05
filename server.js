//server.js
const http = require('http');
const Koa = require('koa');
const koaParser = require('koa-bodyparser');
const WS = require('ws');
const router = require('./routes');
const { history } = require('./db/db');

const userState = [];

const app = new Koa();

app.use(koaParser({
  urlencoded: true,
}));

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (origin) {
    ctx.response.set('Access-Control-Allow-Origin', '*');
    ctx.response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
  }
  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204;
    return;
  }
  await next();
});

app.use(router());

const port = process.env.PORT || 10000;

const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
wsServer.on('connection', (ws) => {
  const usersList = userState.map((user) => user.username);
  ws.send(JSON.stringify({ type: 'users', users: usersList }));

  const messages = history.getAll().map(h => ({
    type: 'message',
    user: h.nickname,
    content: h.message,
    time: `${String(h.timestamp.getHours()).padStart(2, '0')}:${String(h.timestamp.getMinutes()).padStart(2, '0')} ${String(h.timestamp.getDate()).padStart(2, '0')}.${String(h.timestamp.getMonth() + 1).padStart(2, '0')}.${h.timestamp.getFullYear()}`
  }));
  ws.send(JSON.stringify({ type: 'history', content: messages }));
  ws.on('message', (message) => {
    
    try {
      const receivedMSG = JSON.parse(message);
      const userExists = userState.some((user) => user.username === receivedMSG.user);
      switch (receivedMSG.type) {
        case 'register':
          if (!receivedMSG.user) {
            ws.send(JSON.stringify({ type: 'error', message: 'Не указан псевдоним' }));
            return;
          }
          if (!userExists) {
            userState.push({ username: receivedMSG.user, ws: ws });
            broadcastUserList();
          }
          break;
        case 'exit':
          const index = userState.findIndex((user) => user.username === receivedMSG.user);
          if (index !== -1) {
            userState.splice(index, 1);
            broadcastUserList();
          }
          break;
        case 'send':
          if (!userExists) {
            userState.push({ username: receivedMSG.user, ws: ws });
            broadcastUserList(); 
          }
          broadcastMessage(receivedMSG.user, receivedMSG.content);
          break;
        default:
          console.error('Неизвестный тип сообщения:', receivedMSG.type);
      }
    } catch (error) {
      console.error('Ошибка парсинга JSON:', error);
    }
  });
  ws.on('close', () => {
    const index = userState.findIndex(user => user.ws === ws);
    if (index !== -1) {
      userState.splice(index, 1);
      broadcastUserList();
    }
  });
  
});

function broadcastUserList() {
  const usersList = userState.map((user) => user.username);
  wsServer.clients.forEach((client) => {
    if (client.readyState === WS.OPEN) {
      client.send(JSON.stringify({ type: 'users', users: usersList }));
    }
  });
}

function broadcastMessage(user, content) {
  if (!content) {
    return;
  }
  const timestamp = new Date();
  const hour = String(timestamp.getHours()).padStart(2, '0');
  const minute = String(timestamp.getMinutes()).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const year = timestamp.getFullYear();
  const formattedTime = `${hour}:${minute} ${day}.${month}.${year}`;

  const message = {
    type: 'message',
    user,
    content,
    time: formattedTime
  };
  
  history.add(user, content);

  wsServer.clients.forEach((client) => {
    if (client.readyState === WS.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

server.listen(port);
