import fetch from 'node-fetch';

export async function validateVideoUrl(url: string): Promise<{ valid: boolean; status?: number; message?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10 second timeout
    });

    if (response.status === 200) {
      return { valid: true, status: response.status };
    } else if (response.status === 404) {
      return { valid: false, status: response.status, message: 'Video not found (404)' };
    } else if (response.status === 403) {
      return { valid: false, status: response.status, message: 'Access forbidden - may require login' };
    } else {
      return { valid: false, status: response.status, message: `Server returned status ${response.status}` };
    }
  } catch (error) {
    console.error('URL validation failed:', error);
    return { valid: false, message: 'Connection failed - URL may be broken or site is down' };
  }
}

export function isAuthenticationRequired(url: string): boolean {
  const domain = new URL(url).hostname.replace('www.', '');
  return domain.includes('thisvid.com') || domain.includes('pornhub.com');
}