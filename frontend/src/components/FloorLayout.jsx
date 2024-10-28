import React, { useEffect, useRef, useState } from 'react';
import { buildingLayouts } from '../config/floorLayouts';

const FloorLayout = ({ rooms, selectedRoom, onRoomClick, selectedBuilding, selectedFloor }) => {
  const containerRef = useRef(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height });
      }
    };

    // Initial measurement
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);

    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const getStatusFill = (status) => {
    return status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  };

  const getStatusStroke = (status) => {
    return status === 'available' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 840 600`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full h-full"
      >
        {/* Background image with proper scaling */}
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