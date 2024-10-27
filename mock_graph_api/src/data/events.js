import { rooms } from './rooms.js';

const generateMockEvents = () => {
  const events = {};
  const now = new Date();
  const businessHours = { start: 9, end: 18 }; // 9 AM to 6 PM

  rooms.forEach(room => {
    events[room.emailAddress] = [];

    // Only generate events for weekdays
    for (let i = 0; i < 7; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(now.getDate() + i);

      // Don't skip weekends
//      if (eventDate.getDay() === 0 || eventDate.getDay() === 6) {
//        continue;
//      }

      const numEvents = Math.floor(Math.random() * 2) + 1; // 1-2 events per day

      for (let j = 0; j < numEvents; j++) {
        // 40% chance for a room to have a current meeting during business hours
        const currentHour = now.getHours();
        const isBusinessHours = currentHour >= businessHours.start && currentHour < businessHours.end;
        const isCurrentMeeting = Math.random() < 0.4 && i === 0 && isBusinessHours;

        let startHour, endHour;

        if (isCurrentMeeting) {
          startHour = currentHour - 1;
          endHour = startHour + 1 + Math.floor(Math.random() * 2);
        } else {
          startHour = businessHours.start + Math.floor(Math.random() * (businessHours.end - businessHours.start - 2));
          endHour = startHour + 1 + Math.floor(Math.random() * 2);
        }

        const startDate = new Date(eventDate);
        startDate.setHours(startHour, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setHours(endHour, 0, 0, 0);

        events[room.emailAddress].push({
          id: `${room.id}-${i}-${j}`,
          subject: `Meeting ${i}-${j}`,
          organizer: {
            emailAddress: {
              name: `User ${Math.floor(Math.random() * 100)}`,
              address: `user${Math.floor(Math.random() * 100)}@mockgraph.local`
            }
          },
          start: {
            dateTime: startDate.toISOString(),
            timeZone: "Europe/Bucharest"
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: "Europe/Bucharest"
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