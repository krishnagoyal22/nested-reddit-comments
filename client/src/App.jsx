import { Routes, Route } from "react-router-dom"
import { Post } from "./components/Post"
import { PostList } from "./components/PostLists"
import { PostProvider } from "./contexts/PostContext"
import { UploadPage } from "./pages/UploadPage"

function App() {
  return (
    <div className="container">
      <Routes>
        <Route path="/" element={<PostList />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route
          path="/posts/:id"
        element={
            <PostProvider>
              <Post />
            </PostProvider>
          }
        />
      </Routes>
    </div>
  )
}

export default App
