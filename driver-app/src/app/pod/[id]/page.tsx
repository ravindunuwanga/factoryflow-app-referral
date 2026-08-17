import PODView from "@/components/views/PODView";

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function Page() {
  return <PODView />;
}
