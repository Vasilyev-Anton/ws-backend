// routes/index.js
const Router = require('koa-router');
const { user } = require('../../db/db');
const router = new Router();

router.post('/register', (ctx) => {
  const { nickname } = ctx.request.body;
  const isNicknameTaken = user.nickname.includes(nickname);

  if (isNicknameTaken) {
    ctx.response.status = 400;
    ctx.response.body = { status: "Этот псевдоним уже используется." };
  } else {
    user.add(nickname);
    ctx.response.status = 200;
    ctx.response.body = { status: "OK", nickname };
  }

});

module.exports = router;
