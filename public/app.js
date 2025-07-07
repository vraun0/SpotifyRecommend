document.addEventListener('DOMContentLoaded', () => {
  const accessToken = localStorage.getItem('access_token');

  const params = {};
  const hashFragment = window.location.hash.substring(1);
  hashFragment.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[key] = value;
  });

  if (params.access_token) {
    document.getElementById('login').style.display = 'none';
    document.getElementById('loggedin').style.display = 'block';

    localStorage.setItem('access_token', params.access_token);
    localStorage.setItem('refresh_token', params.refresh_token);

    window.history.replaceState({}, document.title, '/');
  }

  document.getElementById('create-playlist-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('playlist-name').value;
    const description = document.getElementById('playlist-description').value;
    const isPublic = document.getElementById('is-public').checked;
    const lastFmUser = document.getElementById('lastfm-user-id').value;

    if (!lastFmUser) {
      alert("Please enter your Last.fm username.");
      return;
    }

    try {
      const response = await fetch('/api/auto-create-from-lastfm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          name,
          description,
          isPublic,
          userId: lastFmUser
        })
      });

      const playlist = await response.json();
      alert(`Playlist "${playlist.name}" created successfully!`);

      document.getElementById('create-playlist-form').reset();
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Failed to create playlist. Please try again.');
    }
  });
});
