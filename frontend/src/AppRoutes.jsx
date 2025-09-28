import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import SidebarLayout from './layouts/SidebarLayout.jsx'
import Projects from './pages/Projects.jsx'
import Profile from './pages/Profile.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import { isAuthed } from './auth.js'

function RequireAuth({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    element: (
      <RequireAuth>
        <SidebarLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <></> },
      { path: '/projects', element: <Projects /> },
      { path: '/projects/:id', element: <ProjectDetail /> },
      { path: '/profile', element: <Profile /> },
    ]
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}



