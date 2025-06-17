console.log('🔍 Server.js started loading...');

import express from 'express';
console.log('✅ Express imported');

const app = express();
console.log('✅ Express app created');

const PORT = process.env.PORT || 10000;
console.log('✅ PORT set to:', PORT);

// シンプルなルート
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Journey AI Backend!' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Journey AI API is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

console.log('✅ Routes defined');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Journey AI Backend Server is running!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📅 Started: ${new Date().toISOString()}
🔗 URL: http://localhost:${PORT}
🩺 Health check: http://localhost:${PORT}/health
  `);
});

console.log('✅ Server.js fully loaded!');