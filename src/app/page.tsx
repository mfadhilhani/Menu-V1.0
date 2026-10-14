import App from "@/components/App";
import { FoodsProvider } from "@/components/FoodsContext";

export default function Page() {
  return (
    <FoodsProvider>
      <App />
    </FoodsProvider>
  );
}
