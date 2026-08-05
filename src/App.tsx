import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { SplashScreen } from './components/SplashScreen'
import { HomePage } from './pages/HomePage'
import { TripCreatePage } from './pages/TripCreatePage'
import { TripDetailPage } from './pages/TripDetailPage'
import { TripEditPage } from './pages/TripEditPage'
import { SchedulePage } from './pages/SchedulePage'
import { MapPage } from './pages/MapPage'
import { DiaryListPage } from './pages/DiaryListPage'
import { DiaryEntryPage } from './pages/DiaryEntryPage'
import { DiaryEditPage } from './pages/DiaryEditPage'
import { SharePage } from './pages/SharePage'
import { RegionSelectPage } from './pages/RegionSelectPage'
import { AttractionSelectPage } from './pages/AttractionSelectPage'
import { PlaceReviewPage } from './pages/PlaceReviewPage'

const router = createBrowserRouter([
  {
    element: <AppShell showBottomNav={false} />,
    children: [
      { path: '/discover', element: <RegionSelectPage /> },
      { path: '/discover/review', element: <PlaceReviewPage /> },
      { path: '/discover/:regionId', element: <AttractionSelectPage /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/trips/new', element: <TripCreatePage /> },
      { path: '/trips/:tripId', element: <TripDetailPage /> },
      { path: '/trips/:tripId/edit', element: <TripEditPage /> },
      { path: '/trips/:tripId/schedule', element: <SchedulePage /> },
      { path: '/trips/:tripId/map', element: <MapPage /> },
      { path: '/trips/:tripId/diary', element: <DiaryListPage /> },
      { path: '/trips/:tripId/diary/new', element: <DiaryEditPage /> },
      { path: '/trips/:tripId/diary/:entryId', element: <DiaryEntryPage /> },
      { path: '/trips/:tripId/diary/:entryId/edit', element: <DiaryEditPage /> },
      { path: '/trips/:tripId/share', element: <SharePage /> },
    ],
  },
  {
    element: <AppShell showBottomNav={false} />,
    children: [
      { path: '/shared/:shareToken', element: <SharePage readOnly /> },
    ],
  },
])

export default function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <RouterProvider router={router} />
    </>
  )
}
