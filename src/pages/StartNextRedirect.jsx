import { useEffect } from "react";

export default function StartNextRedirect() {
  useEffect(() => {
    window.location.href =
      "https://www.startnext.com/reforestal";
  }, []);

  return (
    <div className="h-screen flex items-center justify-center">
      <p>Weiterleitung...</p>
    </div>
  );
}