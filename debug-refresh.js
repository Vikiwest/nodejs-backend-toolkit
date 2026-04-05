const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3002/api/auth/refresh-token', {
      refreshToken: 'test',
    });
    console.log('SUCCESS:', res.status, res.data);
  } catch (err) {
    console.log('ERROR:', err.response?.status);
    console.log('DATA:', JSON.stringify(err.response?.data, null, 2));
  }
}

test();
