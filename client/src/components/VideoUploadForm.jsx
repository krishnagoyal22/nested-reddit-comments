import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { uploadVideo } from "../services/videos"
import { useNavigate } from "react-router-dom"

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ACCEPTED_VIDEO_TYPES = {
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
}

export function VideoUploadForm() {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError("")

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.file.size > MAX_FILE_SIZE) {
        setError("File is too large. Maximum size is 100MB.")
      } else {
        setError("Invalid file type. Please upload a video file (MP4, WebM, MOV, AVI).")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_VIDEO_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!selectedFile) {
      setError("Please select a video file to upload.")
      return
    }

    if (!title.trim()) {
      setError("Please enter a title for your video.")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadVideo(
        selectedFile,
        title,
        body,
        (progress) => {
          setUploadProgress(progress)
        }
      )

      // Navigate to the new post
      navigate(`/posts/${result.id}`)
    } catch (err) {
      console.error("Upload error:", err)
      setError(
        err.response?.data?.message ||
          "Failed to upload video. Please try again."
      )
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="upload-form-container">
      <h2>Upload Video</h2>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            disabled={isUploading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="body">Description (optional)</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter video description"
            rows="4"
            disabled={isUploading}
          />
        </div>

        {!selectedFile ? (
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the video file here...</p>
            ) : (
              <div className="dropzone-content">
                <p>Drag and drop a video file here, or click to select</p>
                <p className="dropzone-hint">
                  Supported formats: MP4, WebM, MOV, AVI (Max 100MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="selected-file">
            <div className="file-info">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={removeFile}
                className="btn btn-danger btn-sm"
              >
                Remove
              </button>
            )}
          </div>
        )}

        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="progress-text">Uploading... {uploadProgress}%</p>
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? "Uploading..." : "Upload Video"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/")}
            disabled={isUploading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
