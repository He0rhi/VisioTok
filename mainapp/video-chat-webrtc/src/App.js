import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainPage from './pages/Main/MainPage';
import RoomPage from './pages/Room/RoomPage';
import Login from './pages/Login/Login';
import NotFound404 from './pages/NotFound404';
import ProtectedRoute from './pages/ProtectedRoute/ProtectedRoute';
import Register from './pages/Register/Register';
import './css/App.css';
import Profile from './pages/Profile/Profile';
import UsersPage from './pages/UsersPage/UserPage';
import AdminStats from './pages/AdminStats/AdminStats';
function App() {
  const isAuthenticated = localStorage.getItem('token'); 

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/stats" element={<AdminStats />} />
        <Route 
          path="/profile" 
          element={
          
              <Profile />
          
          }
        />
        <Route 
          path="/room/:id" 
          element={
       
              <RoomPage />
            
          } 
        />
        <Route path="*" element={<NotFound404 />} />
      </Routes>
    </Router>
  );
}

export default App;
