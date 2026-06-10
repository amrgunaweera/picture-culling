import { app, net } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Replace with your GA4 API Secret generated from the Google Analytics dashboard
const API_SECRET = 'r-5kicyKTxa6ivAiC4HvlQ';
const MEASUREMENT_ID = 'G-Q2LKL1ZSYK';

let clientId: string | null = null;

/**
 * Initializes and retrieves a unique client ID.
 * Persists across app restarts by storing it in the user's app data directory.
 */
function getClientId(): string {
  if (clientId) return clientId;

  const userDataPath = app.getPath('userData');
  const clientIdFilePath = path.join(userDataPath, 'client_id.txt');

  if (fs.existsSync(clientIdFilePath)) {
    clientId = fs.readFileSync(clientIdFilePath, 'utf8').trim();
  } else {
    // Generate a new UUID v4
    clientId = crypto.randomUUID();
    try {
      fs.writeFileSync(clientIdFilePath, clientId, 'utf8');
    } catch (error) {
      console.error('Failed to write client_id:', error);
    }
  }

  return clientId;
}

/**
 * Sends an event to Google Analytics via the Measurement Protocol (GA4).
 * @param eventName The name of the event (e.g., 'app_open', 'app_installed')
 * @param params Additional event parameters
 */
export async function trackEvent(eventName: string, params: Record<string, any> = {}) {
  if (API_SECRET === 'YOUR_API_SECRET_HERE') {
    console.warn(`[Analytics] API_SECRET is not set. Event '${eventName}' will not be sent to GA4.`);
    return;
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

  const payload = {
    client_id: getClientId(),
    events: [
      {
        name: eventName,
        params: {
          app_version: app.getVersion(),
          platform: process.platform,
          ...params
        }
      }
    ]
  };

  try {
    const request = net.request({
      method: 'POST',
      url: url,
    });

    request.setHeader('Content-Type', 'application/json');

    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        console.error(`[Analytics] Failed to send event. Status Code: ${response.statusCode}`);
      } else {
        console.log(`[Analytics] Successfully sent event '${eventName}'.`);
      }
    });

    request.on('error', (error) => {
      console.error(`[Analytics] Network request failed:`, error);
    });

    request.write(JSON.stringify(payload));
    request.end();
  } catch (error) {
    console.error(`[Analytics] Error tracking event '${eventName}':`, error);
  }
}
