/**
 * Vercel Serverless Function - CORS Proxy
 * פותר בעיות CORS על ידי העברת הבקשות דרך השרת שלנו
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Get target URL from query parameter
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  // Validate URL - only allow ibasketball.co.il
  try {
    const targetUrl = new URL(url);
    if (!targetUrl.hostname.endsWith('ibasketball.co.il')) {
      return res.status(403).json({ error: 'Only ibasketball.co.il URLs are allowed' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  try {
    console.log(`🔄 Proxying request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Basketball-Stats-Manager/1.0',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`❌ Upstream error: ${response.status}`);
      return res.status(response.status).json({ 
        error: `Upstream error: ${response.status}`,
        url: url
      });
    }
    
    const data = await response.json();
    
    console.log(`✅ Successfully proxied ${Array.isArray(data) ? data.length : 1} items`);
    
    // Cache for 1 minute
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    return res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}

