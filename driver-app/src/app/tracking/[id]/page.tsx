import TrackingView from "@/components/views/TrackingView";

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function Page() {
  return <TrackingView />;
}
