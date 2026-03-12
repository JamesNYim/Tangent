import { useNavigate } from "react-router-dom";

function LoginButton({ children = "Login" }) {
    const nav = useNavigate();

    return (
        <button onClick={() => nav("/login")}>
            {children}
        </button>
    );
}
export default LoginButton;
