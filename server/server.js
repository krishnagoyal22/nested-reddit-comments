import fastify from "fastify"
import sensible from "@fastify/sensible"
import cors from "@fastify/cors"
import cookie from "@fastify/cookie"
import multipart from "@fastify/multipart"
import csrfProtection from "@fastify/csrf-protection"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"
import { uploadVideo, deleteVideo, validateVideo } from "./services/videoStorage.js"
import { sanitizeInput, validateInputLength } from "./services/inputValidation.js"
dotenv.config()

const app = fastify()
app.register(sensible)
app.register(cookie, { secret: process.env.COOKIE_SECRET })
app.register(cors, {
  origin: process.env.CLIENT_URL,
  credentials: true,
})
app.register(multipart, {
  limits: {
    fileSize: parseInt(process.env.MAX_VIDEO_SIZE) || 104857600, // 100MB default
  },
})
// Register CSRF protection for state-changing operations
app.register(csrfProtection, { cookieKey: 'csrfToken', fieldName: '_csrf' })
// ⚠️ AUTHENTICATION NOTE: This application uses a simplified authentication model for demo purposes.
// All users share a single hardcoded userId. For production use, implement proper authentication
// with JWT tokens, OAuth, or session-based authentication with secure user validation.
app.addHook("onRequest", (req, res, done) => {
  if (req.cookies.userId !== CURRENT_USER_ID) {
    req.cookies.userId = CURRENT_USER_ID
    res.clearCookie("userId")
    res.setCookie("userId", CURRENT_USER_ID)
  }
  done()
})
const prisma = new PrismaClient()
// const CURRENT_USER_ID = (
//   await prisma.user.findFirst({ where: { name: "Kyle" } })
// ).id
const CURRENT_USER_ID = "a8df7971-83bc-43a1-be72-fb58e0ff2568" 
const COMMENT_SELECT_FIELDS = {
  id: true,
  message: true,
  parentId: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
}

app.get("/posts", async (req, res) => {
  return await commitToDb(
    prisma.post.findMany({
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        duration: true,
        uploadedAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    })
  )
})

app.get("/posts/:id", async (req, res) => {
  return await commitToDb(
    prisma.post
      .findUnique({
        where: { id: req.params.id },
        select: {
          body: true,
          title: true,
          videoUrl: true,
          thumbnailUrl: true,
          duration: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          comments: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              ...COMMENT_SELECT_FIELDS,
              _count: { select: { likes: true } },
            },
          },
        },
      })
      .then(async post => {
        const likes = await prisma.like.findMany({
          where: {
            userId: req.cookies.userId,
            commentId: { in: post.comments.map(comment => comment.id) },
          },
        })

        return {
          ...post,
          comments: post.comments.map(comment => {
            const { _count, ...commentFields } = comment
            return {
              ...commentFields,
              likedByMe: likes.find(like => like.commentId === comment.id),
              likeCount: _count.likes,
            }
          }),
        }
      })
  )
})

app.post("/posts/:id/comments", async (req, res) => {
  if (req.body.message === "" || req.body.message == null) {
    return res.send(app.httpErrors.badRequest("Message is required"))
  }

  return await commitToDb(
    prisma.comment
      .create({
        data: {
          message: req.body.message,
          userId: req.cookies.userId,
          parentId: req.body.parentId,
          postId: req.params.id,
        },
        select: COMMENT_SELECT_FIELDS,
      })
      .then(comment => {
        return {
          ...comment,
          likeCount: 0,
          likedByMe: false,
        }
      })
  )
})

app.put("/posts/:postId/comments/:commentId", async (req, res) => {
  if (req.body.message === "" || req.body.message == null) {
    return res.send(app.httpErrors.badRequest("Message is required"))
  }

  const { userId } = await prisma.comment.findUnique({
    where: { id: req.params.commentId },
    select: { userId: true },
  })
  if (userId !== req.cookies.userId) {
    return res.send(
      app.httpErrors.unauthorized(
        "You do not have permission to edit this message"
      )
    )
  }

  return await commitToDb(
    prisma.comment.update({
      where: { id: req.params.commentId },
      data: { message: req.body.message },
      select: { message: true },
    })
  )
})

app.delete("/posts/:postId/comments/:commentId", async (req, res) => {
  const { userId } = await prisma.comment.findUnique({
    where: { id: req.params.commentId },
    select: { userId: true },
  })
  if (userId !== req.cookies.userId) {
    return res.send(
      app.httpErrors.unauthorized(
        "You do not have permission to delete this message"
      )
    )
  }

  return await commitToDb(
    prisma.comment.delete({
      where: { id: req.params.commentId },
      select: { id: true },
    })
  )
})

app.post("/posts/:postId/comments/:commentId/toggleLike", async (req, res) => {
  const data = {
    commentId: req.params.commentId,
    userId: req.cookies.userId,
  }

  const like = await prisma.like.findUnique({
    where: { userId_commentId: data },
  })

  if (like == null) {
    return await commitToDb(prisma.like.create({ data })).then(() => {
      return { addLike: true }
    })
  } else {
    return await commitToDb(
      prisma.like.delete({ where: { userId_commentId: data } })
    ).then(() => {
      return { addLike: false }
    })
  }
})

app.post("/posts", async (req, res) => {
  try {
    const data = await req.file()

    if (!data) {
      return res.send(app.httpErrors.badRequest("No file uploaded"))
    }

    // Get video file buffer
    const buffer = await data.toBuffer()

    // Validate video format, size, and signature
    const validation = validateVideo({ mimetype: data.mimetype, size: buffer.length, buffer })
    if (!validation.valid) {
      return res.send(app.httpErrors.badRequest(validation.error))
    }

    // Get and validate title from fields
    const fields = data.fields
    let title = fields?.title?.value || 'Untitled Video'
    let body = fields?.body?.value || null

    // Validate and sanitize input lengths
    const titleValidation = validateInputLength(title, 'title', 1, 200)
    if (!titleValidation.valid) {
      return res.send(app.httpErrors.badRequest(titleValidation.error))
    }

    const bodyValidation = validateInputLength(body, 'description', 0, 5000)
    if (!bodyValidation.valid) {
      return res.send(app.httpErrors.badRequest(bodyValidation.error))
    }

    // Sanitize user input to prevent XSS
    title = sanitizeInput(title)
    body = body ? sanitizeInput(body) : null

    // Upload to Cloudinary
    let uploadResult
    try {
      uploadResult = await uploadVideo(buffer, data.filename)
    } catch (uploadError) {
      console.error('Cloudinary upload failed:', uploadError)
      return res.send(app.httpErrors.internalServerError('Failed to upload video to storage'))
    }

    // Create post in database with transaction error handling
    let post
    try {
      post = await commitToDb(
        prisma.post.create({
          data: {
            title,
            body,
            videoUrl: uploadResult.videoUrl,
            thumbnailUrl: uploadResult.thumbnailUrl,
            duration: uploadResult.duration,
            fileSize: uploadResult.fileSize,
            mimeType: data.mimetype,
            userId: req.cookies.userId,
          },
          select: {
            id: true,
            title: true,
            videoUrl: true,
            thumbnailUrl: true,
            duration: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    } catch (dbError) {
      // Clean up Cloudinary upload if database operation fails
      console.error('Database error after upload, cleaning up:', dbError)
      try {
        await deleteVideo(uploadResult.publicId)
      } catch (cleanupError) {
        console.error('Failed to cleanup video:', cleanupError)
      }
      return res.send(app.httpErrors.internalServerError('Failed to save video metadata'))
    }

    return post
  } catch (error) {
    console.error('Unexpected error uploading video:', error)
    return res.send(app.httpErrors.internalServerError('Failed to upload video'))
  }
})

app.delete("/posts/:id", async (req, res) => {
  try {
    // Get post to check ownership and get video URL
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { userId: true, videoUrl: true },
    })

    if (!post) {
      return res.send(app.httpErrors.notFound("Post not found"))
    }

    if (post.userId !== req.cookies.userId) {
      return res.send(
        app.httpErrors.unauthorized("You do not have permission to delete this post")
      )
    }

    // Extract public ID from Cloudinary URL and delete video
    if (post.videoUrl) {
      const publicId = post.videoUrl.split('/').slice(-2).join('/').split('.')[0]
      await deleteVideo(publicId)
    }

    // Delete post from database (comments will be cascade deleted)
    return await commitToDb(
      prisma.post.delete({
        where: { id: req.params.id },
        select: { id: true },
      })
    )
  } catch (error) {
    console.error('Error deleting post:', error)
    return res.send(app.httpErrors.internalServerError('Failed to delete post'))
  }
})

async function commitToDb(promise) {
  const [error, data] = await app.to(promise)
  if (error) return app.httpErrors.internalServerError(error.message)
  return data
}

app.listen({ port: process.env.PORT, host: '0.0.0.0' })
