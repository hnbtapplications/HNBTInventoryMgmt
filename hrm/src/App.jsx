import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Layout/Sidebar'
import Topbar from './components/Layout/Topbar'
import { useAuth } from './context/AuthContext'

// Pages
import Login           from './pages/Login'
import Dashboard       from './pages/Dashboard'
import EmployeeList    from './pages/Employees/EmployeeList'
import EmployeeProfile from './pages/Employees/EmployeeProfile'
import Departments     from './pages/Departments'
import AttendanceSheet from './pages/Attendance/AttendanceSheet'
import AttendanceReport from './pages/Attendance/AttendanceReport'
import OvertimeReport   from './pages/Attendance/OvertimeReport'
import InOutReport      from './pages/Attendance/InOutReport'
import SaturdayRoster   from './pages/Attendance/SaturdayRoster'
import LeaveRequests   from './pages/Leave/LeaveRequests'
import LeaveCalendar   from './pages/Leave/LeaveCalendar'
import Reports         from './pages/Reports'
import Holidays        from './pages/Settings/Holidays'
import PayrollList     from './pages/Payroll/PayrollList'
import SalarySlip      from './pages/Payroll/SalarySlip'
import MyProfile       from './pages/MyProfile'
import MyAttendance    from './pages/MyAttendance'
import ApplyLeave      from './pages/MyLeave/ApplyLeave'
import LeaveHistory    from './pages/MyLeave/LeaveHistory'
import EmployeeDocuments from './pages/Documents/EmployeeDocuments'
import MyDocuments     from './pages/Documents/MyDocuments'

const PAGE_TITLES = {
  '/dashboard':                  { title: 'Dashboard',          subtitle: 'Overview & key metrics' },
  '/employees':                  { title: 'Employees',           subtitle: 'Manage your workforce' },
  '/departments':                { title: 'Departments',         subtitle: 'Departments & designations' },
  '/attendance/sheet':           { title: 'Attendance',          subtitle: 'Mark daily attendance' },
  '/attendance/report':          { title: 'Attendance Report',   subtitle: 'Monthly attendance summary' },
  '/attendance/in-out':          { title: 'Time In/Out Report',  subtitle: 'Daily punch logs' },
  '/attendance/overtime':        { title: 'Overtime Management', subtitle: 'Technical employee overtime logs & approval' },
  '/attendance/saturday-roster': { title: 'Saturday Roster',     subtitle: 'Rotational Saturday off management' },
  '/leave/requests':             { title: 'Leave Requests',      subtitle: 'Approve or reject leave applications' },
  '/leave/calendar':             { title: 'Leave Calendar',      subtitle: 'Who is on leave, when' },
  '/documents':                  { title: 'Employee Documents',  subtitle: 'Manage employee document records' },
  '/reports':                    { title: 'HR Reports',          subtitle: 'Insights & analytics' },
  '/settings/holidays':          { title: 'Yearly Holidays',     subtitle: 'Manage upcoming branch holidays' },
  '/payroll/list':               { title: 'Payroll & Salaries',  subtitle: 'Monthly payroll processing' },
  '/payroll/slip':               { title: 'Salary Slip',         subtitle: 'Printable payslip view' },
  '/my/profile':                 { title: 'My Profile',          subtitle: 'Your personal information' },
  '/my/attendance':              { title: 'My Attendance',       subtitle: 'Your attendance history' },
  '/my/leave/apply':             { title: 'Apply for Leave',     subtitle: 'Submit a leave request' },
  '/my/leave/history':           { title: 'My Leave History',    subtitle: 'Your leave records & balance' },
  '/my/documents':               { title: 'My Documents',        subtitle: 'Your personal documents on file' },
}

function AppLayout({ children, path }) {
  const info = PAGE_TITLES[path] || {}
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={info.title} subtitle={info.subtitle} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function PageRoute({ path, component: Component, adminOnly = false }) {
  return (
    <Route
      path={path}
      element={
        <ProtectedRoute adminOnly={adminOnly}>
          <AppLayout path={path}>
            <Component />
          </AppLayout>
        </ProtectedRoute>
      }
    />
  )
}

export default function App() {
  const { isAdmin, isLoggedIn, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Admin / HR routes */}
      <Route path="/dashboard"                  element={<ProtectedRoute adminOnly><AppLayout path="/dashboard"><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/employees"                  element={<ProtectedRoute adminOnly><AppLayout path="/employees"><EmployeeList /></AppLayout></ProtectedRoute>} />
      <Route path="/employees/:id"              element={<ProtectedRoute adminOnly><AppLayout path="/employees"><EmployeeProfile /></AppLayout></ProtectedRoute>} />
      <Route path="/departments"                element={<ProtectedRoute adminOnly><AppLayout path="/departments"><Departments /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance/sheet"           element={<ProtectedRoute adminOnly><AppLayout path="/attendance/sheet"><AttendanceSheet /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance/report"          element={<ProtectedRoute adminOnly><AppLayout path="/attendance/report"><AttendanceReport /></AppLayout></ProtectedRoute>} />
        <Route path="/attendance/in-out"          element={<ProtectedRoute adminOnly><AppLayout path="/attendance/in-out"><InOutReport /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance/overtime"        element={<ProtectedRoute adminOnly><AppLayout path="/attendance/overtime"><OvertimeReport /></AppLayout></ProtectedRoute>} />
      <Route path="/attendance/saturday-roster" element={<ProtectedRoute adminOnly><AppLayout path="/attendance/saturday-roster"><SaturdayRoster /></AppLayout></ProtectedRoute>} />
      <Route path="/leave/requests"             element={<ProtectedRoute adminOnly><AppLayout path="/leave/requests"><LeaveRequests /></AppLayout></ProtectedRoute>} />
      <Route path="/leave/calendar"             element={<ProtectedRoute adminOnly><AppLayout path="/leave/calendar"><LeaveCalendar /></AppLayout></ProtectedRoute>} />
      <Route path="/documents"                  element={<ProtectedRoute adminOnly><AppLayout path="/documents"><EmployeeDocuments /></AppLayout></ProtectedRoute>} />
      <Route path="/reports"                    element={<ProtectedRoute adminOnly><AppLayout path="/reports"><Reports /></AppLayout></ProtectedRoute>} />
      <Route path="/settings/holidays"           element={<ProtectedRoute adminOnly><AppLayout path="/settings/holidays"><Holidays /></AppLayout></ProtectedRoute>} />
      <Route path="/payroll/list"                element={<ProtectedRoute adminOnly><AppLayout path="/payroll/list"><PayrollList /></AppLayout></ProtectedRoute>} />
      <Route path="/payroll/slip/:id/:month/:year" element={<ProtectedRoute adminOnly><AppLayout path="/payroll/slip"><SalarySlip /></AppLayout></ProtectedRoute>} />

      {/* Employee self-service */}
      <Route path="/my/profile"       element={<ProtectedRoute><AppLayout path="/my/profile"><MyProfile /></AppLayout></ProtectedRoute>} />
      <Route path="/my/attendance"    element={<ProtectedRoute><AppLayout path="/my/attendance"><MyAttendance /></AppLayout></ProtectedRoute>} />
      <Route path="/my/leave/apply"   element={<ProtectedRoute><AppLayout path="/my/leave/apply"><ApplyLeave /></AppLayout></ProtectedRoute>} />
      <Route path="/my/leave/history" element={<ProtectedRoute><AppLayout path="/my/leave/history"><LeaveHistory /></AppLayout></ProtectedRoute>} />
      <Route path="/my/documents"     element={<ProtectedRoute><AppLayout path="/my/documents"><MyDocuments /></AppLayout></ProtectedRoute>} />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isLoggedIn
            ? <Navigate to={isAdmin ? '/dashboard' : '/my/attendance'} replace />
            : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
