import { Link } from "react-router-dom"
import { useAsync } from "../hooks/useAsync"
import { getPosts } from "../services/posts"
import { formatDuration, formatTimeAgo } from "../services/videos"
import "../styles.css"

export function PostList() {
  const { loading, error, value: posts } = useAsync(getPosts)

  if (loading) return <h1>Loading</h1>
  if (error) return <h1 className="error-msg">{error}</h1>

  return (
    <div className="posts-grid">
      <div className="upload-header">
        <h1>Videos</h1>
        <Link to="/upload" className="btn btn-primary">
          Upload Video
        </Link>
      </div>

      <div className="video-cards">
        {posts.map(post => (
          <Link to={`/posts/${post.id}`} key={post.id} className="video-card">
            {post.thumbnailUrl ? (
              <div className="video-thumbnail-container">
                <img
                  src={post.thumbnailUrl}
                  alt={post.title}
                  className="video-thumbnail"
                />
                {post.duration && (
                  <span className="video-duration">
                    {formatDuration(post.duration)}
                  </span>
                )}
              </div>
            ) : (
              <div className="video-thumbnail-placeholder">
                <span>No Thumbnail</span>
              </div>
            )}

            <div className="video-card-content">
              <h3 className="video-card-title">{post.title}</h3>
              <div className="video-card-meta">
                {post.user && <span className="video-card-author">{post.user.name}</span>}
                {post.uploadedAt && (
                  <span className="video-card-date">
                    {formatTimeAgo(post.uploadedAt)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="no-videos">
          <p>No videos uploaded yet.</p>
          <Link to="/upload" className="btn btn-primary">
            Upload the first video
          </Link>
        </div>
      )}
    </div>
  )
}
