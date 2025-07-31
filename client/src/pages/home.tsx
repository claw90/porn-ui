import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Chris' Secret Stash</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Library</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Browse your video collection</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Manage performer profiles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Discover new content</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
