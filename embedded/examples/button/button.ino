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

void drawMeetingBox(const char* title, const char* meetingName, const char* timeRange, int x, int y, bool filled) {
    uint8_t fillColor = filled ? 0x00 : 0xFF;
    drawFilledRect(x, y, 380, 160, fillColor);

    if (!filled) {
        int text_x = x + 20;
        int text_y = y + 40;
        drawText(title, text_x, text_y);
        
        text_x = x + 20;
        text_y += 50;
        drawText(meetingName, text_x, text_y);
        
        text_x = x + 20;
        text_y += 40;
        drawText(timeRange, text_x, text_y);
    } else {
        uint8_t *tempBuffer = (uint8_t *)ps_calloc(sizeof(uint8_t), 380 * 160 / 2);
        if (!tempBuffer) return;
        
        memset(tempBuffer, 0xFF, 380 * 160 / 2);
        
        int text_x = 20;
        int text_y = 40;
        write_string((GFXfont *)&FiraSans, (char*)title, &text_x, &text_y, tempBuffer);
        
        text_x = 20;
        text_y += 50;
        write_string((GFXfont *)&FiraSans, (char*)meetingName, &text_x, &text_y, tempBuffer);
        
        text_x = 20;
        text_y += 40;
        write_string((GFXfont *)&FiraSans, (char*)timeRange, &text_x, &text_y, tempBuffer);
        
        for (int i = 0; i < 380 * 160 / 2; i++) {
            uint8_t value = ~tempBuffer[i];
            framebuffer[(y * EPD_WIDTH + x) / 2 + i] = value;
        }
        
        free(tempBuffer);
    }
}

void drawTimeline() {
    int baseY = EPD_HEIGHT - 100;
    
    // Draw timeline line
    epd_draw_hline(50, baseY, EPD_WIDTH - 100, 0, framebuffer);
    
    // Draw time markers
    const char* times[] = {"12 AM", "6 AM", "12 PM", "6 PM", "12 AM"};
    int spacing = (EPD_WIDTH - 100) / 4;
    
    for (int i = 0; i < 5; i++) {
        int x = 50 + (i * spacing);
        int textX = x - 20;
        int textY = baseY + 30;
        drawText(times[i], textX, textY);
        epd_draw_vline(x, baseY - 5, 10, 0, framebuffer);
    }
    
    // Draw current meeting indicator
    if (currentRoom.occupied) {
        drawFilledRect(400, baseY - 15, 100, 30, 0x00);
    }
}

void drawRoomDisplay() {
    if (!framebuffer) return;

    // Clear the entire display first
    memset(framebuffer, 0xFF, EPD_WIDTH * EPD_HEIGHT / 2);
    
    // Draw room number (large, top-left)
    int cursor_x = 50;
    int cursor_y = 80;
    clearArea(40, cursor_y - 60, 200, 80);  // Clear area before drawing
    drawText(currentRoom.id.c_str(), cursor_x, cursor_y);
    
    // Draw capacity number (top-right)
    char capacityText[10];
    snprintf(capacityText, sizeof(capacityText), "%d", currentRoom.capacity);
    cursor_x = cursor_x + 100;
    cursor_y = 80;
    clearArea(cursor_x - 10, cursor_y - 60, 100, 80);  // Clear area before drawing
    drawText(capacityText, cursor_x, cursor_y);
    
    // Draw status box (top-right)
    const char* statusText = currentRoom.occupied ? "OCCUPIED" : "AVAILABLE";
    int status_x = EPD_WIDTH - 200;
    clearArea(status_x - 10, 10, 200, 70);  // Clear area before drawing
    drawFilledRect(status_x, 20, 180, 50, currentRoom.occupied ? 0x00 : 0x0F);
    
    // Draw status text
    cursor_x = status_x + 20;
    cursor_y = 55;
    
    if (currentRoom.occupied) {
        uint8_t *tempBuffer = (uint8_t *)ps_calloc(sizeof(uint8_t), 180 * 50 / 2);
        if (tempBuffer) {
            memset(tempBuffer, 0xFF, 180 * 50 / 2);
            int temp_x = 20, temp_y = 35;
            write_string((GFXfont *)&FiraSans, (char*)statusText, &temp_x, &temp_y, tempBuffer);
            
            for (int i = 0; i < 180 * 50 / 2; i++) {
                uint8_t value = ~tempBuffer[i];
                framebuffer[(20 * EPD_WIDTH + status_x) / 2 + i] = value;
            }
            free(tempBuffer);
        }
    } else {
        drawText(statusText, cursor_x, cursor_y);
    }

    // Clear meeting areas
    clearArea(40, 110, EPD_WIDTH - 80, 300);
    
    // Draw current meeting box
    if (currentRoom.occupied && currentRoom.currentMeeting.name.length() > 0) {
        char timeRange[50];
        snprintf(timeRange, sizeof(timeRange), "%s -%s", 
                currentRoom.currentMeeting.startTime.c_str(),
                currentRoom.currentMeeting.endTime.c_str());
        drawMeetingBox("CURRENT MEETING", 
                      currentRoom.currentMeeting.name.c_str(),
                      timeRange,
                      50, 120, true);
    }
    
    // Draw next meeting box
    if (currentRoom.nextMeeting.name.length() > 0) {
        char nextTimeRange[50];
        snprintf(nextTimeRange, sizeof(nextTimeRange), "%s -%s", 
                currentRoom.nextMeeting.startTime.c_str(),
                currentRoom.nextMeeting.endTime.c_str());
        drawMeetingBox("NEXT MEETING",
                      currentRoom.nextMeeting.name.c_str(),
                      nextTimeRange,
                      450, 120, false);
    }
    
    // Clear timeline area
    clearArea(40, EPD_HEIGHT - 120, EPD_WIDTH - 80, 100);
    
    // Draw timeline
    drawTimeline();
    
    // Clear and draw last updated text
    clearArea(40, EPD_HEIGHT - 40, 300, 30);
    cursor_x = 50;
    cursor_y = EPD_HEIGHT - 20;
    drawText(currentRoom.lastUpdated.c_str(), cursor_x, cursor_y);
    
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
        drawRoomDisplay();
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
        drawRoomDisplay();
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
            drawRoomDisplay();
            epd_poweroff();
        }
        lastUpdate = millis();
    }

    delay(2);
}