const API_URL = import.meta.env.VITE_API_URL;

export const fetchRooms = async () => {
  try {
    const response = await fetch(`${API_URL}/places/microsoft.graph.room`);
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return [];
  }
};

export const fetchRoomEvents = async (roomEmail) => {
  try {
    const response = await fetch(`${API_URL}/users/${roomEmail}/calendar/events`);
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching room events:', error);
    return [];
  }
};

export const createRoomBooking = async (roomEmail, booking) => {
  try {
    const response = await fetch(`${API_URL}/users/${roomEmail}/calendar/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });
    return await response.json();
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};