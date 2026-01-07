import { useEffect, useState } from "react";

export default function Toast({ message }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;

    setVisible(true);

    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(hideTimer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      className={`fixed top-6 right-6 z-[999] transition-all duration-500 ease-out
        ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}
      `}
    >
      <div className="bg-[#121212] border border-gray-800 rounded-2xl px-5 py-4 shadow-2xl">
        <p className="text-sm font-semibold text-gray-100">{message}</p>
      </div>
    </div>
  );
}
