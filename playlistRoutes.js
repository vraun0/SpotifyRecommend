const spotifyPlaylist = require('./spotifyPlaylist');
const lastfm = require('./lastfm');

function setupPlaylistRoutes(app) {
  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.access_token) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Route to create a new playlist
  app.post('/api/playlists', ensureAuthenticated, async (req, res) => {
    try {
      const { name, description, isPublic, tracks } = req.body;
      const accessToken = req.session.access_token;
      
      // Get user profile to get user ID
      const userProfile = await spotifyPlaylist.getUserProfile(accessToken);
      
      // Create playlist
      const playlist = await spotifyPlaylist.createPlaylist(
        accessToken,
        userProfile.id,
        name,
        isPublic,
        description
      );
      
      // If tracks are provided, add them to the playlist
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

  // Route to search for tracks
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

  // Route to add tracks to an existing playlist
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
    // Use Promise.all for concurrent searches
    await Promise.all(trackNames.map(async (trackName) => {
      try {
            // Perform the search using the provided function
        const searchResults = await searchTracksFn(accessToken, trackName, 1); // Search for 1 track
          if (searchResults.tracks.items.length > 0) {
            trackUris.push(searchResults.tracks.items[0].uri);
          } else {
            console.warn(`Track not found on Spotify: ${trackName}`);
          }
      } catch (error) {
        console.error(`Error searching for track "${trackName}":`, error.message);
            // Decide how to handle errors, e.g., skip the track
      }
    }));
    return trackUris;
}

  app.post('/api/auto-create-from-lastfm', ensureAuthenticated, async (req, res) => {
    try {
      const { userId, name, description, isPublic } = req.body;
      const accessToken = req.session.access_token;

    // Step 1: Update the Last.fm URL with userId
      const recommendedTracks = await lastfm.parseTrack(userId); // update this to take userId

    // Step 2: Search for track URIs on Spotify
      const trackUris = await getSpotifyUrisFromTrackNames(
        recommendedTracks,
        accessToken,
        spotifyPlaylist.searchTracks
      );

    // Step 3: Create the playlist
      const userProfile = await spotifyPlaylist.getUserProfile(accessToken);
      const playlist = await spotifyPlaylist.createPlaylist(
        accessToken,
        userProfile.id,
        name,
        isPublic,
        description
      );

    // Step 4: Add tracks to playlist
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
