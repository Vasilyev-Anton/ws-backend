// db/db.js

const user = {
  nickname: [],
  add(item) {
    this.nickname.push(item);
  }
};

const history = {
  messages: [],
  add(nickname, message) {
    const timestamp = new Date();
    this.messages.push({ nickname, message, timestamp });
  },
  getAll() {
    return this.messages;
  }
};

module.exports = { user, history };
