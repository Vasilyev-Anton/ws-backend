const combineRouters = require('koa-combine-routers');

const index = require('./index/index.js');
const register = require('./register');

const router = combineRouters(
  index,
  register
);

module.exports = router;