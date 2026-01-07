export default function Footer() {
  return (
    <footer className="bg-[#2f2f2f] text-gray-300">
      <div className="max-w-7xl mx-auto px-8 py-14 flex flex-col md:flex-row justify-between gap-16">
        
        {/* LEFT: NJIT logo + divider + title */}
        <div className="flex items-center gap-8">
          <img
            src="/public/njit_logo.png"
            alt="NJIT"
            className="h-20 w-auto filter grayscale invert brightness-105"
            draggable="false"
          />

          <div className="h-16 w-px bg-gray-400/70" />

          <div className="text-white font-semibold text-lg tracking-wide">
            Campus Wellness Services
          </div>
        </div>

        {/* RIGHT: Quick Links */}
        <div className="flex flex-col gap-4">
          <h4 className="text-white font-semibold mb-2">Quick Links</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-3 text-sm">
            
            <a
              href="https://www.njit.edu/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Contact Us
            </a>

            <a
              href="https://www.njit.edu/publicsafety/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Public Safety
            </a>

            <a
              href="https://www.njit.edu/counseling/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Center for Counseling and Psychological Services (C-CAPS)
            </a>

            <a
              href="https://www.njit.edu/healthservices/peer-wellness-coaching"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Student Wellness Program
            </a>

            <a
              href="https://www.njit.edu/accessibility/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Accessibility Resources and Services (OARS)
            </a>

            <a
              href="https://www.njit.edu/counseling/sexual-assault-response"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white underline underline-offset-4 decoration-gray-500/60"
            >
              Sexual Assault Response
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}
