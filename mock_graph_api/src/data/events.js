import { rooms } from './rooms.js';

// Generate events for the next 7 days
const generateMockEvents = () => {
  const events = {};
  const now = new Date();

  rooms.forEach(room => {
    events[room.emailAddress] = [];

    // Generate 2-3 random events per day for each room
    for (let i = 0; i < 7; i++) {
      const numEvents = Math.floor(Math.random() * 2) + 2;

      for (let j = 0; j < numEvents; j++) {
        const startHour = 9 + Math.floor(Math.random() * 7); // Between 9 AM and 4 PM
        const duration = Math.floor(Math.random() * 2) + 1; // 1-2 hours

        const eventDate = new Date(now);
        eventDate.setDate(now.getDate() + i);
        eventDate.setHours(startHour, 0, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(startHour + duration);

        events[room.emailAddress].push({
          id: `${room.id}-${i}-${j}`,
          subject: `Meeting ${i}-${j}`,
          organizer: {
            emailAddress: {
              name: "Mock User",
              address: "user@mockgraph.local"
            }
          },
          start: {
            dateTime: eventDate.toISOString(),
            timeZone: "UTC"
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: "UTC"
          },
          location: {
            displayName: room.displayName,
            locationEmailAddress: room.emailAddress
          }
        });
      }
    }
  });

  return events;
};

export const events = generateMockEvents();