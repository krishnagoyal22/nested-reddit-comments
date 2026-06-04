# Video Upload Platform with Nested Comments

A fully functional video uploading website with nested comment system, built with React, Fastify, Prisma, and Cloudinary.

## Features

✨ **Core Features**
- 📹 Video upload with drag-and-drop support
- 🎬 Custom HTML5 video player with controls
- 💬 Nested comment system (Reddit-style)
- 👍 Like/unlike functionality
- ✏️ Edit and delete comments
- 📱 Responsive design

🔒 **Security Features**
- File signature validation (magic byte checking)
- XSS prevention with input sanitization
- SQL injection detection
- CSRF protection
- Secure video storage on Cloudinary
- Input length validation
- Automatic cleanup on upload failures

## Tech Stack

**Frontend:**
- React 19.1.0
- Vite 7.0.4
- React Router DOM 7.7.1
- Axios for API calls
- React Dropzone for file uploads

**Backend:**
- Fastify 4.2.1 (web framework)
- Prisma ORM with PostgreSQL
- Cloudinary for video storage
- FastifyCSRF for security

**Database:**
- PostgreSQL (production)
- SQLite (development)

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL database (or SQLite for development)
- Cloudinary account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/krishnagoyal22/nested-reddit-comments.git
   cd nested-reddit-comments
   ```

2. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

3. **Set up environment variables**

   Server (`server/.env`):
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/video_platform"

   # Server
   PORT=3001
   CLIENT_URL=http://localhost:5173
   COOKIE_SECRET=your-secret-key-min-32-chars

   # Cloudinary (get free account at cloudinary.com)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # Video upload limits
   MAX_VIDEO_SIZE=104857600  # 100MB
   ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime,video/x-msvideo
   ```

   Client (`client/.env.local`):
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Set up database**
   ```bash
   cd server
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

5. **Start the servers**

   Terminal 1 (Backend):
   ```bash
   cd server
   npm run devStart
   ```

   Terminal 2 (Frontend):
   ```bash
   cd client
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

## API Documentation

### Endpoints

#### Get All Videos
```
GET /posts
Response: { id, title, thumbnailUrl, duration, uploadedAt, user }[]
```

#### Get Single Video with Comments
```
GET /posts/:id
Response: { title, videoUrl, thumbnailUrl, duration, fileSize, mimeType, uploadedAt, user, comments[] }
```

#### Upload Video
```
POST /posts
Content-Type: multipart/form-data
Body: { file, title, body }
Response: { id, title, videoUrl, thumbnailUrl, duration, uploadedAt }
```

#### Delete Video
```
DELETE /posts/:id
Response: { id }
```

#### Create Comment
```
POST /posts/:id/comments
Body: { message, parentId? }
Response: { id, message, user, createdAt, likeCount, likedByMe }
```

#### Edit Comment
```
PUT /posts/:postId/comments/:commentId
Body: { message }
Response: { message }
```

#### Delete Comment
```
DELETE /posts/:postId/comments/:commentId
Response: { id }
```

#### Toggle Like on Comment
```
POST /posts/:postId/comments/:commentId/toggleLike
Response: { addLike: boolean }
```

## Security

⚠️ **Important:** This application uses simplified authentication for demo purposes. See [SECURITY.md](SECURITY.md) for:
- Current security features
- Known limitations
- Production deployment recommendations
- Security best practices

### Key Security Features
- ✅ File signature validation
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ Input validation and sanitization
- ✅ SQL injection detection
- ✅ Rate limiting ready
- ✅ Secure file storage

**For Production:**
- Implement proper user authentication (JWT/OAuth)
- Use HTTPS/TLS
- Enable database encryption
- Add rate limiting
- Enable content moderation
- Set up security monitoring

## Project Structure

```
nested-reddit-comments/
├── server/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Database migrations
│   ├── services/
│   │   ├── videoStorage.js      # Cloudinary integration
│   │   └── inputValidation.js   # Input validation & sanitization
│   ├── server.js                # Main server file
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoPlayer.jsx      # Video player component
│   │   │   ├── VideoUploadForm.jsx  # Upload form
│   │   │   ├── Post.jsx             # Post display
│   │   │   ├── PostLists.jsx        # Video grid
│   │   │   └── ...
│   │   ├── pages/
│   │   │   └── UploadPage.jsx       # Upload page
│   │   ├── services/
│   │   │   ├── videos.js
│   │   │   ├── posts.js
│   │   │   └── comments.js
│   │   └── App.jsx
│   └── package.json
├── SECURITY.md                  # Security documentation
├── SETUP_INSTRUCTIONS.md        # Setup guide
└── README.md                    # This file
```

## Development

### Running Tests

```bash
# Frontend
cd client
npm run test

# Backend
cd server
npm run test
```

### Code Quality

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## Database Schema

### Models

**Post**
- `id` (UUID, primary)
- `title` (String)
- `body` (String, optional)
- `videoUrl` (String) - Cloudinary URL
- `thumbnailUrl` (String) - Video thumbnail
- `duration` (Int) - Video duration in seconds
- `fileSize` (Int) - File size in bytes
- `mimeType` (String) - Video MIME type
- `uploadedAt` (DateTime)
- `userId` (String, foreign key)
- `comments` (Comment[])

**Comment**
- `id` (UUID, primary)
- `message` (String)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `userId` (String, foreign key)
- `postId` (String, foreign key)
- `parentId` (String, optional, self-reference for nesting)
- `children` (Comment[])
- `likes` (Like[])

**User**
- `id` (UUID, primary)
- `name` (String)
- `comments` (Comment[])
- `likes` (Like[])
- `posts` (Post[])

**Like**
- `userId` (String, foreign key)
- `commentId` (String, foreign key)

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Run `npx prisma migrate dev`

### Cloudinary Upload Fails
- Verify Cloudinary credentials in `.env`
- Check file format is supported
- Ensure file size is under 100MB

### CORS Errors
- Make sure CLIENT_URL in `.env` matches frontend URL
- Check browser console for detailed error

### Video Won't Play
- Verify videoUrl in database
- Check Cloudinary dashboard
- Try different browser

## Performance Tips

- Use HTTPS in production
- Enable CDN caching for video thumbnails
- Consider video transcoding options in Cloudinary
- Implement pagination for post lists
- Add database indexing for frequently queried fields

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see LICENSE file for details.

## Acknowledgments

- Built with [Fastify](https://www.fastify.io/)
- Uses [Prisma](https://www.prisma.io/) as ORM
- Video storage by [Cloudinary](https://cloudinary.com/)
- Frontend with [React](https://react.dev/)

## Support

For issues and questions:
1. Check [SECURITY.md](SECURITY.md) for security-related topics
2. Read [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md) for setup help
3. Check existing GitHub issues
4. Create a new GitHub issue with details

---

**Happy coding! 🚀**
