import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const CoordinateMapper = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPoints, setSelectedPoints] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const containerWidth = canvas.parentElement.clientWidth;
        const scale = containerWidth / img.width;
        canvas.width = containerWidth;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        redrawPoints();
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  const redrawPoints = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);

      // Calculate P4 if we have first three points
      const points = [...selectedPoints];
      if (points.length === 3) {
        const [p1, p2, p3] = points;
        const centerX = p1.x + Math.round((p2.x - p1.x) / 2);
        const centerY = p1.y + Math.round((p3.y - p1.y) / 2);
        points.push({ x: centerX, y: centerY });
      }

      // Draw points and connect them
      points.forEach((point, index) => {
        const { canvasX, canvasY } = convertToCanvasCoords(point.x, point.y);

        // Draw point
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = getPointColor(index);
        ctx.fill();

        // Add point label
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.fillText(getPointLabel(index), canvasX + 8, canvasY - 8);

        // Draw lines between points 1-2-3 if we have enough points
        if (index < 3 && points[index + 1]) {
          const nextPoint = points[index + 1];
          const { canvasX: nextX, canvasY: nextY } = convertToCanvasCoords(nextPoint.x, nextPoint.y);

          if (index < 2) { // Only draw lines between corner points
            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
            ctx.lineTo(nextX, nextY);
            ctx.strokeStyle = '#666';
            ctx.setLineDash([2, 2]);
            ctx.stroke();
          }
        }

        // Draw the final line to complete the rectangle if we have 3 points
        if (index === 2 && points.length >= 3) {
          const firstPoint = points[0];
          const { canvasX: firstX, canvasY: firstY } = convertToCanvasCoords(firstPoint.x, firstPoint.y);

          ctx.beginPath();
          ctx.moveTo(canvasX, canvasY);
          ctx.lineTo(firstX, firstY);
          ctx.strokeStyle = '#666';
          ctx.setLineDash([2, 2]);
          ctx.stroke();
        }
      });
    };
    img.src = imageUrl;
  };

  const convertToCanvasCoords = (svgX, svgY) => {
    const canvasX = (svgX / 840) * canvasRef.current.width;
    const canvasY = (svgY / 600) * canvasRef.current.height;
    return { canvasX, canvasY };
  };

  const getPointColor = (index) => {
    const colors = ['red', 'blue', 'green', 'purple'];
    return colors[index % colors.length];
  };

  const getPointLabel = (index) => {
    const labels = ['Top-Left', 'Top-Right', 'Bottom-Right', 'Label (Auto)'];
    return `P${index + 1}: ${labels[index]}`;
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || selectedPoints.length >= 3) return; // Now we only need 3 points

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to 840x600 coordinate system
    const svgX = Math.round((x / canvasRef.current.width) * 840);
    const svgY = Math.round((y / canvasRef.current.height) * 600);

    const newPoints = [...selectedPoints, { x: svgX, y: svgY }];
    setSelectedPoints(newPoints);

    // Redraw everything
    redrawPoints();

    // Generate room config if we have all 3 points (P4 will be auto-calculated)
    if (newPoints.length === 3) {
      generateRoomConfig(newPoints);
    }
  };

  const generateRoomConfig = (points) => {
    const [p1, p2, p3] = points;
    const width = p2.x - p1.x;
    const height = p3.y - p1.y;
    const centerX = p1.x + Math.round(width / 2);
    const centerY = p1.y + Math.round(height / 2);

    const roomConfig = {
      x: p1.x,
      y: p1.y,
      width,
      height,
      label: {
        x: centerX,
        y: centerY
      }
    };

    console.log('Room Configuration:');
    console.log(JSON.stringify(roomConfig, null, 2));
  };

  const handleClear = () => {
    setSelectedPoints([]);
    if (canvasRef.current && imageUrl) {
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      img.src = imageUrl;
    }
  };

  const getRoomConfigDisplay = () => {
    if (selectedPoints.length < 3) {
      return `Click to add point ${selectedPoints.length + 1} (${getPointLabel(selectedPoints.length)})`;
    }

    const [p1, p2, p3] = selectedPoints;
    const width = p2.x - p1.x;
    const height = p3.y - p1.y;
    const centerX = p1.x + Math.round(width / 2);
    const centerY = p1.y + Math.round(height / 2);

    return `
Room Configuration:
{ x: ${p1.x}, y: ${p1.y}, width: ${width}, height: ${height}, label: { x: ${centerX}, y: ${centerY} } }`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Room Coordinate Mapper</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Upload Floor Plan Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => setImageUrl(e.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              className="border p-2 rounded"
            />
          </div>

          <div className="relative border rounded">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full cursor-crosshair"
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Clear Points
            </button>
            <span className="text-sm text-gray-500">
              {selectedPoints.length < 3 ? `Click to add ${getPointLabel(selectedPoints.length)}` : 'All points added'}
            </span>
          </div>

          <div className="mt-4">
            <h3 className="font-medium mb-2">Room Configuration:</h3>
            <pre className="bg-gray-50 p-4 rounded whitespace-pre-wrap font-mono text-sm">
              {getRoomConfigDisplay()}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoordinateMapper;