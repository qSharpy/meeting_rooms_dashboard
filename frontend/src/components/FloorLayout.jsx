import React from 'react';
import { buildingLayouts } from '../config/floorLayouts';

const FloorLayout = ({ rooms, selectedRoom, onRoomClick, selectedBuilding, selectedFloor }) => {
  const getStatusFill = (status) => {
    return status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  };

  const getStatusStroke = (status) => {
    return status === 'available' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
  };

  return (
    <div className="relative w-full bg-white rounded-lg shadow-lg">
      <svg
        width="100%"
        height="400"
        viewBox="0 0 840 600"
        className="max-w-full"
        style={{ backgroundColor: '#fff' }}
      >
        {/* Blueprint background */}
        <image
          href="/blueprint.png"
          width="840"
          height="600"
          opacity="0.4"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Room overlays */}
        {rooms.map((room) => {
          const layout = buildingLayouts[selectedBuilding]?.[selectedFloor]?.rooms[room.id];
          if (!layout) return null;

          // Calculate center points
          const centerX = layout.x + layout.width / 2;
          const centerY = layout.y + layout.height / 2;

          return (
            <g
              key={room.id}
              onClick={() => onRoomClick?.(room)}
              className="cursor-pointer"
            >
              <rect
                x={layout.x}
                y={layout.y}
                width={layout.width}
                height={layout.height}
                fill={getStatusFill(room.status)}
                stroke={getStatusStroke(room.status)}
                strokeWidth="2"
                rx="4"
                className={`transition-all duration-200 ${
                  selectedRoom?.id === room.id ? 'filter brightness-95' : ''
                }`}
              />
              {/* Room number */}
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-medium"
                fill="#444"
              >
                {room.displayName}
              </text>
              {/* Capacity */}
              <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs"
                fill="#666"
              >
                {room.capacity} people
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 520)">
          <rect width="15" height="15" fill={getStatusFill('available')} stroke={getStatusStroke('available')}/>
          <text x="20" y="12" className="text-xs">Available</text>
          <rect x="100" width="15" height="15" fill={getStatusFill('occupied')} stroke={getStatusStroke('occupied')}/>
          <text x="120" y="12" className="text-xs">Occupied</text>
        </g>
      </svg>
    </div>
  );
};

export default FloorLayout;