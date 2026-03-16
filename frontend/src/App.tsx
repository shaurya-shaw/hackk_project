import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { router } from "./routes/routes";

const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "18px",
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.2)",
          },
        }}
      />
      <RouterProvider router={router} />
    </>
  );
};

export default App;
