import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const CoordinateMapper = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [coordinates, setCoordinates] = useState([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedPoints, setSelectedPoints] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size to match container while maintaining aspect ratio
        const containerWidth = canvas.parentElement.clientWidth;
        const scale = containerWidth / img.width;
        canvas.width = containerWidth;
        canvas.height = img.height * scale;

        // Store original image dimensions
        setImageSize({ width: img.width, height: img.height });

        // Draw image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImageUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to 840x600 coordinate system
    const svgX = Math.round((x / canvasRef.current.width) * 840);
    const svgY = Math.round((y / canvasRef.current.height) * 600);

    setSelectedPoints([...selectedPoints, { x: svgX, y: svgY }]);

    // Draw point on canvas
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  };

  const handleClear = () => {
    setSelectedPoints([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        };
        img.src = imageUrl;
      }
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Image to SVG Coordinate Mapper</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Upload Floor Plan Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
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
              Click on the image to mark points
            </span>
          </div>

          {selectedPoints.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Selected Points (840x600 coordinates):</h3>
              <div className="bg-gray-50 p-4 rounded">
                {selectedPoints.map((point, index) => (
                  <div key={index} className="text-sm font-mono">
                    Point {index + 1}: {`{ x: ${point.x}, y: ${point.y} }`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CoordinateMapper;