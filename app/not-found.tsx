import { ErrorView } from "@/components/ui/error-view";

export default function NotFound() {
  return (
    <ErrorView
      title="Page Not Found"
      message="Whoops! This page seems to have wandered off."
      actionLabel="Back to Home"
      actionHref="/"
    />
  );
}
