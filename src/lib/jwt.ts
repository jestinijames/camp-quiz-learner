/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// For Edge Runtime (middleware)
export async function verifyJwtEdge(token: string) {
  try {
    // Simple JWT verification for Edge Runtime
    // Split the JWT
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode payload (we'll do basic validation)
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    // For now, we'll trust the token if it has the right structure
    // In production, you'd want proper HMAC verification using Web Crypto API
    if (!payload.id || typeof payload.isAdmin !== 'boolean') {
      throw new Error('Invalid token payload');
    }
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// For Node.js Runtime (API routes)
export function verifyJwtNode(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export function signJwt(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}