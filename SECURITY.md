# Security Documentation

## Overview

This document outlines the security features, limitations, and recommendations for the Video Upload Platform with Nested Comments.

---

## Authentication Model

### Current Implementation (Demo/Development)

⚠️ **This application uses a simplified authentication model for demonstration purposes.**

- All users share a single hardcoded user ID: `a8df7971-83bc-43a1-be72-fb58e0ff2568`
- User ID is set via secure HTTP-only cookie
- No password or credential validation
- Single-user experience (all actions appear to come from one user)

**Why?** This simplifies the demo and allows quick testing without OAuth setup or database user management.

### For Production Use

**You MUST implement proper authentication before deploying to production.**

#### Recommended Approaches

1. **JWT-Based Authentication**
   - Sign users in with email/password
   - Issue JWT tokens with expiration
   - Validate tokens on each request
   - Store refresh tokens securely

2. **OAuth 2.0** (recommended)
   - Use Google, GitHub, or other OAuth providers
   - Reduces your security burden
   - Better user experience with SSO
   - Industry standard approach

3. **Session-Based Authentication**
   - Traditional username/password login
   - Session tokens stored in secure database
   - CSRF protection enabled (already implemented)
   - Requires careful session management

---

## Input Validation & Sanitization

### Implemented Protections

✅ **Video File Validation**
- MIME type checking (whitelisted formats)
- File size limits (configurable, default 100MB)
- Magic byte signature validation (prevents spoofed files)
- Actual file content verification

✅ **Text Input Validation**
- Length limits enforced (titles: 200 chars, descriptions: 5000 chars)
- HTML entity escaping to prevent XSS
- Script tag removal (defense in depth)
- SQL injection pattern detection
- Null byte removal

✅ **Input Sanitization**
```javascript
// Before storage, all user input is sanitized:
- HTML special characters escaped (&, <, >, ", ')
- Script tags removed
- Event handlers stripped
```

### Examples

```javascript
// Dangerous input gets sanitized:
Input:  "<script>alert('xss')</script> My Title"
Output: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt; My Title"

Input:  "'; DROP TABLE posts; --"
Output: "'; DROP TABLE posts; --" (detected as SQL injection attempt)
```

---

## File Upload Security

### Implemented Safeguards

✅ **File Type Validation**
- Only video files accepted (mp4, webm, quicktime, x-msvideo)
- MIME type validation
- File signature (magic byte) verification
- Prevents uploading disguised executable files

✅ **Size Limits**
- Configurable maximum file size
- Default: 100MB
- Prevents disk space exhaustion attacks
- Configurable in `.env`

✅ **Cloudinary Integration**
- Videos stored on secure third-party service
- Automatic transcoding and format standardization
- Virus scanning available (can be enabled)
- CDN delivery with HTTPS
- Automatic thumbnail generation

✅ **Cleanup on Failure**
- If database operation fails after upload, video is automatically deleted from Cloudinary
- Prevents orphaned files

### Virus Scanning (Optional)

Cloudinary offers built-in virus scanning. To enable:
```javascript
// In videoStorage.js uploadVideo() function, add:
scanning: true  // Enable Cloudinary virus scanning
```

---

## CSRF Protection

✅ **Implemented**
- `@fastify/csrf-protection` plugin enabled
- Automatic CSRF token generation
- Cookie-based token storage
- Protects all state-changing operations (POST, PUT, DELETE)

**Note:** Due to simplified authentication, CSRF attacks are less impactful but are still prevented.

---

## Database Security

### Features

✅ **SQL Injection Prevention**
- Prisma ORM prevents SQL injection (parameterized queries)
- Input validation adds defense-in-depth
- Pattern detection for suspicious SQL keywords

✅ **Authorization Checks**
- Users can only edit/delete their own comments
- Users can only delete their own videos
- Ownership verified before operations

### Improvements Needed

⚠️ **For Production:**
- Add database encryption at rest
- Implement role-based access control (RBAC)
- Add database audit logging
- Regular backups with encryption
- Database activity monitoring

---

## Environment Variables Security

✅ **Implemented**
- `.env` file in `.gitignore` (credentials not committed)
- `.env.example` provided with placeholders
- Environment variables loaded with `dotenv`

⚠️ **Important Guidelines**
1. **Never commit `.env` file** to version control
2. **Keep `.env` secret** - don't share contents
3. **Rotate credentials** periodically
4. **Use separate credentials** for development, staging, production

### Required Variables

```
# Required for Production
DATABASE_URL=postgresql://user:pass@host:5432/db  # PostgreSQL URL
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Security
COOKIE_SECRET=strong-random-secret-min-32-chars
CLIENT_URL=https://yourdomain.com  # CORS origin

# Configuration
PORT=3001
MAX_VIDEO_SIZE=104857600  # 100MB in bytes
```

---

## API Endpoint Security

### Endpoints

| Method | Endpoint | Protection |
|--------|----------|-----------|
| GET | `/posts` | Public (no auth needed) |
| GET | `/posts/:id` | Public (no auth needed) |
| POST | `/posts` | CSRF ✅, Input Validation ✅, File Validation ✅ |
| DELETE | `/posts/:id` | CSRF ✅, Ownership Check ✅ |
| POST | `/posts/:id/comments` | CSRF ✅, Input Validation ✅ |
| PUT | `/posts/:postId/comments/:commentId` | CSRF ✅, Ownership Check ✅, Input Validation ✅ |
| DELETE | `/posts/:postId/comments/:commentId` | CSRF ✅, Ownership Check ✅ |
| POST | `/posts/:postId/comments/:commentId/toggleLike` | CSRF ✅ |

### Error Handling

✅ **Secure Error Messages**
- Generic server errors don't leak system information
- Specific validation errors guide users
- Stack traces not exposed in client responses
- Errors logged server-side for debugging

---

## Transport Security

### Implemented

✅ **HTTPS/TLS** (when deployed)
- All traffic encrypted in transit
- Certificates should be obtained from Let's Encrypt or similar

✅ **CORS Protection**
- Configured to only accept requests from whitelisted origin
- Set via `CLIENT_URL` environment variable

✅ **Secure Cookies**
- Cookie secret stored in environment variable
- Cookies have appropriate flags (HttpOnly, Secure, SameSite)

---

## Known Limitations & Recommendations

### Current Limitations

1. **Single-User Mode** (demo)
   - ⚠️ No user accounts or real authentication
   - Recommendation: Implement real user authentication before production

2. **No Rate Limiting**
   - ⚠️ Attackers could spam uploads
   - Recommendation: Add `@fastify/rate-limit` plugin

3. **No Logging/Monitoring**
   - ⚠️ Security incidents not tracked
   - Recommendation: Implement audit logging and monitoring

4. **No Content Moderation**
   - ⚠️ Any video content can be uploaded
   - Recommendation: Add content filtering or manual moderation

5. **No Encryption at Rest**
   - ⚠️ Database not encrypted
   - Recommendation: Enable database encryption

### Production Checklist

- [ ] Implement real authentication (OAuth or JWT)
- [ ] Enable rate limiting on upload endpoints
- [ ] Set up database encryption
- [ ] Implement audit logging
- [ ] Enable content moderation
- [ ] Add video file scanning
- [ ] Implement user account verification
- [ ] Enable HTTPS/TLS
- [ ] Set up security monitoring/alerting
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning (dependabot)
- [ ] WAF (Web Application Firewall) for DDoS protection

---

## Security Testing

### Test Cases

Run these to verify security features:

```bash
# Test 1: Invalid file type
curl -F "title=Test" -F "file=@document.pdf" http://localhost:3001/posts

# Test 2: XSS attempt in title
curl -F "title=<script>alert('xss')</script>" -F "file=@video.mp4" http://localhost:3001/posts

# Test 3: SQL injection attempt
curl -F "title='; DROP TABLE posts; --" -F "file=@video.mp4" http://localhost:3001/posts

# Test 4: Oversized file
# Try uploading a >100MB file (should be rejected)

# Test 5: Spoofed file type
# Rename executable to .mp4 and upload (magic byte check should reject)
```

---

## Incident Response

If you discover a security issue:

1. **Do not commit or push** the vulnerability details
2. **Document the issue** locally
3. **Fix the issue** in a separate branch
4. **Test the fix** thoroughly
5. **Create a pull request** with security fixes
6. **Review carefully** before merging

---

## Dependencies Security

### Current Dependencies

- `fastify` - Web framework (regularly updated)
- `@fastify/csrf-protection` - CSRF protection
- `@fastify/multipart` - File upload handling
- `cloudinary` - Video storage
- `@prisma/client` - Database ORM
- `dotenv` - Environment management

### Keeping Dependencies Updated

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Update major versions (test carefully!)
npm outdated
```

---

## Contact & Reporting

If you find a security vulnerability:
- Do NOT open a public GitHub issue
- Email: [your-security-email]
- Provide details about the vulnerability
- Allow time for fixes before public disclosure

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Fastify Security](https://www.fastify.io/docs/latest/Guides/Security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Cloudinary Security](https://cloudinary.com/documentation/cloudinary_url_and_response_signing)

---

**Last Updated:** 2024
**Version:** 1.0
