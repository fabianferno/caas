import CTASection from "@/components/Landing/CTASection";
import FeaturedWorldtars from "@/components/Landing/FeaturedWorldtars";
import Features from "@/components/Landing/Features";
import Footer from "@/components/Landing/Footer";
import Hero from "@/components/Landing/Hero";
import HowItWorks from "@/components/Landing/HowItWorks";
import Navbar from "@/components/Landing/Navbar";
import SmoothScroll from "@/components/SmoothScroll";

export default function Home() {
  return (
    <SmoothScroll>
      <Navbar />
      <main>
        <Hero />
        <FeaturedWorldtars />
        <HowItWorks />
        <Features />
        <CTASection />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
