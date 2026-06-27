const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/hunger-bridge').then(async () => {
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
});
