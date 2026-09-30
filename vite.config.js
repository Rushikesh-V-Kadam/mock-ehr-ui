import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Mock EHR app: http://localhost:5173
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true }
});
