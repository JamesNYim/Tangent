import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function LoginButton({ children = "Logout" }) {
    const nav = useNavigate();
    const { logout } = useAuth();
    
    function handleLogout() {
        logout();
        nav("/login");
}
    return (
        <button onClick={handleLogout}>
            {children}
        </button>
    );
}


export default LoginButton;
