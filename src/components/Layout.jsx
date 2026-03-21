import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow bg-slate-50 dark:bg-[#0b0b0b]">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}