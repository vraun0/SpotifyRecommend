const spotifyPlaylist = require('./spotifyPlaylist');
const lastfm = require('./lastfm');

function setupPlaylistRoutes(app) {
  const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.access_token) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  };

  app.post('/api/playlists', ensureAuthenticated, async (req, res) => {
    try {
      const { name, description, isPublic, tracks } = req.body;
      const accessToken = req.session.access_token;
      
      const userProfile = await spotifyPlaylist.getUserProfile(accessToken);
      
      const playlist = await spotifyPlaylist.createPlaylist(
        accessToken,
        userProfile.id,
        name,
        isPublic,
        description
      );
      
      if (tracks && tracks.length > 0) {
        await spotifyPlaylist.addTracksToPlaylist(
          accessToken,
          playlist.id,
          tracks
        );
      }
      
      res.status(201).json(playlist);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/search', ensureAuthenticated, async (req, res) => {
    try {
      const { q, limit } = req.query;
      const accessToken = req.session.access_token;
      
      const searchResults = await spotifyPlaylist.searchTracks(
        accessToken,
        q,
        limit
      );
      
      res.json(searchResults);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/playlists/:id/tracks', ensureAuthenticated, async (req, res) => {
    try {
      const { tracks } = req.body;
      const playlistId = req.params.id;
      const accessToken = req.session.access_token;
      
      const result = await spotifyPlaylist.addTracksToPlaylist(
        accessToken,
        playlistId,
        tracks
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  async function getSpotifyUrisFromTrackNames(trackNames, accessToken, searchTracksFn) {
    const trackUris = [];
    await Promise.all(trackNames.map(async (trackName) => {
      try {
        const searchResults = await searchTracksFn(accessToken, trackName, 1); 
          if (searchResults.tracks.items.length > 0) {
            trackUris.push(searchResults.tracks.items[0].uri);
          } else {
            console.warn(`Track not found on Spotify: ${trackName}`);
          }
      } catch (error) {
        console.error(`Error searching for track "${trackName}":`, error.message);
      }
    }));
    return trackUris;
}

  app.post('/api/auto-create-from-lastfm', ensureAuthenticated, async (req, res) => {
    try {
      const { userId, name, description, isPublic } = req.body;
      const accessToken = req.session.access_token;

      const recommendedTracks = await lastfm.parseTrack(userId); 

      const trackUris = await getSpotifyUrisFromTrackNames(
        recommendedTracks,
        accessToken,
        spotifyPlaylist.searchTracks
      );

      const userProfile = await spotifyPlaylist.getUserProfile(accessToken);
      const playlist = await spotifyPlaylist.createPlaylist(
        accessToken,
        userProfile.id,
        name,
        isPublic,
        description
      );

      await spotifyPlaylist.addTracksToPlaylist(accessToken, playlist.id, trackUris);

      res.status(201).json({ playlist });
    } catch (error) {
      console.error('Error creating playlist from Last.fm:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
}

module.exports = {
  setupPlaylistRoutes
};
