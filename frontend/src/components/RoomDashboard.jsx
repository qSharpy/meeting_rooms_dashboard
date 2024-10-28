import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Calendar, Users, Clock, Building, Filter } from 'lucide-react';
import { fetchRooms, fetchRoomEvents } from '../services/roomService';
import { ChevronDown, ChevronUp } from 'lucide-react';
import FloorLayout from './FloorLayout';
import { buildingLayouts } from '../config/floorLayouts';

const RoomDashboard = () => {
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [capacityFilter, setCapacityFilter] = useState("all");
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [roomEvents, setRoomEvents] = useState({});

  // Group rooms by building and floor
  useEffect(() => {
    const loadRooms = async () => {
      setLoading(true);
      try {
        const roomsData = await fetchRooms();

        // Group rooms by building first, then by floor
        const roomsByBuilding = roomsData.reduce((buildingAcc, room) => {
          const building = room.building;
          const floor = room.floorNumber.toString();

          if (!buildingAcc[building]) {
            buildingAcc[building] = {};
          }

          if (!buildingAcc[building][floor]) {
            buildingAcc[building][floor] = [];
          }

          buildingAcc[building][floor].push({
            ...room,
            status: 'available',
            rect: {
              x: 20 + (buildingAcc[building][floor].length * 110),
              y: 20,
              width: 100,
              height: 80
            }
          });

          return buildingAcc;
        }, {});

        setRooms(roomsByBuilding);

        // Set initial building and floor if not set
        if (!selectedBuilding) {
          const firstBuilding = Object.keys(roomsByBuilding)[0];
          setSelectedBuilding(firstBuilding);

          if (firstBuilding) {
            const firstFloor = Object.keys(roomsByBuilding[firstBuilding])[0];
            setSelectedFloor(firstFloor);
          }
        }
      } catch (error) {
        console.error('Error loading rooms:', error);
      }
      setLoading(false);
    };

    loadRooms();
  }, []);

  // Load room events and update status
  const loadRoomEvents = useCallback(async () => {
    if (!rooms[selectedBuilding]?.[selectedFloor]) return;

    try {
      const updatedRooms = { ...rooms };
      const newRoomEvents = {};

      for (const room of rooms[selectedBuilding][selectedFloor]) {
        const events = await fetchRoomEvents(room.emailAddress);
        const now = new Date();
        const isOccupied = events.some(event => {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          return now >= start && now <= end;
        });

        updatedRooms[selectedBuilding][selectedFloor] = updatedRooms[selectedBuilding][selectedFloor]
          .map(r => r.id === room.id ? { ...r, status: isOccupied ? 'occupied' : 'available' } : r);

        // Store events for this room
        newRoomEvents[room.id] = events;
      }

      setRooms(updatedRooms);
      setRoomEvents(newRoomEvents);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading room events:', error);
    }
  }, [selectedBuilding, selectedFloor]);

  // Set up polling for room events
  useEffect(() => {
    if (selectedBuilding && selectedFloor) {
      loadRoomEvents();
      const intervalId = setInterval(loadRoomEvents, 30000); // Poll every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [selectedBuilding, selectedFloor, loadRoomEvents]);

  // Handle building change
  const handleBuildingChange = (buildingName) => {
    setSelectedBuilding(buildingName);
    // Reset floor selection to first floor of new building
    const firstFloor = Object.keys(rooms[buildingName] || {})[0];
    setSelectedFloor(firstFloor || "");
  };

  const getStatusColor = (status) => {
    return status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const filteredRooms = (rooms[selectedBuilding]?.[selectedFloor] || []).filter(room => {
    if (statusFilter !== "all" && room.status !== statusFilter) return false;
    if (capacityFilter === "small" && room.capacity > 6) return false;
    if (capacityFilter === "medium" && (room.capacity <= 6 || room.capacity > 10)) return false;
    if (capacityFilter === "large" && room.capacity <= 10) return false;
    return true;
  });

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

        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          {/* Building Selector */}
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            <select
              className="border rounded p-2"
              value={selectedBuilding}
              onChange={(e) => handleBuildingChange(e.target.value)}
            >
              {Object.keys(rooms).map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </select>
          </div>

          {/* Floor Selector */}
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            <select
              className="border rounded p-2"
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
            >
              {Object.keys(rooms[selectedBuilding] || {}).sort((a, b) => a - b).map((floor) => (
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

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* List View - 30% */}
        <div className="col-span-4 space-y-2">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className={`overflow-hidden ${hoveredRoom?.id === room.id ? 'ring-2 ring-blue-200' : ''}`}
              onMouseEnter={() => setHoveredRoom(room)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              <CardHeader className="py-3 px-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-base font-medium">{room.displayName}</span>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{room.capacity} people</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(room.status)}`}>
                      {room.status}
                    </span>
                    <button
                      onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                      className="p-1 hover:bg-gray-50 rounded"
                    >
                      {expandedRoom === room.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </CardTitle>
              </CardHeader>

              {expandedRoom === room.id && (
                <CardContent className="py-2 px-4">
                  <div className="space-y-2">
                    {roomEvents[room.id]
                      ?.filter(event => {
                        const eventDate = new Date(event.start.dateTime);
                        const today = new Date();
                        return eventDate.toDateString() === today.toDateString();
                      })
                      .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime))
                      .map((event, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium">{event.subject}</div>
                          <div className="text-gray-600">
                            Organizer: {event.organizer.emailAddress.name}
                          </div>
                          <div className="text-gray-600">
                            {new Date(event.start.dateTime).toLocaleTimeString()} -
                            {new Date(event.end.dateTime).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    {(!roomEvents[room.id] || !roomEvents[room.id].some(event => {
                      const eventDate = new Date(event.start.dateTime);
                      const today = new Date();
                      return eventDate.toDateString() === today.toDateString();
                    })) && (
                      <div className="text-gray-600 text-sm">No meetings today</div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Map View - 70% */}
        <div className="col-span-8 sticky top-4">
          <div className="bg-white rounded-lg shadow-lg p-4" style={{ height: 'calc(100vh - 8rem)' }}>
            <FloorLayout
              rooms={filteredRooms}
              selectedRoom={hoveredRoom}
              onRoomClick={(room) => setExpandedRoom(room.id)}
              selectedBuilding={selectedBuilding}
              selectedFloor={selectedFloor}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDashboard;