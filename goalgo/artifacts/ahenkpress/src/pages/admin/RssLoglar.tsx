import { AdminLayout } from "@/components/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListRssLogs } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function RssLoglar() {
  const { data: logs, isLoading } = useListRssLogs({});

  return (
    <AdminLayout title="RSS İşlem Logları">
      <div className="bg-white p-4 rounded-md shadow-sm border">
        <h2 className="text-xl font-bold mb-4">Son İşlemler</h2>
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
              <TableRow><TableCell colSpan={5} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
            ) : logs?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>
            ) : (
              logs?.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm")}</TableCell>
                  <TableCell className="font-medium">{log.campaignName}</TableCell>
                  <TableCell>
                    <Badge variant={log.level === 'error' ? 'destructive' : log.level === 'warning' ? 'default' : 'secondary'}>
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
    </AdminLayout>
  );
}