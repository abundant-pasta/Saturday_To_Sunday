# Environment Variables for Rewarded Ad Streak Freezes

## Required Variables

Add these to your `.env.local` file:

```bash
# Google Ads Configuration
# Replace with your actual Google Ad Manager Publisher ID
NEXT_PUBLIC_GOOGLE_AD_CLIENT=ca-pub-YOUR_PUBLISHER_ID_HERE

# Rewarded Ad Unit Path from Google Ad Manager
# Format: /network_code/ad_unit_name
NEXT_PUBLIC_REWARDED_AD_UNIT_PATH=/test/rewarded
```

## How to Get These Values

### Google Publisher ID
1. Go to [Google AdSense](https://www.google.com/adsense/)
2. Navigate to Account Settings
3. Find your Publisher ID (starts with `ca-pub-`)

### Rewarded Ad Unit Path
1. Go to [Google Ad Manager](https://admanager.google.com/)
2. Create a new Ad Unit with format "Rewarded"
3. Note the Ad Unit Path (usually `/[network-code]/[ad-unit-name]`)

## Testing Mode

For local development/testing without actual ads:
- Use the default values shown above
- GPT will load in test mode
- You can simulate events in the browser console:
  ```javascript
  // Simulate reward granted
  googletag.pubads().dispatchEvent(new Event('rewardedSlotGranted'))
  ```
