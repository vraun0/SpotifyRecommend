const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const auth = require('./auth');
const playlistRoutes = require('./playlistRoutes');
const lastfm = require('./lastfm');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({ origin: 'http://127.0.0.1:8888', credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(__dirname + '/public'));
app.use(session({
  secret: 'spotify-playlist-app',
  resave: false,
  saveUninitialized: true
}));

auth.setupAuthRoutes(app);
playlistRoutes.setupPlaylistRoutes(app);

app.listen(port, function() {
  console.log(`App listening on port ${port}`);
});
