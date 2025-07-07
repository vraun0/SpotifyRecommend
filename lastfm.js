async function parseTrack(userId) {
  const recommendedUrl = `https://www.last.fm/player/station/user/${userId}/recommended`;

  const response = await fetch(recommendedUrl);
  const data = await response.json();
  const playlist = data.playlist;

  const tracks = playlist.map(track => `${track.name} - ${track.artists[0].name}`);
  return tracks;
}
module.exports = {
  parseTrack
};
