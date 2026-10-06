import logoSrc from "../../assets/logo.svg";
import welcomeSrc from "../../assets/bg-img.jpg";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <main class="auth-screen">
      <div class="auth-brand">
        <img class="auth-logo" src={logoSrc} alt="" />
        <p class="auth-company">CDC Palm Oil Sales</p>
      </div>
      <img class="auth-welcome-image" src={welcomeSrc} alt="" />
      <button type="button" class="auth-link" onClick={onContinue}>
        Login
      </button>
    </main>
  );
}
