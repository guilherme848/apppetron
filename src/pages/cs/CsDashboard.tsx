import { Navigate } from 'react-router-dom';

// CsDashboard was consolidated into CsCommandCenter (/cs)
// This redirect ensures old links still work
export default function CsDashboard() {
  return <Navigate to="/cs" replace />;
}
