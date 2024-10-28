import React, { useEffect, useRef, useState } from 'react';
import { buildingLayouts } from '../config/floorLayouts';

const FloorLayout = ({ rooms, selectedRoom, onRoomClick, selectedBuilding, selectedFloor }) => {
  const containerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 840, height: 600 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    // Create an image element to load and measure the background image
    const img = new Image();
    img.src = '/blueprint.png';
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setIsImageLoaded(true);
    };
  }, []);

  const getStatusFill = (status) => {
    return status === 'available' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  };

  const getStatusStroke = (status) => {
    return status === 'available' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
  };

  // Scale factor to adjust room positions and sizes based on image dimensions
  const scaleX = imageDimensions.width / 840;
  const scaleY = imageDimensions.height / 600;

  const scaleValue = (value, scale) => value * scale;

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white rounded-lg">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full h-full"
      >
        {/* Background image with proper scaling */}
        <image
          href="/blueprint.png"
          width={imageDimensions.width}
          height={imageDimensions.height}
          opacity="0.4"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Room overlays */}
        {isImageLoaded && rooms.map((room) => {
          const layout = buildingLayouts[selectedBuilding]?.[selectedFloor]?.rooms[room.id];
          if (!layout) return null;

          // Scale the room positions and dimensions
          const scaledX = scaleValue(layout.x, scaleX);
          const scaledY = scaleValue(layout.y, scaleY);
          const scaledWidth = scaleValue(layout.width, scaleX);
          const scaledHeight = scaleValue(layout.height, scaleY);
          const scaledCenterX = scaledX + scaledWidth / 2;
          const scaledCenterY = scaledY + scaledHeight / 2;

          return (
            <g
              key={room.id}
              onClick={() => onRoomClick?.(room)}
              className="cursor-pointer"
            >
              <rect
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
                fill={getStatusFill(room.status)}
                stroke={getStatusStroke(room.status)}
                strokeWidth={scaleValue(2, scaleX)}
                rx={scaleValue(4, scaleX)}
                className={`transition-all duration-200 ${
                  selectedRoom?.id === room.id ? 'filter brightness-95' : ''
                }`}
              />
              {/* Room number */}
              <text
                x={scaledCenterX}
                y={scaledCenterY - scaleValue(10, scaleY)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-medium"
                fill="#444"
                style={{ fontSize: `${scaleValue(14, scaleY)}px` }}
              >
                {room.displayName}
              </text>
              {/* Capacity */}
              <text
                x={scaledCenterX}
                y={scaledCenterY + scaleValue(10, scaleY)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs"
                fill="#666"
                style={{ fontSize: `${scaleValue(12, scaleY)}px` }}
              >
                {room.capacity} people
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {isImageLoaded && (
          <g transform={`translate(${scaleValue(20, scaleX)}, ${scaleValue(520, scaleY)})`}>
            <rect
              width={scaleValue(15, scaleX)}
              height={scaleValue(15, scaleY)}
              fill={getStatusFill('available')}
              stroke={getStatusStroke('available')}
            />
            <text
              x={scaleValue(20, scaleX)}
              y={scaleValue(12, scaleY)}
              className="text-xs"
              style={{ fontSize: `${scaleValue(12, scaleY)}px` }}
            >
              Available
            </text>
            <rect
              x={scaleValue(100, scaleX)}
              width={scaleValue(15, scaleX)}
              height={scaleValue(15, scaleY)}
              fill={getStatusFill('occupied')}
              stroke={getStatusStroke('occupied')}
            />
            <text
              x={scaleValue(120, scaleX)}
              y={scaleValue(12, scaleY)}
              className="text-xs"
              style={{ fontSize: `${scaleValue(12, scaleY)}px` }}
            >
              Occupied
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default FloorLayout;