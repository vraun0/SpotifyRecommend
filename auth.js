const express = require('express');
const crypto = require('crypto');
const querystring = require('querystring');
const dotenv = require('dotenv').config();

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = 'http://127.0.0.1:8888/callback';
const stateKey = 'spotify_auth_state';

function generateRandomString(length) {
  return crypto.randomBytes(length).toString('hex');
}

function setupAuthRoutes(app) {
  app.get('/login', function(req, res) {
    const state = generateRandomString(16);
    const scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    
    res.cookie(stateKey, state, { 
      httpOnly: true,
      sameSite: 'lax'
    });
    
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state
      }));
  });

  app.get('/callback', async function(req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;
    
    console.log('Received state:', state);
    console.log('Stored state:', storedState);
    console.log('Cookies:', req.cookies);
    
    if(state === null || state !== storedState) {
      res.redirect('/#' + querystring.stringify({
        error: 'state_mismatch'
      }));
    } else {
      res.clearCookie(stateKey);
      
      try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
          },
          body: new URLSearchParams({
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
          })
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`HTTP error! Status: ${tokenResponse.status}`);
        }
        
        const body = await tokenResponse.json();
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        
        if (req.session) {
          req.session.access_token = access_token;
          req.session.refresh_token = refresh_token;
        }
        
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': 'Bearer ' + access_token }
        });
        
        if (userResponse.ok) {
          const userProfile = await userResponse.json();
          console.log(userProfile);
        }
        
        res.redirect('/#' + querystring.stringify({
          access_token: access_token,
          refresh_token: refresh_token
        }));
      } catch (error) {
        console.error('Error during authentication:', error);
        res.redirect('/#' + querystring.stringify({
          error: 'invalid_token'
        }));
      }
    }
  });

  app.get('/refresh_token', async function(req, res) {
    const refresh_token = req.query.refresh_token;
    
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        body: new URLSearchParams({
          refresh_token: refresh_token,
          grant_type: 'refresh_token'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const body = await response.json();
      const access_token = body.access_token;
      const new_refresh_token = body.refresh_token || refresh_token;
      
      res.send({
        access_token: access_token,
        refresh_token: new_refresh_token
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).send({ error: 'Failed to refresh token' });
    }
  });
}

module.exports = {
  setupAuthRoutes
};
