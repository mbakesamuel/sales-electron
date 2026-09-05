import logoSrc from "../../assets/logo.svg";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
  onContinue: () => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <main class="welcome-screen">
      <div class="welcome-screen-overlay" aria-hidden="true" />
      <div class="welcome-content">
        <img class="welcome-logo" src={logoSrc} alt="" aria-hidden="true" />
        <h1 class="welcome-title">Welcome to CDC Palm Oil Sales</h1>
        <p class="welcome-subtitle">Sign in to continue</p>
        <button type="button" class="welcome-button" onClick={onContinue}>
          Sign in
        </button>
      </div>
    </main>
  );
}
