import { usePost } from "../contexts/PostContext"
import { useAsyncFn } from "../hooks/useAsync"
import { createComment } from "../services/comments"
import { CommentForm } from "./CommentForm"
import { CommentList } from "./CommentList"
import { VideoPlayer } from "./VideoPlayer"
import { formatTimeAgo, formatFileSize } from "../services/videos"
import "../styles.css"

export function Post() {
  const { post, rootComments, createLocalComment } = usePost()
  const { loading, error, execute: createCommentFn } = useAsyncFn(createComment)

  function onCommentCreate(message) {
    return createCommentFn({ postId: post.id, message }).then(
      createLocalComment
    )
  }

  return (
    <>
      <h1>{post.title}</h1>

      {post.videoUrl ? (
        <div className="video-container">
          <VideoPlayer
            videoUrl={post.videoUrl}
            thumbnailUrl={post.thumbnailUrl}
            title={post.title}
          />
          <div className="video-metadata">
            {post.user && <span className="video-author">By {post.user.name}</span>}
            {post.uploadedAt && (
              <span className="video-date">{formatTimeAgo(post.uploadedAt)}</span>
            )}
            {post.fileSize && (
              <span className="video-size">{formatFileSize(post.fileSize)}</span>
            )}
          </div>
        </div>
      ) : null}

      {post.body && <article>{post.body}</article>}

      <h3 className="comments-title">Comments</h3>
      <section>
        <CommentForm
          loading={loading}
          error={error}
          onSubmit={onCommentCreate}
        />
        {rootComments != null && rootComments.length > 0 && (
          <div className="mt-4">
            <CommentList comments={rootComments} />
          </div>
        )}
      </section>
    </>
  )
}
