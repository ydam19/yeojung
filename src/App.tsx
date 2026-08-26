import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RegionSelectPage } from './pages/RegionSelectPage'
import { PlaceSelectPage } from './pages/PlaceSelectPage'
import { TripListPage } from './pages/TripListPage'
import { RoutePlanPage } from './pages/RoutePlanPage'

const router = createBrowserRouter([
  { path: '/', element: <RegionSelectPage /> },
  { path: '/region/:regionId', element: <PlaceSelectPage /> },
  { path: '/trips', element: <TripListPage /> },
  { path: '/trips/:tripId/result', element: <RoutePlanPage /> },
])

export default function App() {
  return <RouterProvider router={router} />
}
