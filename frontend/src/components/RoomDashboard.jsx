import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Calendar, Users, Clock, Building, Filter } from 'lucide-react';
import { fetchRooms, fetchRoomEvents } from '../services/roomService';

const RoomDashboard = () => {
  const [selectedFloor, setSelectedFloor] = useState("0");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Load rooms from API and organize by floor
  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const roomsData = await fetchRooms();
        const roomsByFloor = roomsData.reduce((acc, room) => {
          const floor = room.floorNumber.toString();
          if (!acc[floor]) acc[floor] = [];
          acc[floor].push({
            ...room,
            status: 'available', // Default status
            rect: { x: 20 + (acc[floor].length * 110), y: 20, width: 100, height: 80 }
          });
          return acc;
        }, {});
        setRooms(roomsByFloor);
      } catch (error) {
        console.error('Error loading rooms:', error);
      }
      setLoading(false);
    };

    loadRooms();
  }, []);

  // Load room events and update status
  const loadRoomEvents = useCallback(async () => {
    if (!rooms[selectedFloor]) return;

    try {
      for (const room of rooms[selectedFloor]) {
        const events = await fetchRoomEvents(room.emailAddress);
        const now = new Date();
        const isOccupied = events.some(event => {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          return now >= start && now <= end;
        });

        setRooms(prev => ({
          ...prev,
          [selectedFloor]: prev[selectedFloor].map(r =>
            r.id === room.id ? { ...r, status: isOccupied ? 'occupied' : 'available' } : r
          )
        }));
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading room events:', error);
    }
  }, [selectedFloor, rooms]);

  // Set up polling for room events
  useEffect(() => {
    loadRoomEvents();
    const intervalId = setInterval(loadRoomEvents, 30000); // Poll every 30 seconds
    return () => clearInterval(intervalId);
  }, [loadRoomEvents]);

  const getStatusColor = (status) => {
    return status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusFill = (status) => {
    return status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  };

  const getStatusStroke = (status) => {
    return status === 'available' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
  };

  const filteredRooms = (rooms[selectedFloor] || []).filter(room => {
    if (statusFilter !== "all" && room.status !== statusFilter) return false;
    if (capacityFilter === "small" && room.capacity > 6) return false;
    if (capacityFilter === "medium" && (room.capacity <= 6 || room.capacity > 10)) return false;
    if (capacityFilter === "large" && room.capacity <= 10) return false;
    return true;
  });

  const FloorMap = () => (
    <div className="sticky top-4 bg-white rounded-lg shadow-lg p-4">
      <svg width="100%" height="400" viewBox="0 0 250 300" className="max-w-full">
        {/* Floor outline */}
        <rect x="10" y="10" width="230" height="280" fill="none" stroke="#e5e5e5" strokeWidth="2"/>

        {/* Room overlays */}
        {filteredRooms.map((room) => (
          <g
            key={room.id}
            onMouseEnter={() => setHoveredRoom(room)}
            onMouseLeave={() => setHoveredRoom(null)}
            className="cursor-pointer"
          >
            <rect
              x={room.rect.x}
              y={room.rect.y}
              width={room.rect.width}
              height={room.rect.height}
              fill={getStatusFill(room.status)}
              stroke={getStatusStroke(room.status)}
              strokeWidth="2"
              rx="4"
              className="transition-all duration-200"
              style={{
                filter: hoveredRoom?.id === room.id ? 'brightness(0.95)' : 'none'
              }}
            />
            <text
              x={room.rect.x + room.rect.width/2}
              y={room.rect.y + room.rect.height/2}
              textAnchor="middle"
              className="text-sm font-medium"
              fill="#444"
            >
              {room.displayName}
            </text>
            <text
              x={room.rect.x + room.rect.width/2}
              y={room.rect.y + room.rect.height/2 + 20}
              textAnchor="middle"
              className="text-xs"
              fill="#666"
            >
              {room.capacity} people
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform="translate(20, 260)">
          <rect width="15" height="15" fill={getStatusFill('available')} stroke={getStatusStroke('available')}/>
          <text x="20" y="12" className="text-xs">Available</text>
          <rect x="100" width="15" height="15" fill={getStatusFill('occupied')} stroke={getStatusStroke('occupied')}/>
          <text x="120" y="12" className="text-xs">Occupied</text>
        </g>
      </svg>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-8xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Meeting Room Status</h1>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            <select
              className="border rounded p-2"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              {Object.keys(rooms).sort().map((floor) => (
                <option key={floor} value={floor}>
                  Floor {floor}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <select
              className="border rounded p-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <select
              className="border rounded p-2"
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
            >
              <option value="all">All Sizes</option>
              <option value="small">Small (1-6)</option>
              <option value="medium">Medium (7-10)</option>
              <option value="large">Large (11+)</option>
            </select>
          </div>

          <div className="ml-auto text-gray-600">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* List View */}
        <div className="space-y-4">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className={`overflow-hidden ${hoveredRoom?.id === room.id ? 'ring-2 ring-blue-200' : ''}`}
              onMouseEnter={() => setHoveredRoom(room)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{room.displayName}</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(room.status)}`}>
                    {room.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>Capacity: {room.capacity} people</span>
                  </div>
                  {room.audioDeviceName && (
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>Equipment: {room.audioDeviceName}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {room.status === 'occupied'
                        ? 'Currently occupied'
                        : 'Available now'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map View */}
        <FloorMap />
      </div>
    </div>
  );
};

export default RoomDashboard;