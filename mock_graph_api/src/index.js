import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { rooms } from './data/rooms.js';
import { events } from './data/events.js';
import { initializeDisplayRoutes } from './routes/displayRoutes.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Existing routes
app.get('/v1.0/places/microsoft.graph.room', (req, res) => {
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#places/microsoft.graph.room',
    'value': rooms
  });
});

app.get('/v1.0/places/:roomId', (req, res) => {
  const room = rooms.find(r => r.id === req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

app.get('/v1.0/users/:roomEmail/calendar/events', (req, res) => {
  const roomEvents = events[req.params.roomEmail] || [];
  res.json({
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users/.../calendar/events',
    'value': roomEvents
  });
});

// Initialize display routes
initializeDisplayRoutes(app);

app.listen(port, () => {
  console.log(`Mock Graph API running at http://localhost:${port}`);
});