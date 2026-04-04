import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4">
      <h1 className="font-display text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <Link to="/">
        <Button>Back to Home</Button>
      </Link>
    </div>
  );
};

export default NotFound;
