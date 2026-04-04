import CTASection from "@/components/Landing/CTASection";
import Features from "@/components/Landing/Features";
import Footer from "@/components/Landing/Footer";
import Hero from "@/components/Landing/Hero";
import HowItWorks from "@/components/Landing/HowItWorks";

export default function Home() {
  return (
    <div
      className="h-dvh overflow-y-scroll scrollbar-hide"
      style={{ scrollSnapType: "y mandatory" }}
    >
      <div style={{ scrollSnapAlign: "start", minHeight: "100dvh" }}>
        <Hero />
      </div>
      <div style={{ scrollSnapAlign: "start", minHeight: "100dvh" }}>
        <Features />
      </div>
      <div style={{ scrollSnapAlign: "start", minHeight: "100dvh" }}>
        <HowItWorks />
      </div>
      <div style={{ scrollSnapAlign: "start", minHeight: "100dvh" }}>
        <CTASection />
      </div>
      <div style={{ scrollSnapAlign: "start" }}>
        <Footer />
      </div>
    </div>
  );
}
