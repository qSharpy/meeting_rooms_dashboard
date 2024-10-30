import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';

const RoomDisplay = ({ roomId }) => {
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDisplayData();
    // Poll every 5 minutes
    const interval = setInterval(fetchDisplayData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchDisplayData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/displays/${roomId}`);
      const data = await response.json();
      setDisplayData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching display data:', error);
      setLoading(false);
    } finally {
      // Simulate e-ink refresh effect
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '--:--';
    }
  };

  const getEventStyle = (event) => {
    try {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      const dayStart = new Date(startTime);
      dayStart.setHours(0, 0, 0, 0);

      const startPercent = ((startTime - dayStart) / (24 * 60 * 60 * 1000)) * 100;
      const durationPercent = ((endTime - startTime) / (24 * 60 * 60 * 1000)) * 100;

      return {
        left: `${Math.max(0, Math.min(100, startPercent))}%`,
        width: `${Math.max(0, Math.min(100, durationPercent))}%`
      };
    } catch (error) {
      console.error('Error calculating event style:', error);
      return { left: '0%', width: '0%' };
    }
  };

  if (loading || !displayData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-600">Loading display...</div>
      </div>
    );
  }

  // Find current meeting if room is occupied
  const now = new Date();
  const currentMeeting = displayData.status.current === 'occupied'
    ? displayData.schedule.events.find(event => {
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        return now >= startTime && now <= endTime;
      })
    : null;

  // Get next meeting (excluding current meeting)
  const nextMeeting = displayData.schedule.events.find(event => {
    const startTime = new Date(event.start);
    return startTime > now && event.id !== currentMeeting?.id;
  });

  // Calculate current time percentage for timeline
  const currentTimePercent = ((now.getHours() + now.getMinutes() / 60) / 24) * 100;

  return (
    <div className={`min-h-screen bg-gray-100 p-4 transition-opacity duration-1000 ${refreshing ? 'opacity-50' : ''}`}>
      <Card className="max-w-5xl mx-auto bg-white shadow-lg aspect-video">
        <CardContent className="p-6 h-full flex flex-col">
          {/* Top Section: Room Info and Status */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-bold">{displayData.room.name}</h1>
              <div className="flex items-center text-gray-600 text-lg">
                <Users className="w-5 h-5 mr-1" />
                <span>{displayData.room.capacity}</span>
              </div>
            </div>
            <div className={`px-6 py-3 rounded-lg text-2xl font-bold ${
              displayData.status.current === 'available'
                ? 'bg-gray-100 text-gray-900'
                : 'bg-black text-white'
            }`}>
              {displayData.status.current.toUpperCase()}
            </div>
          </div>

          {/* Middle Section: Current and Next Meeting */}
          <div className="flex gap-4 mb-6 flex-1">
            {/* Current Meeting */}
            <div className="flex-1">
              {currentMeeting ? (
                <div className="h-full p-4 bg-black text-white rounded-lg">
                  <div className="text-lg font-medium">CURRENT MEETING</div>
                  <div className="text-2xl font-semibold mt-1">
                    {currentMeeting.subject}
                  </div>
                  <div className="flex items-center mt-2 text-lg opacity-90">
                    <Clock className="w-5 h-5 mr-2" />
                    <span>
                      {formatTime(currentMeeting.start)} -
                      {formatTime(currentMeeting.end)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full p-4 bg-gray-50 rounded-lg flex items-center justify-center text-xl text-gray-500">
                  No Current Meeting
                </div>
              )}
            </div>

            {/* Next Meeting */}
            <div className="flex-1">
              {nextMeeting ? (
                <div className="h-full p-4 bg-gray-100 rounded-lg">
                  <div className="text-lg font-medium text-gray-600">NEXT MEETING</div>
                  <div className="text-2xl font-semibold mt-1">
                    {nextMeeting.subject}
                  </div>
                  <div className="flex items-center mt-2 text-lg text-gray-600">
                    <Clock className="w-5 h-5 mr-2" />
                    <span>
                      {formatTime(nextMeeting.start)} -
                      {formatTime(nextMeeting.end)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full p-4 bg-gray-50 rounded-lg flex items-center justify-center text-xl text-gray-500">
                  No More Meetings Today
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section: Timeline */}
          <div>
            <div className="relative h-8 bg-gray-100 rounded-lg">
              {/* Hour marks */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-px bg-gray-200"
                  style={{ left: `${(i / 24) * 100}%` }}
                />
              ))}

              {/* Current time indicator */}
              <div
                className="absolute top-0 h-full w-1 bg-black z-10"
                style={{
                  left: `${currentTimePercent}%`,
                  transform: 'translateX(-50%)'
                }}
              />

              {/* Show all events on timeline */}
              {displayData.schedule.events.map((event) => (
                <div
                  key={event.id}
                  className={`absolute h-6 top-1 rounded ${
                    event === currentMeeting
                      ? 'bg-black'
                      : event === nextMeeting
                        ? 'bg-gray-600'
                        : 'bg-gray-400'
                  }`}
                  style={getEventStyle(event)}
                />
              ))}
            </div>

            {/* Time labels */}
            <div className="flex justify-between mt-1 text-xs text-gray-600">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-500 mt-2">
            Last updated: {formatTime(displayData.status.lastUpdated)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomDisplay;