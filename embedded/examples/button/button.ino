#ifndef BOARD_HAS_PSRAM
#error "Please enable PSRAM !!!"
#endif

#include <Arduino.h>
#include "epd_driver.h"
#include "firasans.h"
#include "Button2.h"

// Button definition
Button2 btn1(BUTTON_1);

// Display buffer
uint8_t *framebuffer = nullptr;

// Mock room data
struct Meeting {
    const char* name;
    const char* startTime;
    const char* endTime;
};

struct Room {
    const char* id;
    int capacity;
    bool occupied;
    Meeting currentMeeting;
    Meeting nextMeeting;
    const char* lastUpdated;
} currentRoom = {
    "0.01",
    4,
    true,
    {"Meeting 0-1", "05:00 PM", "06:00 PM"},
    {"Meeting 0-2", "07:00 PM", "09:00 PM"},
    "Last updated: 05:07 PM"
};

// Helper drawing functions
void drawFilledRect(int x, int y, int w, int h, uint8_t fill) {
    epd_fill_rect(x, y, w, h, fill, framebuffer);
    epd_draw_rect(x, y, w, h, 0, framebuffer);
}

void drawText(const char* text, int &x, int &y) {
    write_string((GFXfont *)&FiraSans, (char*)text, &x, &y, framebuffer);
}

void drawMeetingBox(const char* title, const char* meetingName, const char* timeRange, int x, int y, bool filled) {
    // Draw container
    uint8_t fillColor = filled ? 0x00 : 0xFF;  // 0x00 for black, 0xFF for white
    drawFilledRect(x, y, 380, 160, fillColor);
    
    if (!filled) {
        // Regular black text on white background
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
        // For white text on black background, we'll draw the text first then invert the area
        // Create a temporary buffer for this region
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
        
        // Copy inverted to main framebuffer
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

    // Clear the display
    memset(framebuffer, 0xFF, EPD_WIDTH * EPD_HEIGHT / 2);
    
    // Draw room number (large, top-left)
    int cursor_x = 50;
    int cursor_y = 80;
    drawText(currentRoom.id, cursor_x, cursor_y);
    
    // Draw capacity icon and number (top-right)
    char capacityText[10];
    snprintf(capacityText, sizeof(capacityText), "%d", currentRoom.capacity);
    cursor_x = cursor_x + 100;
    cursor_y = 80;
    drawText(capacityText, cursor_x, cursor_y);
    
    // Draw status box (top-right)
    const char* statusText = currentRoom.occupied ? "OCCUPIED" : "AVAILABLE";
    int status_x = EPD_WIDTH - 200;
    drawFilledRect(status_x, 20, 180, 50, currentRoom.occupied ? 0x00 : 0x0F);
    
    // Draw status text
    cursor_x = status_x + 20;
    cursor_y = 55;
    
    if (currentRoom.occupied) {
        // For white text on black, draw using inversion
        uint8_t *tempBuffer = (uint8_t *)ps_calloc(sizeof(uint8_t), 180 * 50 / 2);
        if (tempBuffer) {
            memset(tempBuffer, 0xFF, 180 * 50 / 2);
            int temp_x = 20, temp_y = 35;
            write_string((GFXfont *)&FiraSans, (char*)statusText, &temp_x, &temp_y, tempBuffer);
            
            // Copy inverted to main framebuffer
            for (int i = 0; i < 180 * 50 / 2; i++) {
                uint8_t value = ~tempBuffer[i];
                framebuffer[(20 * EPD_WIDTH + status_x) / 2 + i] = value;
            }
            free(tempBuffer);
        }
    } else {
        drawText(statusText, cursor_x, cursor_y);
    }
    
    // Draw current meeting box
    if (currentRoom.occupied) {
        char timeRange[50];
        snprintf(timeRange, sizeof(timeRange), "%s -%s", 
                currentRoom.currentMeeting.startTime,
                currentRoom.currentMeeting.endTime);
        drawMeetingBox("CURRENT MEETING", 
                      currentRoom.currentMeeting.name,
                      timeRange,
                      50, 120, true);
    }
    
    // Draw next meeting box
    char nextTimeRange[50];
    snprintf(nextTimeRange, sizeof(nextTimeRange), "%s -%s", 
            currentRoom.nextMeeting.startTime,
            currentRoom.nextMeeting.endTime);
    drawMeetingBox("NEXT MEETING",
                  currentRoom.nextMeeting.name,
                  nextTimeRange,
                  450, 120, false);
    
    // Draw timeline
    drawTimeline();
    
    // Draw last updated text
    cursor_x = 50;
    cursor_y = EPD_HEIGHT - 20;
    drawText(currentRoom.lastUpdated, cursor_x, cursor_y);
    
    // Update display
    epd_draw_grayscale_image(epd_full_screen(), framebuffer);
}

void setup() {
    Serial.begin(115200);

    // Initialize display
    epd_init();

    // Allocate framebuffer in PSRAM
    framebuffer = (uint8_t *)ps_calloc(sizeof(uint8_t), EPD_WIDTH * EPD_HEIGHT / 2);
    if (!framebuffer) {
        Serial.println("Failed to allocate framebuffer!");
        while (1);
    }
    
    // Initial display update
    epd_poweron();
    epd_clear();
    drawRoomDisplay();
    epd_poweroff();

    // Setup button handler
    btn1.setPressedHandler(handleButton);
}

void handleButton(Button2& btn) {
    // Toggle room status for demo purposes
    currentRoom.occupied = !currentRoom.occupied;
    
    epd_poweron();
    drawRoomDisplay();
    epd_poweroff();
}

void loop() {
    btn1.loop();
    delay(2);
}