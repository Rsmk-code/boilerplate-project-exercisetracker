const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/User');
const Exercise = require('./models/Exercise');

require('dotenv').config();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))

mongoose.connect(process.env.MONGO_URI ,{ useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected!'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  try {
      let user = await User.findOne({ username });
      if (!user) {
          user = new User({ username });
          await user.save();
      }
      res.json({ username: user.username, _id: user._id });
  } catch (err) {
      console.error(err);
      res.status(500).json('Server Error');
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json('Server Error');
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json('User not found');

    const exercise = new Exercise({
      user_id: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    })
  } catch (err) {
    res.status(500).json('Server Error');
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
      const user = await User.findById(_id);
      if (!user) return res.status(404).json('User not found');
      
      let filter = { user_id: _id };
      if (from || to) filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);

      let log = await Exercise.find(filter).limit(parseInt(limit) || 100);
      log = log.map(ex => ({
          description: ex.description,
          duration: ex.duration,
          date: ex.date.toDateString()
      }));

      res.json({
          username: user.username,
          count: log.length,
          _id: user._id,
          log
      });
  } catch (err) {
      res.status(500).json('Server Error');
  }
});

const listener = app.listen(process.env.PORT || 3001, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
