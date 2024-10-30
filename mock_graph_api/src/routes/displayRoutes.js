import { rooms } from '../data/rooms.js';
import { events } from '../data/events.js';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Cache storage
const cache = new Map();

const getDisplayData = (roomId) => {
  const now = new Date();
  const room = rooms.find(r => r.id === roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Get room's events
  const roomEvents = events[room.emailAddress] || [];

  // Filter today's events and sort by start time
  const todayEvents = roomEvents
    .filter(event => {
      const eventStart = new Date(event.start.dateTime);
      return eventStart >= todayStart && eventStart <= todayEnd;
    })
    .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime))
    .map(event => ({
      id: event.id,
      start: event.start.dateTime,
      end: event.end.dateTime,
      subject: event.subject
    }));

  // Determine current status
  const currentStatus = todayEvents.some(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return now >= eventStart && now <= eventEnd;
  }) ? 'occupied' : 'available';

  // Find next meeting
  const nextMeeting = todayEvents.find(event => new Date(event.start) > now);

  return {
    room: {
      id: room.id,
      name: room.displayName,
      capacity: room.capacity
    },
    status: {
      current: currentStatus,
      lastUpdated: new Date().toISOString()
    },
    schedule: {
      events: todayEvents,
      nextMeeting: nextMeeting || null
    }
  };
};

// Initialize display routes
export const initializeDisplayRoutes = (app) => {
  // Get display data for a specific room
  app.get('/v1.0/displays/:roomId', (req, res) => {
    try {
      const { roomId } = req.params;

      // Check cache first
      const cachedData = cache.get(roomId);
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
        return res.json(cachedData.data);
      }

      // Get fresh data
      const displayData = getDisplayData(roomId);

      // Update cache
      cache.set(roomId, {
        data: displayData,
        timestamp: Date.now()
      });

      res.json(displayData);
    } catch (error) {
      if (error.message === 'Room not found') {
        res.status(404).json({ error: 'Room not found' });
      } else {
        console.error('Display API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Force refresh display data for a room
  app.post('/v1.0/displays/:roomId/refresh', (req, res) => {
    try {
      const { roomId } = req.params;

      // Clear cache for this room
      cache.delete(roomId);

      // Get fresh data
      const displayData = getDisplayData(roomId);

      // Update cache
      cache.set(roomId, {
        data: displayData,
        timestamp: Date.now()
      });

      res.json(displayData);
    } catch (error) {
      if (error.message === 'Room not found') {
        res.status(404).json({ error: 'Room not found' });
      } else {
        console.error('Display API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });
};