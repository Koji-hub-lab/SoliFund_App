import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Inscription from './pages/Inscription';
import ListeCagnottes from './pages/ListeCagnottes';
import DetailCagnotte from './pages/DetailCagnotte';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ListeCagnottes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/cagnottes/:id" element={<DetailCagnotte />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}