// Browser-compatible test for YouTube URL validation
// This can be imported and used in the browser

export function testPlaylistValidation() {
  console.log("=== Testing Playlist Validation in Browser ===");
  
  const testUrls = [
    "https://www.youtube.com/playlist?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb",
    "https://www.youtube.com/watch?list=PLbpi6ZahtOH6Blw3RGYpWkSByi_T7Rygb&v=dQw4w9WgXcQ"
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`\nTest ${index + 1}: ${url}`);
    
    // Test the regex patterns directly
    const playlistPattern1 = /(?:youtube\.com\/playlist\?list=|youtube\.com\/watch\?.*&list=)([^#&?]+)/;
    const playlistPattern2 = /list=([^#&?]+)/;
    
    const match1 = url.match(playlistPattern1);
    const match2 = url.match(playlistPattern2);
    
    console.log(`Pattern 1 match: ${match1 ? match1[1] : 'No match'}`);
    console.log(`Pattern 2 match: ${match2 ? match2[1] : 'No match'}`);
    
    // Test if it's a playlist URL
    const isPlaylist = url.includes('list=');
    console.log(`Contains 'list=': ${isPlaylist}`);
    
    // Test if it's a video URL
    const isVideo = url.includes('v=') || url.includes('youtu.be/');
    console.log(`Contains video ID: ${isVideo}`);
  });
  
  console.log("\n=== Validation Test Complete ===");
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testPlaylistValidation = testPlaylistValidation;
}



























