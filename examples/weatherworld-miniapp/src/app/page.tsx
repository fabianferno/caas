import { AuthButton } from "../components/AuthButton";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background px-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-accent mb-2">WeatherWorld</h1>
        <p className="text-foreground/50 text-sm">
          Real-time weather, powered by agents
        </p>
      </div>
      <AuthButton />
    </div>
  );
}
