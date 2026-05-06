import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { IndexRedirect } from '@/components/IndexRedirect'
import { Auth } from '@/pages/Auth'
import { JobsPreview } from '@/pages/JobsPreview'
import { GettingStarted } from '@/pages/GettingStarted'
import { Today } from '@/pages/Today'
import { Jobs } from '@/pages/Jobs'
import { Network } from '@/pages/Network'
import { Interviews } from '@/pages/Interviews'
import { Targets } from '@/pages/Targets'
import { Boards } from '@/pages/Boards'
import { Search } from '@/pages/Search'
import { Resumes } from '@/pages/Resumes'
import { Letters } from '@/pages/Letters'
import { Insights } from '@/pages/Insights'
import { Profile } from '@/pages/Profile'
import { Settings } from '@/pages/Settings'
import { Help } from '@/pages/Help'
import { NotFound } from '@/pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {import.meta.env.DEV && (
        <Route path="/preview/jobs" element={<JobsPreview />} />
      )}
      <Route element={<AppLayout />}>
        <Route index element={<IndexRedirect />} />
        <Route path="/getting-started" element={<GettingStarted />} />
        <Route path="/today" element={<Today />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/network" element={<Network />} />
        <Route path="/interviews" element={<Interviews />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/boards" element={<Boards />} />
        <Route path="/search" element={<Search />} />
        <Route path="/resumes" element={<Resumes />} />
        <Route path="/letters" element={<Letters />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
