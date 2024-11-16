#ifndef BOARD_HAS_PSRAM
#error "Please enable PSRAM !!!"
#endif

#include <Arduino.h>
#include "epd_driver.h"
#include "firasans.h"
#include "Button2.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi Configuration - Replace with your details
const char* WIFI_SSID = "TP-Link_2014";
const char* WIFI_PASSWORD = "08493460";
const char* API_BASE_URL = "http://192.168.0.140:3001/v1.0";
const char* ROOM_ID = "0.05";

// Custom fonts and sizes
#define LARGE_FONT_SIZE 48
#define MEDIUM_FONT_SIZE 32
#define SMALL_FONT_SIZE 24
#define TINY_FONT_SIZE 18

// Layout constants
const int HEADER_HEIGHT = 80;
const int MAIN_CONTENT_Y = HEADER_HEIGHT + 20;
const int TIMELINE_Y = EPD_HEIGHT - 100;
const int PADDING = 20;

// Update interval (30 seconds)
const unsigned long UPDATE_INTERVAL = 30000;
unsigned long lastUpdate = 0;

// Button definition
Button2 btn1(BUTTON_1);

// Display buffer
uint8_t *framebuffer = nullptr;

struct Meeting {
    String name;
    String startTime;
    String endTime;
};

struct Room {
    String id;
    int capacity;
    bool occupied;
    Meeting currentMeeting;
    Meeting nextMeeting;
    String lastUpdated;
} currentRoom;

// Helper functions
String formatTime(String isoTime) {
    // Expected format: "2024-02-17T17:00:00Z"
    // Convert to: "05:00 PM"
    if (isoTime.length() < 16) return isoTime;
    
    int hour = isoTime.substring(11, 13).toInt();
    String minute = isoTime.substring(14, 16);
    bool pm = hour >= 12;
    if (hour > 12) hour -= 12;
    if (hour == 0) hour = 12;
    
    char buffer[20];
    snprintf(buffer, sizeof(buffer), "%02d:%s %s", 
             hour, minute.c_str(), pm ? "PM" : "AM");
    return String(buffer);
}

time_t getTimestamp(String isoTime) {
    struct tm tm = {0};
    char buf[25];
    isoTime.toCharArray(buf, sizeof(buf));
    strptime(buf, "%Y-%m-%dT%H:%M:%S", &tm);
    return mktime(&tm);
}



// Drawing helper functions
void drawFilledRect(int x, int y, int w, int h, uint8_t fill) {
    epd_fill_rect(x, y, w, h, fill, framebuffer);
    epd_draw_rect(x, y, w, h, 0, framebuffer);
}

void drawText(const char* text, int &x, int &y) {
    write_string((GFXfont *)&FiraSans, (char*)text, &x, &y, framebuffer);
}

void drawRoundedRect(int x, int y, int w, int h, int r, uint8_t color, uint8_t fill_color, uint8_t *buffer) {
    // Main rectangle
    epd_fill_rect(x, y, w, h, fill_color, buffer);
    
    // Outline
    epd_draw_rect(x, y, w, h, color, buffer);
    
    // Corners (approximated with small rectangles for now)
    epd_fill_rect(x, y, r, r, fill_color, buffer);
    epd_fill_rect(x + w - r, y, r, r, fill_color, buffer);
    epd_fill_rect(x, y + h - r, r, r, fill_color, buffer);
    epd_fill_rect(x + w - r, y + h - r, r, r, fill_color, buffer);
    
    // Draw corner outlines
    epd_draw_circle(x + r, y + r, r, color, buffer);
    epd_draw_circle(x + w - r, y + r, r, color, buffer);
    epd_draw_circle(x + r, y + h - r, r, color, buffer);
    epd_draw_circle(x + w - r, y + h - r, r, color, buffer);
}

void drawHeader(Room &room, uint8_t *framebuffer) {
    // Room number and capacity
    int x = PADDING;
    int y = PADDING + 40;
    
    // Draw room number in large font
    char roomText[32];
    snprintf(roomText, sizeof(roomText), "%s", room.id.c_str());
    write_string(&FiraSans, roomText, &x, &y, framebuffer);
    
    // Draw capacity icon and number
    x += 40;
    char capacityText[32];
    snprintf(capacityText, sizeof(capacityText), "👥 %d", room.capacity);
    write_string(&FiraSans, capacityText, &x, &y, framebuffer);
    
    // Draw status box
    int statusWidth = 200;
    int statusHeight = 50;
    int statusX = EPD_WIDTH - statusWidth - PADDING;
    int statusY = PADDING;
    
    drawRoundedRect(statusX, statusY, statusWidth, statusHeight, 10,
                   0, room.occupied ? 0x00 : 0xFF, framebuffer);
    
    // Status text
    const char* statusText = room.occupied ? "OCCUPIED" : "AVAILABLE";
    x = statusX + (statusWidth - strlen(statusText) * 14) / 2;
    y = statusY + 35;
    write_string(&FiraSans, (char*)statusText, &x, &y, 
                room.occupied ? NULL : framebuffer); // Inverse text when occupied
}

void drawMeetingBox(const char* title, Meeting &meeting, int x, int y, bool inverse, uint8_t *framebuffer) {
    int width = (EPD_WIDTH - 3 * PADDING) / 2;
    int height = 200;
    
    drawRoundedRect(x, y, width, height, 10, 0,
                   inverse ? 0x00 : 0xFF, framebuffer);
    
    // Title
    int textX = x + PADDING;
    int textY = y + 40;
    write_string(&FiraSans, (char*)title, &textX, &textY,
                inverse ? NULL : framebuffer);
    
    if (meeting.name.length() > 0) {
        // Meeting name
        textX = x + PADDING;
        textY += 50;
        char* meetingName = (char*)meeting.name.c_str();
        write_string(&FiraSans, meetingName, &textX, &textY,
                    inverse ? NULL : framebuffer);
        
        // Time
        textX = x + PADDING;
        textY += 40;
        char timeText[64];
        snprintf(timeText, sizeof(timeText), "⏰ %s - %s",
                meeting.startTime.c_str(), meeting.endTime.c_str());
        write_string(&FiraSans, timeText, &textX, &textY,
                    inverse ? NULL : framebuffer);
    } else {
        // No meeting message
        textX = x + PADDING;
        textY += 50;
        const char* noMeetingText = "No meetings scheduled";
        write_string(&FiraSans, (char*)noMeetingText, &textX, &textY,
                    inverse ? NULL : framebuffer);
    }
}

void drawTimeline(Room &room, uint8_t *framebuffer) {
    // Timeline base
    epd_draw_hline(PADDING, TIMELINE_Y, EPD_WIDTH - 2 * PADDING, 0, framebuffer);
    
    // Hour markers
    const char* times[] = {"12 AM", "6 AM", "12 PM", "6 PM", "12 AM"};
    int markerCount = 5;
    int markerSpacing = (EPD_WIDTH - 2 * PADDING) / (markerCount - 1);
    
    for (int i = 0; i < markerCount; i++) {
        int x = PADDING + (i * markerSpacing);
        
        // Draw marker line
        epd_draw_vline(x, TIMELINE_Y - 5, 10, 0, framebuffer);
        
        // Draw time label
        int textX = x - 20;
        int textY = TIMELINE_Y + 25;
        write_string(&FiraSans, (char*)times[i], &textX, &textY, framebuffer);
    }
    
    // Current time indicator (black vertical line)
    time_t now = time(nullptr);
    struct tm *timeinfo = localtime(&now);
    float dayProgress = (timeinfo->tm_hour * 60 + timeinfo->tm_min) / (24.0f * 60);
    int currentX = PADDING + (EPD_WIDTH - 2 * PADDING) * dayProgress;
    epd_draw_vline(currentX, TIMELINE_Y - 15, 30, 0, framebuffer);
}

void drawLastUpdated(const char* timestamp, uint8_t *framebuffer) {
    int x = PADDING;
    int y = EPD_HEIGHT - PADDING;
    char updateText[64];
    snprintf(updateText, sizeof(updateText), "Last updated: %s", timestamp);
    write_string(&FiraSans, updateText, &x, &y, framebuffer);
}

void drawRoomDisplay(Room &currentRoom, uint8_t *framebuffer) {
    if (!framebuffer) return;
    
    // Clear display
    memset(framebuffer, 0xFF, EPD_WIDTH * EPD_HEIGHT / 2);
    
    // Draw components
    drawHeader(currentRoom, framebuffer);
    
    // Draw meeting boxes
    int meetingBoxY = MAIN_CONTENT_Y;
    drawMeetingBox("CURRENT MEETING", currentRoom.currentMeeting,
                  PADDING, meetingBoxY, true, framebuffer);
    drawMeetingBox("NEXT MEETING", currentRoom.nextMeeting,
                  EPD_WIDTH/2 + PADDING/2, meetingBoxY, false, framebuffer);
    
    // Draw timeline
    drawTimeline(currentRoom, framebuffer);
    
    // Draw last updated
    drawLastUpdated(currentRoom.lastUpdated.c_str(), framebuffer);
    
    // Update display
    epd_draw_grayscale_image(epd_full_screen(), framebuffer);
}

void clearArea(int x, int y, int w, int h) {
    // Helper function to properly clear an area before drawing
    epd_fill_rect(x, y, w, h, 0xFF, framebuffer);  // Fill with white
}

bool fetchRoomData() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected!");
        return false;
    }

    HTTPClient http;
    
    // Use the correct display endpoint
    String url = String(API_BASE_URL) + "/displays/" + ROOM_ID;
    Serial.println("Fetching room data from: " + url);
    
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode != HTTP_CODE_OK) {
        Serial.println("Data fetch failed with code: " + String(httpCode));
        http.end();
        return false;
    }

    String payload = http.getString();
    Serial.println("Response: " + payload);
    http.end();

    // Parse JSON response
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, payload);
    if (error) {
        Serial.println("JSON parsing failed!");
        return false;
    }

    // Clear current room data
    currentRoom.id = doc["room"]["id"].as<String>();
    currentRoom.capacity = doc["room"]["capacity"] | 4;  // Default to 4 if not found
    currentRoom.occupied = doc["status"]["current"] == "occupied";
    
    // Parse last updated time
    String lastUpdatedISO = doc["status"]["lastUpdated"];
    time_t lastUpdated = getTimestamp(lastUpdatedISO);
    char buffer[30];
    strftime(buffer, sizeof(buffer), "%I:%M %p", localtime(&lastUpdated));
    currentRoom.lastUpdated = String("Last updated: ") + buffer;
    
    Serial.println("Room ID: " + currentRoom.id);
    Serial.println("Capacity: " + String(currentRoom.capacity));
    Serial.println("Occupied: " + String(currentRoom.occupied));
    Serial.println(currentRoom.lastUpdated);

    // Clear meeting data
    currentRoom.currentMeeting = {"", "", ""};
    currentRoom.nextMeeting = {"", "", ""};

    // Get current time to determine current/next meetings
    time_t now = time(nullptr);
    
    // Process all events
    JsonArray events = doc["schedule"]["events"];
    Serial.println("Number of events: " + String(events.size()));
    
    for (JsonObject event : events) {
        String startTime = event["start"];
        String endTime = event["end"];
        String subject = event["subject"].as<String>();
        
        Serial.println("Processing event: " + subject);
        Serial.println("Start: " + startTime + ", End: " + endTime);
        
        time_t start = getTimestamp(startTime);
        time_t end = getTimestamp(endTime);
        
        // Check if this is current meeting
        if (now >= start && now <= end) {
            Serial.println("Found current meeting!");
            currentRoom.currentMeeting.name = subject;
            currentRoom.currentMeeting.startTime = formatTime(startTime);
            currentRoom.currentMeeting.endTime = formatTime(endTime);
        }
        // Check if this is next meeting
        else if (now < start && currentRoom.nextMeeting.name.isEmpty()) {
            Serial.println("Found next meeting!");
            currentRoom.nextMeeting.name = subject;
            currentRoom.nextMeeting.startTime = formatTime(startTime);
            currentRoom.nextMeeting.endTime = formatTime(endTime);
        }
    }

    // We don't need to check nextMeeting from the response since we determine it
    // by checking future events in the events array

    return true;
}

void handleButton(Button2& btn) {
    // Manual refresh on button press
    if (fetchRoomData()) {
        epd_poweron();
        drawRoomDisplay(currentRoom, framebuffer);
        epd_poweroff();
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\nStarting Room Display...");

    // Initialize WiFi
    Serial.println("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("\nWiFi connection failed!");
    } else {
        Serial.println("\nWiFi connected!");
        Serial.println("IP address: " + WiFi.localIP().toString());
    }

    // Set timezone for time conversions
    Serial.println("Configuring time...");
    configTime(0, 0, "pool.ntp.org");

    // Initialize display
    Serial.println("Initializing display...");
    epd_init();

    // Allocate framebuffer in PSRAM
    framebuffer = (uint8_t *)ps_calloc(sizeof(uint8_t), EPD_WIDTH * EPD_HEIGHT / 2);
    if (!framebuffer) {
        Serial.println("Failed to allocate framebuffer!");
        while (1);
    }
    Serial.println("Framebuffer allocated successfully");
    
    // Initial data fetch and display
    Serial.println("Fetching initial room data...");
    if (fetchRoomData()) {
        Serial.println("Room data fetched successfully");
        epd_poweron();
        epd_clear();
        drawRoomDisplay(currentRoom, framebuffer);
        epd_poweroff();
    } else {
        Serial.println("Failed to fetch room data!");
    }

    // Setup button handler
    btn1.setPressedHandler(handleButton);
    Serial.println("Setup complete!");
}

void loop() {
    btn1.loop();

    // Check if it's time to update
    if (millis() - lastUpdate >= UPDATE_INTERVAL) {
        if (fetchRoomData()) {
            epd_poweron();
            //epd_clear();
            drawRoomDisplay(currentRoom, framebuffer);
            epd_poweroff();
        }
        lastUpdate = millis();
    }

    delay(2);
}