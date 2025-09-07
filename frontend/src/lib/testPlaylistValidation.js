// Test playlist URL validation
import { extractPlaylistId, detectUrlType } from './youtubeUrlValidation.js';

// Test playlist URLs
const testPlaylistUrls = [
  "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb",
  "https://www.youtube.com/watch?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb&v=dQw4w9WgXcQ",
  "https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMHjMZOz59Oq8KC1KC",
  "https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID"
];

console.log("=== Testing Playlist URL Validation ===");

testPlaylistUrls.forEach((url, index) => {
  console.log(`\nTest ${index + 1}: ${url}`);
  
  const playlistId = extractPlaylistId(url);
  const urlType = detectUrlType(url);
  
  console.log(`Playlist ID: ${playlistId}`);
  console.log(`URL Type: ${JSON.stringify(urlType)}`);
  console.log(`Valid: ${urlType.type !== 'invalid'}`);
});

// Test the regex patterns directly
console.log("\n=== Testing Regex Patterns ===");

const patterns = [
  /(?:youtube\.com\/playlist\?list=|youtube\.com\/watch\?.*&list=)([^#&?]+)/,
  /list=([^#&?]+)/
];

const testUrl = "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb";

patterns.forEach((pattern, index) => {
  const match = testUrl.match(pattern);
  console.log(`Pattern ${index + 1}: ${pattern}`);
  console.log(`Match: ${match ? match[1] : 'No match'}`);
});

