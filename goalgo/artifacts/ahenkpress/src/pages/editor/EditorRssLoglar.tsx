import { EditorLayout } from "@/components/EditorLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { hmEditorJson } from "@/lib/hmEditorApi";
import { Link } from "wouter";

type RssLogRow = {
  id: number;
  campaignName: string;
  level: string;
  action: string;
  message: string;
  createdAt: string;
};

export default function EditorRssLoglar() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/hm/editor/rss/logs"],
    queryFn: () => hmEditorJson<RssLogRow[]>("/api/hm/editor/rss/logs"),
  });

  return (
    <EditorLayout title="RSS İşlem Logları">
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md">
        <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">
          RSS KAMPANYALARI
        </div>
        <h1 className="text-2xl font-bold">İşlem Logları</h1>
        <p className="text-sm text-zinc-400 mt-1">
          <Link href="/editor/rss-kampanyalari" className="text-red-300 hover:underline">
            Kampanya listesine dön
          </Link>
        </p>
      </div>
      <div className="bg-white p-4 rounded-b-md shadow-sm border-x border-b">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TARİH</TableHead>
              <TableHead>KAMPANYA</TableHead>
              <TableHead>SEVİYE</TableHead>
              <TableHead>İŞLEM</TableHead>
              <TableHead>MESAJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : !logs?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.createdAt), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{log.campaignName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.level === "error" ? "destructive" : log.level === "warning" ? "default" : "secondary"}
                    >
                      {log.level}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="text-sm text-gray-600">{log.message}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </EditorLayout>
  );
}
